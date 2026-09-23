from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class MetodoPagoVip(str, Enum):
    EFECTIVO = "EFECTIVO"
    NEQUI = "NEQUI"
    DAVIPLATA = "DAVIPLATA"
    WOMPI = "WOMPI"


# Esquema para registrar/activar una nueva suscripción VIP
class SuscripcionVipCreate(BaseModel):
    pasajero_id: int = Field(..., gt=0, description="ID del usuario pasajero")
    monto_pagado: float = Field(..., gt=0, description="Monto abonado por la suscripción")
    metodo_pago: MetodoPagoVip = MetodoPagoVip.EFECTIVO
    dias_activados: int = Field(30, gt=0, description="Cantidad de días de membresía a activar")


# Esquema de respuesta para la suscripción registrada
class SuscripcionVipResponse(BaseModel):
    id: int
    pasajero_id: int
    monto_pagado: float
    metodo_pago: MetodoPagoVip
    dias_activados: int
    fecha_inicio: datetime
    fecha_fin: datetime
    registrado_por_admin_id: Optional[int]
    creado_en: datetime

    class Config:
        from_attributes = True