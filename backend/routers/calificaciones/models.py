from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# Esquema para registrar una calificación de viaje
class CalificacionCreate(BaseModel):
    viaje_id: int = Field(..., gt=0, description="ID del viaje a calificar")
    puntuacion: int = Field(..., ge=1, le=5, description="Puntuación del servicio (1 a 5)")
    comentario: Optional[str] = Field(None, max_length=255, description="Comentario opcional sobre el servicio")


# Esquema de respuesta
class CalificacionResponse(BaseModel):
    id: int
    viaje_id: int
    puntuacion: int
    comentario: Optional[str]
    creado_en: datetime

    class Config:
        from_attributes = True