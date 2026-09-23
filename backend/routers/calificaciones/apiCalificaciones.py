from typing import List
from fastapi import APIRouter, Depends, Path
from starlette import status
from sqlalchemy.orm import Session

from connections.database import get_db
from routers.auth.serviceAuth import get_current_user
from routers.auth.roleChecker import RoleChecker  # Control de roles[cite: 1]
from routers.calificaciones import serviceCalificaciones, models

permitir_cliente = RoleChecker(["CLIENTE"])
permitir_ambos = RoleChecker(["CLIENTE", "TAXISTA", "ADMIN"])

router = APIRouter(
    prefix="/api/calificaciones",
    tags=["Calificaciones"],
    dependencies=[Depends(get_current_user)],  # Exige token JWT
)


@router.post(
    "/crear",
    response_model=models.CalificacionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(permitir_cliente)],
    summary="Registrar calificación de un viaje (Solo Pasajero)",
)
async def post_calificacion(
    datos: models.CalificacionCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permite al pasajero calificar la atención y el servicio de una carrera completada.
    """
    return serviceCalificaciones.crearCalificacion(
        db=db, usuario_id=current_user["id"], datos=datos
    )


@router.get(
    "/viaje/{viaje_id}",
    response_model=models.CalificacionResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(permitir_ambos)],
    summary="Obtener la calificación de un viaje específico",
)
async def get_calificacion_viaje(
    viaje_id: int = Path(..., description="ID del viaje", gt=0),
    db: Session = Depends(get_db),
):
    """
    Consulta la retroalimentación u opinión registrada para un servicio realizado.
    """
    return serviceCalificaciones.getCalificacionByViajeId(db=db, viaje_id=viaje_id)


@router.get(
    "/taxista/{taxista_id}/promedio",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(permitir_ambos)],
    summary="Obtener el promedio de estrellas de un taxista",
)
async def get_promedio_taxista(
    taxista_id: int = Path(..., description="ID del usuario taxista", gt=0),
    db: Session = Depends(get_db),
):
    """
    Retorna la puntuación media (estrellas) de un conductor en la plataforma.
    """
    return serviceCalificaciones.getPromedioCalificacionTaxista(db=db, taxista_id=taxista_id)

@router.get(
    "/taxista/{taxista_id}",
    response_model=List[models.CalificacionResponse],
    status_code=status.HTTP_200_OK,
    summary="Obtener la lista de calificaciones y comentarios de un taxista",
)
def get_calificaciones_taxista(
    taxista_id: int,
    db: Session = Depends(get_db),
):
    return serviceCalificaciones.getCalificacionesByTaxistaId(db=db, taxista_id=taxista_id)