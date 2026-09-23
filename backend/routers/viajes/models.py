from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class EstadoViaje(str, Enum):
    SOLICITADO = "SOLICITADO"
    ACEPTADO = "ACEPTADO"
    EN_CAMINO = "EN_CAMINO"
    EN_CURSO = "EN_CURSO"
    FINALIZADO = "FINALIZADO"
    CANCELADO = "CANCELADO"


class MetodoPago(str, Enum):
    EFECTIVO = "EFECTIVO"


# Esquema para crear una nueva solicitud de viaje (Cliente)
class ViajeCreate(BaseModel):
    barrio_origen: Optional[str] = Field("Centro", max_length=100)
    direccion_origen: str = Field(..., max_length=150)
    latitud_origen: float = Field(..., ge=-90, le=90)
    longitud_origen: float = Field(..., ge=-180, le=180)
    destino_texto: Optional[str] = Field(None, max_length=150)
    precio_estimado: Optional[float] = Field(6000.0, ge=0)
    metodo_pago: MetodoPago = MetodoPago.EFECTIVO


# Esquema para actualizar el estado del viaje (Taxista / Cliente)
class ViajeEstadoUpdate(BaseModel):
    estado: EstadoViaje


# Esquema de respuesta con todos los detalles del viaje
class ViajeResponse(BaseModel):
    id: int
    pasajero_id: int
    taxista_id: Optional[int] = None
    barrio_origen: Optional[str] = None
    direccion_origen: str
    latitud_origen: float
    longitud_origen: float
    destino_texto: Optional[str] = None
    estado: EstadoViaje
    precio_estimado: Optional[float] = None
    metodo_pago: MetodoPago
    creado_en: Optional[datetime] = None  # 🟢 CORREGIDO: Permite datetime u opcional
    finalizado_en: Optional[datetime] = None
    
    # Datos adicionales para el cliente
    taxista_nombre: Optional[str] = None
    taxista_telefono: Optional[str] = None
    taxista_placa: Optional[str] = None

    class Config:
        from_attributes = True