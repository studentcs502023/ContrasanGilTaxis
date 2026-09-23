from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


# Enumeración del estado del servicio del taxista
class EstadoServicio(str, Enum):
    DISPONIBLE = "disponible"
    OCUPADO = "ocupado"
    INACTIVO = "inactivo"


# Esquema para registrar un nuevo taxi / conductor
class TaxistaCreate(BaseModel):
    placa: str = Field(..., min_length=6, max_length=10, description="Placa del vehículo")
    conductor_nombre: str = Field(..., max_length=100, description="Nombre del conductor")
    telefono: str = Field(..., max_length=20, description="Teléfono de contacto")
    latitud: Optional[float] = Field(6.5512, ge=-90, le=90)
    longitud: Optional[float] = Field(-73.1321, ge=-180, le=180)


# Esquema para actualizar la información básica del taxista
class TaxistaUpdate(BaseModel):
    conductor_nombre: Optional[str] = Field(None, max_length=100)
    telefono: Optional[str] = Field(None, max_length=20)


# Esquema para actualizar solo el estado del servicio (disponible, ocupado, inactivo)
class EstadoServicioUpdate(BaseModel):
    estado: EstadoServicio


# Esquema para actualizar la ubicación GPS en tiempo real
class UbicacionUpdate(BaseModel):
    latitud: float = Field(..., ge=-90, le=90)
    longitud: float = Field(..., ge=-180, le=180)


# Alias por si tu servicio también busca UbicacionTaxistaUpdate
UbicacionTaxistaUpdate = UbicacionUpdate


# Esquema de respuesta completo
class TaxistaResponse(BaseModel):
    id: int
    placa: str
    conductor_nombre: str
    telefono: str
    estado: EstadoServicio
    latitud: float
    longitud: float
    actualizado_en: datetime

    class Config:
        from_attributes = True