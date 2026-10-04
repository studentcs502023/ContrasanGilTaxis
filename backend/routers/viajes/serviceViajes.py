from typing import List, Optional
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from routers.viajes import models
# Importamos la función que se conecta a Traccar
from routers.traccar.serviceTraccar import obtener_coordenadas_taxista


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
            v.destino_texto, v.estado, v.precio_estimado, v.metodo_pago, v.radio_busqueda,
            v.creado_en, v.finalizado_en,
            u.nombre AS taxista_nombre,
            u.telefono AS taxista_telefono,
            t.placa AS taxista_placa,
            t.traccar_device_id
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

    if not datos.precio_estimado or datos.precio_estimado == 0:
        es_periferia = "periferia" in (datos.barrio_origen or "").lower()
        precio_final = calcular_precio_oficial_sp(db, es_periferia=es_periferia)
    else:
        precio_final = datos.precio_estimado

    # CORRECCIÓN 1: Se agregó :radio_busqueda en los VALUES
    sql = text("""
        INSERT INTO solicitudes_viaje 
        (pasajero_id, barrio_origen, direccion_origen, origen_ubicacion, destino_texto, precio_estimado, metodo_pago, radio_busqueda)
        VALUES 
        (:pasajero_id, :barrio, :direccion, ST_GeomFromText(:punto), :destino, :precio, :pago, :radio_busqueda)
    """)
    
    punto_wkt = f"POINT({datos.longitud_origen} {datos.latitud_origen})"
    metodo_pago_val = datos.metodo_pago.value if hasattr(datos.metodo_pago, 'value') else datos.metodo_pago
    
    try:
        # CORRECCIÓN 2: Se agregó la variable radio_busqueda al diccionario de ejecución
        result = db.execute(sql, {
            "pasajero_id": pasajero_id,
            "barrio": datos.barrio_origen,
            "direccion": datos.direccion_origen,
            "punto": punto_wkt,
            "destino": datos.destino_texto,
            "precio": precio_final,
            "pago": metodo_pago_val,
            "radio_busqueda": getattr(datos, 'radio_busqueda', 500)
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
    Consulta carreras pendientes cercanas a una posición dada (Radio en metros)
    o solicitudes globales (zonas rurales).
    """
    if not latitud or not longitud or abs(latitud) > 90 or abs(longitud) > 180:
        return []

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

    # CORRECCIÓN 3: Se incluyó el condicional (OR radio_busqueda >= 50000)
    sql = text("""
        SELECT 
            id, 
            pasajero_id, 
            taxista_id, 
            barrio_origen, 
            direccion_origen,
            ST_Y(origen_ubicacion) AS latitud_origen,
            ST_X(origen_ubicacion) AS longitud_origen,
            destino_texto, 
            estado, 
            precio_estimado, 
            metodo_pago,
            radio_busqueda,
            creado_en, 
            finalizado_en
        FROM solicitudes_viaje
        WHERE estado = 'SOLICITADO'
          AND (
              ST_Distance_Sphere(origen_ubicacion, ST_GeomFromText(:punto_ref, 4326)) <= :radio
              OR radio_busqueda >= 50000
          )
        ORDER BY creado_en DESC
    """)
    
    try:
        rows = db.execute(sql, {"punto_ref": punto_ref, "radio": radio_metros}).mappings().all()
        return [models.ViajeResponse(**row) for row in rows]
    except SQLAlchemyError as e:
        print(f"Error en consulta espacial de radar: {e}")
        return []


def obtener_solicitudes_en_radar(
    db: Session, 
    taxista_usuario_id: int,
    identificador_traccar: str, 
    radio_metros: float = 500.0
) -> List[models.ViajeResponse]:
    """
    Consulta la posición real del taxista directamente desde Traccar 
    y busca solicitudes pendientes en el radio especificado.
    """
    # 1. Obtener la ubicación en tiempo real desde Traccar utilizando el identificador/placa del taxi
    posicion_gps = obtener_coordenadas_taxista(identificador_traccar)
    
    if not posicion_gps:
        # Si Traccar no responde o no tiene señal, puedes optar por retornar vacío 
        # o hacer un fallback a la tabla de base de datos.
        print(f"⚠️ No se encontró señal de Traccar para el dispositivo: {identificador_traccar}")
        return []

    latitud_taxista = posicion_gps["latitud"]
    longitud_taxista = posicion_gps["longitud"]

    # 2. Reutilizar la lógica existente pasando las coordenadas reales obtenidas de Traccar
    return getSolicitudesPendientesCercanas(
        db=db,
        taxista_usuario_id=taxista_usuario_id,
        latitud=latitud_taxista,
        longitud=longitud_taxista,
        radio_metros=int(radio_metros)
    )