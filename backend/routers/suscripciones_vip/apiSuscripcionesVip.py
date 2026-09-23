from typing import List
from fastapi import APIRouter, Depends, Path
from starlette import status
from sqlalchemy.orm import Session

from connections.database import get_db
from routers.auth.serviceAuth import get_current_user
from routers.auth.roleChecker import RoleChecker  # Importación del middleware de roles[cite: 1]
from routers.suscripciones_vip import serviceSuscripcionesVip, models

# Control de roles
permitir_admin = RoleChecker(["ADMIN"])
permitir_ambos = RoleChecker(["CLIENTE", "ADMIN"])

router = APIRouter(
    prefix="/api/suscripciones-vip",
    tags=["Suscripciones VIP"],
    dependencies=[Depends(get_current_user)],  # Exige token JWT
)


@router.post(
    "/activar",
    response_model=models.SuscripcionVipResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(permitir_admin)],
    summary="Activar suscripción VIP a un pasajero (Solo Admin)",
)
async def post_activar_suscripcion_vip(
    datos: models.SuscripcionVipCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Endpoint administrativo para registrar el pago de suscripción VIP y activar la membresía al pasajero.
    """
    return serviceSuscripcionesVip.registrarSuscripcionVip(
        db=db, datos=datos, admin_id=current_user["id"]
    )


@router.get(
    "/pasajero/{pasajero_id}",
    response_model=List[models.SuscripcionVipResponse],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(permitir_ambos)],
    summary="Obtener historial de suscripciones VIP de un pasajero",
)
async def get_historial_pasajero(
    pasajero_id: int = Path(..., description="ID del pasajero a consultar", gt=0),
    db: Session = Depends(get_db),
):
    """
    Permite al pasajero o al administrador consultar el historial completo de renovaciones VIP.
    """
    return serviceSuscripcionesVip.getHistorialByPasajeroId(db=db, pasajero_id=pasajero_id)


@router.get(
    "/{suscripcion_id}",
    response_model=models.SuscripcionVipResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(permitir_admin)],
    summary="Obtener detalle de una suscripción por ID (Solo Admin)",
)
async def get_suscripcion_by_id(
    suscripcion_id: int = Path(..., description="ID del registro de suscripción", gt=0),
    db: Session = Depends(get_db),
):
    """
    Retorna la información técnica/financiera de una activación de suscripción en particular.
    """
    return serviceSuscripcionesVip.getSuscripcionById(db=db, suscripcion_id=suscripcion_id)