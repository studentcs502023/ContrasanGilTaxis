from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

# 1. Enumeración del estado del servicio
class EstadoServicioEnum(str, Enum):
    disponible = "disponible"
    ocupado = "ocupado"
    inactivo = "inactivo"
    
# 2. Esquema para registrar / asociar perfil de taxista a un usuario existente
class TaxistaCreate(BaseModel):
    usuario_id: int = Field(..., description="ID del usuario en la tabla usuarios")
    placa: str = Field(..., min_length=6, max_length=10, description="Placa del vehículo")
    modelo_vehiculo: Optional[str] = Field("No especificado", max_length=50)
    numero_licencia: Optional[str] = Field("Pendiente", max_length=50)
    latitud: Optional[float] = Field(6.5512, ge=-90, le=90)
    longitud: Optional[float] = Field(-73.1321, ge=-180, le=180)

# 3. Esquema para actualizar los datos técnicos del taxista
class TaxistaUpdate(BaseModel):
    placa: Optional[str] = Field(None, min_length=6, max_length=10)
    modelo_vehiculo: Optional[str] = Field(None, max_length=50)
    numero_licencia: Optional[str] = Field(None, max_length=50)

# 4. Esquema para actualizar solo el estado del servicio
class EstadoServicioUpdate(BaseModel):
   estado_servicio: EstadoServicioEnum

# 5. Esquema para actualizar ubicación GPS
class UbicacionUpdate(BaseModel):
    latitud: float = Field(..., ge=-90, le=90)
    longitud: float = Field(..., ge=-180, le=180)

# Alias para compatibilidad
UbicacionTaxistaUpdate = UbicacionUpdate

# 6. Esquema de respuesta completo (Combina datos de 'usuarios' y 'taxistas')
class TaxistaResponse(BaseModel):
    usuario_id: int
    placa: str
    modelo_vehiculo: Optional[str] = None
    numero_licencia: Optional[str] = None
    estado_servicio: EstadoServicioEnum
    latitud: float
    longitud: float
    actualizado_en: Optional[datetime] = None

    # Datos complementarios provenientes del JOIN con la tabla 'usuarios'
    nombre: Optional[str] = Field(None, description="Nombre obtenido de la tabla usuarios")
    telefono: Optional[str] = Field(None, description="Teléfono obtenido de la tabla usuarios")

    class Config:
        from_attributes = True