from typing import List
from fastapi import APIRouter, Depends, Path
from starlette import status
from sqlalchemy.orm import Session

from connections.database import get_db
from routers.auth.serviceAuth import get_current_user
from routers.auth.roleChecker import RoleChecker  # Control de roles[cite: 1]
from routers.direcciones_favoritas import serviceDireccionesFavoritas, models

permitir_ambos = RoleChecker(["CLIENTE", "TAXISTA", "ADMIN"])

router = APIRouter(
    prefix="/api/direcciones-favoritas",
    tags=["Direcciones Favoritas"],
    dependencies=[Depends(get_current_user)],  # Requiere token JWT válido
)


@router.post(
    "/crear",
    response_model=models.DireccionFavoritaResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(permitir_ambos)],
    summary="Guardar nueva dirección favorita",
)
async def post_direccion_favorita(
    datos: models.DireccionFavoritaCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permite a un usuario guardar un lugar recurrente especificando su nombre y coordenadas.
    """
    return serviceDireccionesFavoritas.crearDireccionFavorita(
        db=db, usuario_id=current_user["id"], datos=datos
    )


@router.get(
    "/mis-direcciones",
    response_model=List[models.DireccionFavoritaResponse],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(permitir_ambos)],
    summary="Obtener todas las direcciones favoritas del usuario en sesión",
)
async def get_mis_direcciones_favoritas(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retorna el listado de lugares guardados por el usuario autenticado.
    """
    return serviceDireccionesFavoritas.getDireccionesByUsuarioId(
        db=db, usuario_id=current_user["id"]
    )


@router.patch(
    "/actualizar/{direccion_id}",
    response_model=models.DireccionFavoritaResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(permitir_ambos)],
    summary="Actualizar parcialmente una dirección favorita",
)
async def patch_direccion_favorita(
    datos: models.DireccionFavoritaUpdate,
    direccion_id: int = Path(..., description="ID de la dirección a actualizar", gt=0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permite al propietario de la dirección actualizar la etiqueta, texto o coordenadas.
    """
    return serviceDireccionesFavoritas.updateDireccionFavorita(
        db=db, direccion_id=direccion_id, usuario_id=current_user["id"], datos=datos
    )


@router.delete(
    "/eliminar/{direccion_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(permitir_ambos)],
    summary="Eliminar una dirección favorita",
)
async def delete_direccion_favorita(
    direccion_id: int = Path(..., description="ID de la dirección a eliminar", gt=0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Elimina permanentemente una dirección favorita del perfil del usuario.
    """
    return serviceDireccionesFavoritas.deleteDireccionFavorita(
        db=db, direccion_id=direccion_id, usuario_id=current_user["id"]
    )