from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# Esquema base con atributos comunes
class UsuarioBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100, description="Nombre completo del usuario")
    telefono: str = Field(..., min_length=7, max_length=20, description="Número de teléfono único")
    email: Optional[EmailStr] = Field(None, description="Correo electrónico opcional")
    rol: str = Field("CLIENTE", description="Rol asignado: CLIENTE, TAXISTA o ADMIN")


# Esquema para creación de usuario
class UsuarioCreate(UsuarioBase):
    contrasena: str = Field(..., min_length=4, description="Contraseña en texto plano a ser encriptada")
    acepto_politicas: Optional[bool] = Field(
        False, 
        description="Aceptación de políticas. Puede ser False en el registro inicial."
    )


# Esquema para actualización dinámica (PATCH)
class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=100)
    telefono: Optional[str] = Field(None, min_length=7, max_length=20)
    email: Optional[EmailStr] = None
    rol: Optional[str] = None
    estado_cuenta: Optional[str] = Field(None, description="ACTIVO, INACTIVO o BLOQUEADO")
    acepto_politicas: Optional[bool] = Field(None, description="Permite actualizar el consentimiento de políticas")


# Esquema de respuesta pública
class Usuario(UsuarioBase):
    id: int
    estado_cuenta: str
    acepto_politicas: bool
    fecha_aceptacion_politicas: Optional[datetime] = None
    creado_en: datetime
    actualizado_en: datetime

    class Config:
        from_attributes = True