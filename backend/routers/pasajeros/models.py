from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Esquema para actualización parcial del pasajero (incluye GPS)
class PasajeroUpdate(BaseModel):
    barrio_frecuente: Optional[str] = Field(None, max_length=100)
    latitud: Optional[float] = Field(None, ge=-90, le=90, description="Latitud GPS actual")
    longitud: Optional[float] = Field(None, ge=-180, le=180, description="Longitud GPS actual")

# Esquema de respuesta pública del perfil de pasajero (incluye posición GPS)
class PasajeroPerfil(BaseModel):
    usuario_id: int
    nombre: str
    telefono: str
    email: Optional[str] = None
    es_vip: bool
    vip_hasta: Optional[datetime] = None
    barrio_frecuente: Optional[str] = None
    latitud: Optional[float] = Field(None, description="Latitud extraída de ultima_ubicacion")
    longitud: Optional[float] = Field(None, description="Longitud extraída de ultima_ubicacion")

    class Config:
        from_attributes = True

# Esquema para crear una dirección favorita
class DireccionFavoritaCreate(BaseModel):
    etiqueta: str = Field(..., max_length=50, description="Ej: Casa, Trabajo, CC El Puente")
    barrio: Optional[str] = Field(None, max_length=100)
    direccion_texto: str = Field(..., max_length=150)
    latitud: float = Field(..., ge=-90, le=90, description="Latitud de la ubicación")
    longitud: float = Field(..., ge=-180, le=180, description="Longitud de la ubicación")

# Esquema de respuesta para dirección favorita
class DireccionFavorita(DireccionFavoritaCreate):
    id: int
    usuario_id: int
    creado_en: datetime

    class Config:
        from_attributes = True