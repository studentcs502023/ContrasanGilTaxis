from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException
from starlette import status

from routers.taxistas.models import TaxistaUpdate, EstadoServicioUpdate, UbicacionUpdate


def getTaxistaById(db: Session, usuario_id: int):
    """
    Obtiene el perfil completo del taxista extrayendo coordenadas espacial desde POINT.
    """
    query = text("""
        SELECT 
            u.id AS usuario_id,
            u.nombre,
            u.telefono,
            t.placa,
            t.modelo_vehiculo,
            t.numero_licencia,
            t.estado_servicio,
            ST_Y(t.ultima_ubicacion) AS latitud,
            ST_X(t.ultima_ubicacion) AS longitud,
            t.actualizado_en
        FROM usuarios u
        INNER JOIN taxistas t ON u.id = t.usuario_id
        WHERE u.id = :usuario_id AND u.estado_cuenta = 'ACTIVO'
    """)
    try:
        result = db.execute(query, {"usuario_id": usuario_id}).mappings().first()
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Taxista no encontrado o inactivo"
            )
        return result
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar el perfil del taxista: {str(e)}"
        )


def updateTaxista(db: Session, usuario_id: int, datos: TaxistaUpdate):
    """
    Actualiza la información del vehículo y licencia del taxista.
    """
    getTaxistaById(db, usuario_id)

    update_fields = []
    params = {"usuario_id": usuario_id}

    if datos.placa is not None:
        update_fields.append("placa = :placa")
        params["placa"] = datos.placa.upper()

    if datos.modelo_vehiculo is not None:
        update_fields.append("modelo_vehiculo = :modelo_vehiculo")
        params["modelo_vehiculo"] = datos.modelo_vehiculo

    if datos.numero_licencia is not None:
        update_fields.append("numero_licencia = :numero_licencia")
        params["numero_licencia"] = datos.numero_licencia

    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se enviaron datos para actualizar"
        )

    query_str = f"""
        UPDATE taxistas 
        SET {', '.join(update_fields)}
        WHERE usuario_id = :usuario_id
    """

    try:
        db.execute(text(query_str), params)
        db.commit()
        return {"mensaje": "Información del taxista actualizada con éxito"}
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La placa especificada ya pertenece a otro vehículo registrado"
        )
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar los datos del taxista: {str(e)}"
        )


def updateEstadoServicio(db: Session, usuario_id: int, datos: EstadoServicioUpdate):
    """
    Modifica el estado de servicio del conductor (disponible, ocupado, inactivo).
    """
    getTaxistaById(db, usuario_id)

    estado_normalizado = datos.estado_servicio.lower()
    if estado_normalizado not in ['disponible', 'ocupado', 'inactivo']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El estado debe ser: 'disponible', 'ocupado' o 'inactivo'"
        )

    query = text("""
        UPDATE taxistas 
        SET estado_servicio = :estado
        WHERE usuario_id = :usuario_id
    """)
    try:
        db.execute(query, {"estado": estado_normalizado, "usuario_id": usuario_id})
        db.commit()
        return {"mensaje": f"Estado cambiado a '{estado_normalizado}' exitosamente"}
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al cambiar el estado de servicio: {str(e)}"
        )


def updateUbicacionGPS(db: Session, usuario_id: int, ubicacion: UbicacionUpdate):
    """
    Actualiza la posición GPS en tiempo real del taxista en la columna espacial POINT.
    """
    getTaxistaById(db, usuario_id)

    query = text("""
        UPDATE taxistas 
        SET ultima_ubicacion = ST_GeomFromText(:punto, 4326)
        WHERE usuario_id = :usuario_id
    """)

    punto_wkt = f"POINT({ubicacion.longitud} {ubicacion.latitud})"

    try:
        db.execute(query, {"punto": punto_wkt, "usuario_id": usuario_id})
        db.commit()
        return {"mensaje": "Ubicación GPS actualizada"}
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar la ubicación GPS: {str(e)}"
        )


def getTaxisCercanos(db: Session, latitud: float, longitud: float, radio_metros: int = 500):
    """
    Consulta espacial que busca taxis en estado 'disponible' en un radio configurable (por defecto 500 metros).
    """
    query = text("""
        SELECT 
            t.usuario_id,
            u.nombre,
            u.telefono,
            t.placa,
            ST_Y(t.ultima_ubicacion) AS latitud,
            ST_X(t.ultima_ubicacion) AS longitud,
            ST_Distance_Sphere(t.ultima_ubicacion, ST_GeomFromText(:punto_cliente, 4326)) AS distancia_m
        FROM taxistas t
        INNER JOIN usuarios u ON t.usuario_id = u.id
        WHERE t.estado_servicio = 'disponible'
          AND u.estado_cuenta = 'ACTIVO'
          AND ST_Distance_Sphere(t.ultima_ubicacion, ST_GeomFromText(:punto_cliente, 4326)) <= :radio
        ORDER BY distancia_m ASC
        LIMIT 10
    """)

    punto_cliente_wkt = f"POINT({longitud} {latitud})"

    try:
        result = db.execute(query, {
            "punto_cliente": punto_cliente_wkt,
            "radio": radio_metros
        }).mappings().all()
        return result
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al calcular taxis cercanos: {str(e)}"
        )