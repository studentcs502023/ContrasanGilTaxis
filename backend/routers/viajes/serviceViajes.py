from typing import List, Optional
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from routers.viajes import models


def calcular_precio_oficial_sp(
    db: Session, 
    es_periferia: bool = False, 
    es_festivo: bool = False
) -> float:
    """
    Ejecuta la función almacenada 'sp_calcular_precio_viaje' en MariaDB
    para obtener el precio dinámico regulado para San Gil.
    """
    try:
        sql_sp = text("SELECT sp_calcular_precio_viaje(:periferia, :festivo) AS precio")
        result = db.execute(sql_sp, {
            "periferia": 1 if es_periferia else 0,
            "festivo": 1 if es_festivo else 0
        }).mappings().first()

        if result and result["precio"] is not None:
            return float(result["precio"])
    except Exception as e:
        print(f"Advertencia al ejecutar sp_calcular_precio_viaje: {e}")

    # Fallback predeterminado a la tarifa diurna urbana de San Gil
    return 6900.0


def getViajeById(db: Session, viaje_id: int) -> models.ViajeResponse:
    """
    Obtiene los detalles del viaje haciendo JOIN directo mediante usuario_id.
    """
    sql = text("""
        SELECT 
            v.id, v.pasajero_id, v.taxista_id, v.barrio_origen, v.direccion_origen,
            ST_Y(v.origen_ubicacion) AS latitud_origen,
            ST_X(v.origen_ubicacion) AS longitud_origen,
            v.destino_texto, v.estado, v.precio_estimado, v.metodo_pago,
            v.creado_en, v.finalizado_en,
            u.nombre AS taxista_nombre,
            u.telefono AS taxista_telefono,
            t.placa AS taxista_placa
        FROM solicitudes_viaje v
        LEFT JOIN taxistas t ON v.taxista_id = t.usuario_id
        LEFT JOIN usuarios u ON t.usuario_id = u.id
        WHERE v.id = :id
    """)
    row = db.execute(sql, {"id": viaje_id}).mappings().first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La solicitud de viaje no existe."
        )

    return models.ViajeResponse(**row)


def crearSolicitud(db: Session, pasajero_id: int, datos: models.ViajeCreate):
    """
    Crea una solicitud de viaje asegurando que el pasajero no tenga carreras 
    activas simultáneas y calculando la tarifa oficial por Stored Procedure.
    """
    # 1. Verificar si el pasajero ya tiene un viaje activo pendiente o en curso
    sql_activo = text("""
        SELECT id FROM solicitudes_viaje 
        WHERE pasajero_id = :pasajero_id 
          AND estado IN ('SOLICITADO', 'ACEPTADO', 'EN_CAMINO', 'EN_CURSO')
        LIMIT 1
    """)
    viaje_activo = db.execute(sql_activo, {"pasajero_id": pasajero_id}).first()

    if viaje_activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya tienes un viaje en curso o pendiente. Finalízalo antes de solicitar otro."
        )

    # 2. Calcular precio oficial desde el SP si no viene definido
    if not datos.precio_estimado or datos.precio_estimado == 0:
        es_periferia = "periferia" in (datos.barrio_origen or "").lower()
        precio_final = calcular_precio_oficial_sp(db, es_periferia=es_periferia)
    else:
        precio_final = datos.precio_estimado

    # 3. Insertar el servicio en MariaDB
    sql = text("""
        INSERT INTO solicitudes_viaje 
        (pasajero_id, barrio_origen, direccion_origen, origen_ubicacion, destino_texto, precio_estimado, metodo_pago)
        VALUES 
        (:pasajero_id, :barrio, :direccion, ST_GeomFromText(:punto), :destino, :precio, :pago)
    """)
    
    punto_wkt = f"POINT({datos.longitud_origen} {datos.latitud_origen})"
    metodo_pago_val = datos.metodo_pago.value if hasattr(datos.metodo_pago, 'value') else datos.metodo_pago
    
    try:
        result = db.execute(sql, {
            "pasajero_id": pasajero_id,
            "barrio": datos.barrio_origen,
            "direccion": datos.direccion_origen,
            "punto": punto_wkt,
            "destino": datos.destino_texto,
            "precio": precio_final,
            "pago": metodo_pago_val
        })
        db.commit()
        
        viaje_id = result.lastrowid
        return getViajeById(db, viaje_id)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar la carrera en la base de datos: {str(e)}"
        )


