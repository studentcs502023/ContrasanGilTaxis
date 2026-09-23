from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from typing import List
from routers.calificaciones import models


def crearCalificacion(
    db: Session, usuario_id: int, datos: models.CalificacionCreate
) -> models.CalificacionResponse:
    """
    Registra la calificación de un viaje validando que el viaje exista,
    esté finalizado y pertenezca al pasajero que realiza la petición.
    """
    # 1. Verificar existencia del viaje y su estado
    sql_check = text("""
        SELECT id, pasajero_id, estado 
        FROM solicitudes_viaje 
        WHERE id = :viaje_id
    """)
    viaje = db.execute(sql_check, {"viaje_id": datos.viaje_id}).mappings().first()

    if not viaje:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El viaje con ID {datos.viaje_id} no existe."
        )

    # Solo el pasajero del viaje puede calificar
    if viaje["pasajero_id"] != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para calificar este viaje."
        )

    # El viaje debe estar en estado FINALIZADO
    if viaje["estado"] != "FINALIZADO":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden calificar viajes en estado 'FINALIZADO'."
        )

    # 2. Insertar la calificación
    sql_insert = text("""
        INSERT INTO calificaciones (viaje_id, puntuacion, comentario)
        VALUES (:viaje_id, :puntuacion, :comentario)
    """)

    try:
        result = db.execute(
            sql_insert,
            {
                "viaje_id": datos.viaje_id,
                "puntuacion": datos.puntuacion,
                "comentario": datos.comentario,
            },
        )
        db.commit()
        calificacion_id = result.lastrowid
        return getCalificacionById(db, calificacion_id)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este viaje ya ha sido calificado previamente."
        )


def getCalificacionById(db: Session, calificacion_id: int) -> models.CalificacionResponse:
    """
    Obtiene los detalles de una calificación por su ID.
    """
    sql = text("""
        SELECT id, viaje_id, puntuacion, comentario, creado_en
        FROM calificaciones
        WHERE id = :id
    """)
    row = db.execute(sql, {"id": calificacion_id}).mappings().first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"La calificación con ID {calificacion_id} no existe."
        )

    return models.CalificacionResponse(**row)


def getCalificacionByViajeId(db: Session, viaje_id: int) -> models.CalificacionResponse:
    """
    Obtiene la calificación asignada a un viaje específico.
    """
    sql = text("""
        SELECT id, viaje_id, puntuacion, comentario, creado_en
        FROM calificaciones
        WHERE viaje_id = :viaje_id
    """)
    row = db.execute(sql, {"viaje_id": viaje_id}).mappings().first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El viaje con ID {viaje_id} aún no tiene una calificación registrada."
        )

    return models.CalificacionResponse(**row)


def getPromedioCalificacionTaxista(db: Session, taxista_id: int) -> dict:
    """
    Calcula la puntuación promedio de un taxista basándose en todos sus viajes calificados.
    """
    sql = text("""
        SELECT 
            COUNT(c.id) AS total_calificaciones,
            COALESCE(AVG(c.puntuacion), 0.0) AS promedio_puntuacion
        FROM calificaciones c
        JOIN solicitudes_viaje v ON c.viaje_id = v.id
        WHERE v.taxista_id = :taxista_id
    """)
    row = db.execute(sql, {"taxista_id": taxista_id}).mappings().first()

    return {
        "taxista_id": taxista_id,
        "total_calificaciones": row["total_calificaciones"],
        "promedio_puntuacion": round(float(row["promedio_puntuacion"]), 2),
    }

def getCalificacionesByTaxistaId(db: Session, taxista_id: int) -> List[models.CalificacionResponse]:
    """
    Obtiene el listado completo de calificaciones y comentarios recibidos por un taxista.
    """
    sql = text("""
        SELECT 
            c.id, 
            c.viaje_id, 
            c.puntuacion, 
            c.comentario, 
            c.creado_en
        FROM calificaciones c
        JOIN solicitudes_viaje v ON c.viaje_id = v.id
        WHERE v.taxista_id = :taxista_id
        ORDER BY c.creado_en DESC
    """)
    rows = db.execute(sql, {"taxista_id": taxista_id}).mappings().all()
    return [models.CalificacionResponse(**row) for row in rows]