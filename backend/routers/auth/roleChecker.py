from typing import List
from fastapi import Depends, HTTPException
from starlette import status

# Importamos la función que obtiene y valida el token JWT
from routers.auth.serviceAuth import get_current_user


class RoleChecker:
    def __init__(self, roles_permitidos: List[str]):
        """
        Recibe la lista de roles autorizados para acceder a un endpoint.
        Ejemplo: RoleChecker(["TAXISTA", "ADMIN"])
        """
        self.roles_permitidos = roles_permitidos

    def __call__(self, current_user: dict = Depends(get_current_user)):
        """
        Se ejecuta automáticamente en cada petición HTTP protegida.
        """
        # Extraemos el rol desde los datos del token JWT
        rol_usuario = current_user.get("rol")

        if rol_usuario not in self.roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado: Se requiere rol {self.roles_permitidos} y tu rol es '{rol_usuario}'"
            )
        
        return current_user