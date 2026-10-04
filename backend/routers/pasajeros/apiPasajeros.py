from typing import List
from fastapi import APIRouter, Depends, Path, HTTPException
from starlette import status
from sqlalchemy.orm import Session
from connections.database import get_db
from routers.auth.serviceAuth import get_current_user
from routers.auth.roleChecker import RoleChecker
from routers.pasajeros import servicePasajeros, models

permitir_cliente = RoleChecker(["CLIENTE"])
permitir_ambos = RoleChecker(["CLIENTE", "TAXISTA", "ADMIN"])

router = APIRouter(
    prefix="/api/pasajeros",
    tags=["Pasajeros"],
    dependencies=[Depends(get_current_user)],
)


@router.get(
    "/{usuario_id}",
    response_model=models.PasajeroPerfil,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(permitir_ambos)],
    summary="Obtener perfil del pasajero por ID",
)
async def get_pasajero_by_id(
    usuario_id: int = Path(..., description="ID del usuario a consultar", gt=0),
    db: Session = Depends(get_db),
):
    """
    Retorna la información detallada del perfil del pasajero, incluyendo su estado VIP y ubicación GPS.
    """
    return servicePasajeros.getPasajeroById(db, usuario_id)


@router.patch(
    "/actualizar/{usuario_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(permitir_cliente)],
    summary="Actualizar perfil del pasajero",
)
async def patch_pasajero(
    datos: models.PasajeroUpdate,  # 🟢 CORREGIDO: Ya no es None por defecto
    usuario_id: int = Path(..., description="ID del pasajero a actualizar", gt=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user), # 🟢 Verificación de seguridad
):
    """
    Permite modificar los datos del pasajero (como su barrio frecuente o ubicación GPS).
    """
    if current_user["id"] != usuario_id and current_user.get("rol") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para actualizar este perfil."
        )

    return servicePasajeros.updatePasajero(db, usuario_id, datos)


@router.post(
    "/{usuario_id}/favoritas",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(permitir_cliente)],
    summary="Agregar dirección favorita",
)
async def post_direccion_favorita(
    favorita: models.DireccionFavoritaCreate, # 🟢 CORREGIDO: Objeto requerido
    usuario_id: int = Path(..., description="ID del pasajero", gt=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Guarda una nueva ubicación habitual para que el pasajero la use rápidamente.
    """
    if current_user["id"] != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes agregar direcciones favoritas a otro usuario."
        )

    return servicePasajeros.postDireccionFavorita(db, usuario_id, favorita)


@router.get(
    "/{usuario_id}/favoritas",
    response_model=List[models.DireccionFavorita],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(permitir_cliente)],
    summary="Listar direcciones favoritas del pasajero",
)
async def get_direcciones_favoritas(
    usuario_id: int = Path(..., description="ID del pasajero", gt=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Obtiene la lista de lugares guardados previamente por el usuario.
    """
    if current_user["id"] != usuario_id and current_user.get("rol") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para ver estas direcciones favoritas."
        )

    return servicePasajeros.getDireccionesFavoritas(db, usuario_id)