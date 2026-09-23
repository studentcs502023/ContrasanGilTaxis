from typing import List
from fastapi import APIRouter, Depends, Path
from starlette import status
from sqlalchemy.orm import Session

# Dependencias globales de base de datos y autenticación
from connections.database import get_db
from routers.auth.serviceAuth import get_current_user
from routers.auth.roleChecker import RoleChecker  # Importación del RoleChecker

# Servicio y modelos específicos de la entidad
from routers.usuarios import serviceUsuarios, models

# Permisos de acceso
permitir_admin = RoleChecker(["ADMIN"])
permitir_autenticado = RoleChecker(["CLIENTE", "TAXISTA", "ADMIN"])

# Router sin restricciones globales para mantener el registro público (/crear)
router = APIRouter(
    prefix="/api/usuarios",
    tags=["Usuarios"],
)


@router.post(
    "/crear",
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un nuevo usuario (Público)",
)
async def post_usuario(
    usuario: models.UsuarioCreate,
    db: Session = Depends(get_db),
):
    """
    Endpoint público de registro. Crea un nuevo registro en la tabla usuarios 
    e inicializa automáticamente su perfil de Pasajero o Taxista.
    """
    return serviceUsuarios.postUsuario(db, usuario)


@router.get(
    "",
    response_model=List[models.Usuario],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user), Depends(permitir_admin)],
    summary="Obtener todos los usuarios activos (Solo Admin)",
)
async def get_usuarios(db: Session = Depends(get_db)):
    """
    Retorna una lista de todos los usuarios cuyo estado de cuenta sea 'ACTIVO'.
    Acceso restringido a Administradores.
    """
    return serviceUsuarios.getUsuarios(db)


@router.get(
    "/{usuario_id}",
    response_model=models.Usuario,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user), Depends(permitir_admin)],
    summary="Obtener un usuario por ID (Solo Admin)",
)
async def get_usuario_by_id(
    usuario_id: int = Path(..., description="ID del usuario a buscar", gt=0),
    db: Session = Depends(get_db),
):
    """
    Busca un usuario activo por su clave primaria. Lanza un 404 si no existe.
    Acceso restringido a Administradores.
    """
    return serviceUsuarios.getUsuarioById(db, usuario_id)


@router.patch(
    "/actualizar/{usuario_id}",
    response_model=models.Usuario,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user), Depends(permitir_autenticado)],
    summary="Actualizar parcialmente un usuario (Clientes, Taxistas y Admin)",
)
async def patch_usuario(
    usuario_data: models.UsuarioUpdate,
    usuario_id: int = Path(..., description="ID del usuario a actualizar", gt=0),
    db: Session = Depends(get_db),
):
    """
    Permite actualizar dinámicamente los campos especificados de un usuario.
    Permite que los usuarios registrados acepten las políticas en un segundo paso mediante PATCH.
    """
    return serviceUsuarios.updateUsuario(db, usuario_id, usuario_data)


@router.delete(
    "/eliminar/{usuario_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(get_current_user), Depends(permitir_admin)],
    summary="Desactivación / Borrado lógico de un usuario (Solo Admin)",
)
async def delete_usuario(
    usuario_id: int = Path(..., description="ID del usuario a desactivar", gt=0),
    db: Session = Depends(get_db),
):
    """
    Realiza una baja lógica cambiando el campo estado_cuenta a 'INACTIVO'.
    La información física permanece en la base de datos para conservar el historial de viajes.
    Acceso restringido a Administradores.
    """
    return serviceUsuarios.deleteUsuarioLogico(db, usuario_id)