from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# Esquema para crear una nueva dirección favorita
class DireccionFavoritaCreate(BaseModel):
    etiqueta: str = Field(..., max_length=50, description="Nombre de la ubicación (ej: Casa, Trabajo)")
    barrio: Optional[str] = Field(None, max_length=100)
    direccion_texto: str = Field(..., max_length=150, description="Dirección textual o punto de referencia")
    latitud: float = Field(..., ge=-90, le=90)
    longitud: float = Field(..., ge=-180, le=180)


# Esquema para actualizar parcialmente una dirección favorita
class DireccionFavoritaUpdate(BaseModel):
    etiqueta: Optional[str] = Field(None, max_length=50)
    barrio: Optional[str] = Field(None, max_length=100)
    direccion_texto: Optional[str] = Field(None, max_length=150)
    latitud: Optional[float] = Field(None, ge=-90, le=90)
    longitud: Optional[float] = Field(None, ge=-180, le=180)


# Esquema de respuesta
class DireccionFavoritaResponse(BaseModel):
    id: int
    usuario_id: int
    etiqueta: str
    barrio: Optional[str]
    direccion_texto: str
    latitud: float
    longitud: float
    creado_en: datetime

    class Config:
        from_attributes = True