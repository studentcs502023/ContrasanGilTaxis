# routers/auth/apiAuth.py

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from starlette import status
from sqlalchemy.orm import Session

from connections.database import get_db
from routers.auth import serviceAuth, models

router = APIRouter(
    prefix="/api/auth",
    tags=["Autenticación"],
)


@router.post(
    "/login",
    response_model=models.TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Iniciar sesión y obtener Token JWT",
)
def login(
    credenciales: models.LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Endpoint público para autenticar usuarios mediante su teléfono y contraseña.
    """
    return serviceAuth.autenticar_usuario(db, credenciales)


@router.post(
    "/crear",
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un nuevo usuario en la plataforma",
)
def crear_usuario(
    datos: models.UsuarioCreate,
    db: Session = Depends(get_db),
):
    """
    Endpoint para crear un nuevo usuario (Cliente o Taxista) con hash Bcrypt.
    """
    return serviceAuth.registrar_nuevo_usuario(db, datos)


@router.get(
    "/me",
    status_code=status.HTTP_200_OK,
    summary="Obtener perfil del usuario actualmente autenticado",
)
def me(
    current_user: dict = Depends(serviceAuth.get_current_user),  # 👈 Inyección limpia de dependencia
):
    """
    Retorna la información del usuario en sesión decodificando el token JWT.
    """
    return current_user


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Cerrar sesión de usuario",
)
def logout():
    """
    Cierra la sesión del usuario.
    """
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"mensaje": "Sesión cerrada correctamente"}
    )