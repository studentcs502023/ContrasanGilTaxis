from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException
from starlette import status

from routers.pasajeros.models import PasajeroUpdate, DireccionFavoritaCreate


def getPasajeroById(db: Session, usuario_id: int):
    """
    Obtiene el perfil detallado del pasajero uniendo las tablas usuarios y pasajeros.
    """
    query = text("""
        SELECT 
            u.id AS usuario_id,
            u.nombre,
            u.telefono,
            u.email,
            p.es_vip,
            p.vip_hasta,
            p.barrio_frecuente
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
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar el perfil del pasajero: {str(e)}"
        )


def updatePasajero(db: Session, usuario_id: int, datos: PasajeroUpdate):
    """
    Actualiza información opcional del perfil del pasajero.
    """
    # Verificación de existencia previa
    getPasajeroById(db, usuario_id)

    if datos.barrio_frecuente is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se enviaron datos para actualizar"
        )

    query = text("""
        UPDATE pasajeros 
        SET barrio_frecuente = :barrio
        WHERE usuario_id = :usuario_id
    """)
    try:
        db.execute(query, {"barrio": datos.barrio_frecuente, "usuario_id": usuario_id})
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