from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, Any
from enum import Enum

class RolEnum(str, Enum):
    CLIENTE = "CLIENTE"
    TAXISTA = "TAXISTA"
    ADMIN = "ADMIN"

# Esquema para datos del vehículo (Taxistas)
class TaxistaRegistroCreate(BaseModel):
    placa: str = Field(..., min_length=6, max_length=10)
    modelo_vehiculo: Optional[str] = Field(None, max_length=50)
    numero_licencia: Optional[str] = Field(None, max_length=50)

# Esquema de Registro
class UsuarioCreate(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=100)
    telefono: str = Field(..., min_length=7, max_length=20)
    email: Optional[EmailStr] = None
    contrasena: str = Field(..., min_length=6)
    rol: RolEnum = RolEnum.CLIENTE
    acepto_politicas: bool
    datos_taxista: Optional[TaxistaRegistroCreate] = None

    @field_validator('datos_taxista')
    def validar_datos_taxista(cls, v, info):
        rol = info.data.get('rol')
        if rol == RolEnum.TAXISTA and not v:
            raise ValueError('Debe ingresar la placa para completar el registro de taxista.')
        return v

# Esquema de Login
class LoginRequest(BaseModel):
    telefono: str = Field(..., description="Número de teléfono registrado")
    contrasena: str = Field(..., description="Contraseña de la cuenta")

# Esquema de Respuesta del usuario dentro del Token
class UsuarioLoginData(BaseModel):
    id: int
    nombre: str
    telefono: str
    email: Optional[str] = None
    rol: str

# Esquema de Respuesta de Token
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioLoginData

    class Config:
        from_attributes = True