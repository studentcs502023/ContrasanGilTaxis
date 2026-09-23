from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException, status
from typing import List
from routers.direcciones_favoritas import models


def crearDireccionFavorita(
    db: Session, usuario_id: int, datos: models.DireccionFavoritaCreate
) -> models.DireccionFavoritaResponse:
    """
    Inserta una nueva dirección favorita en la base de datos guardando la coordenada espacial POINT(longitud latitud).
    """
    sql = text("""
        INSERT INTO direcciones_favoritas
        (usuario_id, etiqueta, barrio, direccion_texto, ubicacion)
        VALUES
        (:usuario_id, :etiqueta, :barrio, :direccion, ST_GeomFromText(:punto, 4326))
    """)

    punto_wkt = f"POINT({datos.longitud} {datos.latitud})"

    result = db.execute(
        sql,
        {
            "usuario_id": usuario_id,
            "etiqueta": datos.etiqueta,
            "barrio": datos.barrio,
            "direccion": datos.direccion_texto,
            "punto": punto_wkt,
        },
    )
    db.commit()

    return getDireccionFavoritaById(db, result.lastrowid)


def getDireccionFavoritaById(db: Session, direccion_id: int) -> models.DireccionFavoritaResponse:
    """
    Obtiene los detalles de una dirección favorita convirtiendo el campo espacial 'ubicacion' a Latitud y Longitud.
    """
    sql = text("""
        SELECT 
            id, usuario_id, etiqueta, barrio, direccion_texto,
            ST_Y(ubicacion) AS latitud,
            ST_X(ubicacion) AS longitud,
            creado_en
        FROM direcciones_favoritas
        WHERE id = :id
    """)

    row = db.execute(sql, {"id": direccion_id}).mappings().first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La dirección favorita con ID {direccion_id} no existe.",
        )

    return models.DireccionFavoritaResponse(**row)


def getDireccionesByUsuarioId(db: Session, usuario_id: int) -> List[models.DireccionFavoritaResponse]:
    """
    Retorna la lista de direcciones favoritas asociadas a un usuario específico.
    """
    sql = text("""
        SELECT 
            id, usuario_id, etiqueta, barrio, direccion_texto,
            ST_Y(ubicacion) AS latitud,
            ST_X(ubicacion) AS longitud,
            creado_en
        FROM direcciones_favoritas
        WHERE usuario_id = :usuario_id
        ORDER BY creado_en DESC
    """)

    rows = db.execute(sql, {"usuario_id": usuario_id}).mappings().all()

    return [models.DireccionFavoritaResponse(**row) for row in rows]


def updateDireccionFavorita(
    db: Session, direccion_id: int, usuario_id: int, datos: models.DireccionFavoritaUpdate
) -> models.DireccionFavoritaResponse:
    """
    Actualiza dinámicamente los campos especificados de una dirección favorita.
    """
    # Verificar existencia y propiedad
    direccion_actual = getDireccionFavoritaById(db, direccion_id)
    if direccion_actual.usuario_id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para modificar esta dirección favorita.",
        )

    campos = []
    valores = {"id": direccion_id}

    if datos.etiqueta is not None:
        campos.append("etiqueta = :etiqueta")
        valores["etiqueta"] = datos.etiqueta

    if datos.barrio is not None:
        campos.append("barrio = :barrio")
        valores["barrio"] = datos.barrio

    if datos.direccion_texto is not None:
        campos.append("direccion_texto = :direccion")
        valores["direccion"] = datos.direccion_texto

    # Si se actualizan latitud o longitud, reconstruimos la ubicación espacial POINT
    nueva_lat = datos.latitud if datos.latitud is not None else direccion_actual.latitud
    nueva_lng = datos.longitud if datos.longitud is not None else direccion_actual.longitud

    if datos.latitud is not None or datos.longitud is not None:
        campos.append("ubicacion = ST_GeomFromText(:punto, 4326)")
        valores["punto"] = f"POINT({nueva_lng} {nueva_lat})"

    if not campos:
        return direccion_actual

    sql = text(f"UPDATE direcciones_favoritas SET {', '.join(campos)} WHERE id = :id")
    db.execute(sql, valores)
    db.commit()

    return getDireccionFavoritaById(db, direccion_id)


def deleteDireccionFavorita(db: Session, direccion_id: int, usuario_id: int):
    """
    Elimina físicamente una dirección favorita.
    """
    direccion_actual = getDireccionFavoritaById(db, direccion_id)
    if direccion_actual.usuario_id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para eliminar esta dirección favorita.",
        )

    sql = text("DELETE FROM direcciones_favoritas WHERE id = :id")
    db.execute(sql, {"id": direccion_id})
    db.commit()

    return {"mensaje": "Dirección favorita eliminada correctamente."}