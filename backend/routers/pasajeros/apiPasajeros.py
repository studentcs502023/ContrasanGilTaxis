from typing import List
from fastapi import APIRouter, Depends, Path
from starlette import status
from sqlalchemy.orm import Session
from connections.database import get_db
from routers.auth.serviceAuth import get_current_user
from routers.auth.roleChecker import RoleChecker  # Importamos el validador de roles
from routers.pasajeros import servicePasajeros, models

# Definimos las instancias de control de acceso por rol
permitir_cliente = RoleChecker(["CLIENTE"])
permitir_ambos = RoleChecker(["CLIENTE", "TAXISTA", "ADMIN"])

router = APIRouter(
    prefix="/api/pasajeros",
    tags=["Pasajeros"],
    dependencies=[Depends(get_current_user)],  # Verificación previa de token JWT
)


@router.get(
    "/{usuario_id}",
    response_model=models.PasajeroPerfil,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(permitir_ambos)], # Tanto el cliente como el taxista pueden ver este perfil
    summary="Obtener perfil del pasajero por ID",
)
async def get_pasajero_by_id(
    usuario_id: int = Path(..., description="ID del usuario a consultar", gt=0),
    db: Session = Depends(get_db),
):
    """
    Retorna la información detallada del perfil del pasajero, incluyendo su estado VIP.
    """
    return servicePasajeros.getPasajeroById(db, usuario_id)


@router.patch(
    "/actualizar/{usuario_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(permitir_cliente)], # Solo un CLIENTE puede actualizar su perfil de pasajero
    summary="Actualizar perfil del pasajero",
)
async def patch_pasajero(
    usuario_id: int = Path(..., description="ID del pasajero a actualizar", gt=0),
    datos: models.PasajeroUpdate = None,
    db: Session = Depends(get_db),
):
    """
    Permite modificar los datos del pasajero (como su barrio frecuente).
    """
    return servicePasajeros.updatePasajero(db, usuario_id, datos)


@router.post(
    "/{usuario_id}/favoritas",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(permitir_cliente)], # Solo el CLIENTE administra sus direcciones guardadas
    summary="Agregar dirección favorita",
)
async def post_direccion_favorita(
    usuario_id: int = Path(..., description="ID del pasajero", gt=0),
    favorita: models.DireccionFavoritaCreate = None,
    db: Session = Depends(get_db),
):
    """
    Guarda una nueva ubicación habitual para que el pasajero la use rápidamente.
    """
    return servicePasajeros.postDireccionFavorita(db, usuario_id, favorita)


@router.get(
    "/{usuario_id}/favoritas",
    response_model=List[models.DireccionFavorita],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(permitir_cliente)], # Solo el CLIENTE consulta sus direcciones favoritas
    summary="Listar direcciones favoritas del pasajero",
)
async def get_direcciones_favoritas(
    usuario_id: int = Path(..., description="ID del pasajero", gt=0),
    db: Session = Depends(get_db),
):
    """
    Obtiene la lista de lugares guardados previamente por el usuario.
    """
    return servicePasajeros.getDireccionesFavoritas(db, usuario_id)