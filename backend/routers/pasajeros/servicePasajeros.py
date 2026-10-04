from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException
from starlette import status

from routers.pasajeros.models import PasajeroUpdate, DireccionFavoritaCreate


def getPasajeroById(db: Session, usuario_id: int):
    """
    Obtiene el perfil detallado del pasajero uniendo las tablas usuarios y pasajeros,
    incluyendo la extracción de las coordenadas latitud y longitud.
    """
    query = text("""
        SELECT 
            u.id AS usuario_id,
            u.nombre,
            u.telefono,
            u.email,
            p.es_vip,
            p.vip_hasta,
            p.barrio_frecuente,
            ST_Y(p.ultima_ubicacion) AS latitud,
            ST_X(p.ultima_ubicacion) AS longitud
        FROM usuarios u
        INNER JOIN pasajeros p ON u.id = p.usuario_id
        WHERE u.id = :usuario_id AND u.estado_cuenta = 'ACTIVO'
    """)
    try:
        result = db.execute(query, {"usuario_id": usuario_id}).mappings().first()
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pasajero no encontrado o inactivo"
            )
        return result
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar el perfil del pasajero: {str(e)}"
        )

def updatePasajero(db: Session, usuario_id: int, datos: PasajeroUpdate):
    """
    Actualiza la información del perfil del pasajero, incluyendo el barrio frecuente
    y/o la posición GPS actual (ultima_ubicacion).
    """
    # 1. Verificación de existencia previa
    getPasajeroById(db, usuario_id)

    # 2. Validar envío de coordenadas incompletas
    if (datos.latitud is not None and datos.longitud is None) or (datos.latitud is None and datos.longitud is not None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Para actualizar la posición GPS debes enviar tanto latitud como longitud."
        )

    # 3. Validar que al menos un campo completo haya sido enviado
    if datos.barrio_frecuente is None and datos.latitud is None and datos.longitud is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se enviaron datos válidos para actualizar"
        )

    # 4. Construcción dinámica del query SQL
    sets = []
    params = {"usuario_id": usuario_id}

    if datos.barrio_frecuente is not None:
        sets.append("barrio_frecuente = :barrio")
        params["barrio"] = datos.barrio_frecuente

    if datos.latitud is not None and datos.longitud is not None:
        sets.append("ultima_ubicacion = ST_GeomFromText(:punto_gps, 4326)")
        params["punto_gps"] = f"POINT({datos.longitud} {datos.latitud})"

    query_str = f"UPDATE pasajeros SET {', '.join(sets)} WHERE usuario_id = :usuario_id"
    query = text(query_str)

    try:
        db.execute(query, params)
        db.commit()
        return {"mensaje": "Perfil de pasajero actualizado con éxito"}
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar el pasajero: {str(e)}"
        )

def postDireccionFavorita(db: Session, usuario_id: int, favorita: DireccionFavoritaCreate):
    """
    Guarda una dirección favorita para el pasajero asignando el punto espacial.
    """
    # Verificar que el usuario exista
    getPasajeroById(db, usuario_id)

    query = text("""
        INSERT INTO direcciones_favoritas (usuario_id, etiqueta, barrio, direccion_texto, ubicacion)
        VALUES (:usuario_id, :etiqueta, :barrio, :direccion_texto, ST_GeomFromText(:punto, 4326))
    """)

    punto_wkt = f"POINT({favorita.longitud} {favorita.latitud})"

    params = {
        "usuario_id": usuario_id,
        "etiqueta": favorita.etiqueta,
        "barrio": favorita.barrio,
        "direccion_texto": favorita.direccion_texto,
        "punto": punto_wkt
    }

    try:
        result = db.execute(query, params)
        new_id = result.lastrowid
        db.commit()
        return {
            "id": new_id,
            "usuario_id": usuario_id,
            "etiqueta": favorita.etiqueta,
            "mensaje": "Dirección favorita guardada con éxito"
        }
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar la dirección favorita: {str(e)}"
        )


def getDireccionesFavoritas(db: Session, usuario_id: int):
    """
    Obtiene todas las direcciones favoritas guardadas por el pasajero.
    """
    query = text("""
        SELECT 
            id,
            usuario_id,
            etiqueta,
            barrio,
            direccion_texto,
            ST_Y(ubicacion) AS latitud,
            ST_X(ubicacion) AS longitud,
            creado_en
        FROM direcciones_favoritas
        WHERE usuario_id = :usuario_id
        ORDER BY creado_en DESC
    """)
    try:
        result = db.execute(query, {"usuario_id": usuario_id}).mappings().all()
        return result
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar direcciones favoritas: {str(e)}"
        )