def aceptarViaje(db: Session, viaje_id: int, usuario_taxista_id: int) -> models.ViajeResponse:
    """
    Asigna la carrera al taxista de forma atómica usando directamente su usuario_id.
    """
    sql_update = text("""
        UPDATE solicitudes_viaje 
        SET taxista_id = :taxista_id, estado = 'ACEPTADO' 
        WHERE id = :id AND estado = 'SOLICITADO'
    """)
    
    result = db.execute(sql_update, {"taxista_id": usuario_taxista_id, "id": viaje_id})
    db.commit()

    if result.rowcount == 0:
        sql_check = text("SELECT id FROM solicitudes_viaje WHERE id = :id")
        viaje_existe = db.execute(sql_check, {"id": viaje_id}).first()
        
        if not viaje_existe:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="La solicitud de viaje especificada no existe."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, 
                detail="Esta carrera ya fue tomada por otro conductor o fue cancelada."
            )

    return getViajeById(db, viaje_id)


def cambiarEstadoViaje(db: Session, viaje_id: int, nuevo_estado: models.EstadoViaje) -> models.ViajeResponse:
    """
    Actualiza el estado del viaje (EN_CAMINO, EN_CURSO, FINALIZADO, CANCELADO).
    """
    val_estado = nuevo_estado.value if hasattr(nuevo_estado, 'value') else nuevo_estado
    es_finalizado = (val_estado == "FINALIZADO")

    if es_finalizado:
        sql = text("""
            UPDATE solicitudes_viaje 
            SET estado = :estado, finalizado_en = CURRENT_TIMESTAMP 
            WHERE id = :id
        """)
    else:
        sql = text("""
            UPDATE solicitudes_viaje 
            SET estado = :estado 
            WHERE id = :id
        """)
    
    result = db.execute(sql, {"estado": val_estado, "id": viaje_id})
    
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Viaje no encontrado para actualizar."
        )
        
    db.commit()
    return getViajeById(db, viaje_id)


def getSolicitudesPendientesCercanas(
    db: Session, 
    taxista_usuario_id: int, 
    latitud: float, 
    longitud: float, 
    radio_metros: int = 5000
) -> List[models.ViajeResponse]:
    """
    Consulta carreras pendientes cercanas a la posición del conductor.
    """
    if not latitud or not longitud or abs(latitud) > 90 or abs(longitud) > 180:
        return []

    # Verificar si el conductor tiene alguna carrera activa en curso
    sql_activo = text("""
        SELECT id FROM solicitudes_viaje 
        WHERE taxista_id = :taxista_id 
          AND estado IN ('ACEPTADO', 'EN_CAMINO', 'EN_CURSO')
        LIMIT 1
    """)
    activo = db.execute(sql_activo, {"taxista_id": taxista_usuario_id}).first()

    if activo:
        return []

    punto_ref = f"POINT({longitud} {latitud})"

    sql = text("""
        SELECT 
            id, pasajero_id, taxista_id, barrio_origen, direccion_origen,
            ST_Y(origen_ubicacion) AS latitud_origen,
            ST_X(origen_ubicacion) AS longitud_origen,
            destino_texto, estado, precio_estimado, metodo_pago,
            creado_en, finalizado_en
        FROM solicitudes_viaje
        WHERE estado = 'SOLICITADO'
          AND ST_Distance_Sphere(origen_ubicacion, ST_GeomFromText(:punto_ref)) <= :radio
        ORDER BY creado_en DESC
    """)
    
    try:
        rows = db.execute(sql, {"punto_ref": punto_ref, "radio": radio_metros}).mappings().all()
        return [models.ViajeResponse(**row) for row in rows]
    except Exception:
        sql_fallback = text("""
            SELECT 
                id, pasajero_id, taxista_id, barrio_origen, direccion_origen,
                ST_Y(origen_ubicacion) AS latitud_origen,
                ST_X(origen_ubicacion) AS longitud_origen,
                destino_texto, estado, precio_estimado, metodo_pago,
                creado_en, finalizado_en
            FROM solicitudes_viaje
            WHERE estado = 'SOLICITADO'
            ORDER BY creado_en DESC
        """)
        rows = db.execute(sql_fallback).mappings().all()
        return [models.ViajeResponse(**row) for row in rows]


def obtener_solicitudes_en_radar(db: Session, latitud_taxista: float, longitud_taxista: float, radio_metros: float = 500.0):
    """
    Llama al Stored Procedure sp_obtener_solicitudes_cercanas para filtrar 
    las solicitudes activas a menos de X metros del taxista.
    """
    sql = text("CALL sp_obtener_solicitudes_cercanas(:lat, :lon, :radio)")
    
    result = db.execute(sql, {
        "lat": latitud_taxista,
        "lon": longitud_taxista,
        "radio": radio_metros
    }).mappings().all()

    return result