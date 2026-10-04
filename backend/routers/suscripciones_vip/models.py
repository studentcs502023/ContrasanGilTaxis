from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class MetodoPagoVip(str, Enum):
    EFECTIVO = "EFECTIVO"
    NEQUI = "NEQUI"
    DAVIPLATA = "DAVIPLATA"
    WOMPI = "WOMPI"


# --- ESQUEMAS DE PASAJERO ---

class PasajeroBase(BaseModel):
    barrio_frecuente: Optional[str] = Field(None, max_length=100)
    # Coordenadas que actuarán como GPS simulado
    latitud: Optional[float] = Field(6.5550, ge=-90, le=90, description="Latitud GPS actual")
    longitud: Optional[float] = Field(-73.1360, ge=-180, le=180, description="Longitud GPS actual")


class PasajeroCreate(PasajeroBase):
    usuario_id: int = Field(..., gt=0)


class PasajeroUbicacionUpdate(BaseModel):
    latitud: float = Field(..., ge=-90, le=90)
    longitud: float = Field(..., ge=-180, le=180)


class PasajeroResponse(PasajeroBase):
    usuario_id: int
    es_vip: bool = False
    vip_hasta: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- ESQUEMAS DE SUSCRIPCIÓN VIP ---

class SuscripcionVipCreate(BaseModel):
    pasajero_id: int = Field(..., gt=0, description="ID del usuario pasajero")
    monto_pagado: float = Field(..., gt=0, description="Monto abonado por la suscripción")
    metodo_pago: MetodoPagoVip = MetodoPagoVip.EFECTIVO
    dias_activados: int = Field(30, gt=0, description="Cantidad de días de membresía a activar")


class SuscripcionVipResponse(BaseModel):
    id: int
    pasajero_id: int
    monto_pagado: float
    metodo_pago: MetodoPagoVip
    dias_activados: int
    fecha_inicio: datetime
    fecha_fin: datetime
    registrado_por_admin_id: Optional[int] = None
    creado_en: datetime

    class Config:
        from_attributes = True