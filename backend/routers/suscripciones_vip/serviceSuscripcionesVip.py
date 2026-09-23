from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException, status
from typing import List
from datetime import datetime, timedelta
from routers.suscripciones_vip import models


def registrarSuscripcionVip(
    db: Session, datos: models.SuscripcionVipCreate, admin_id: int
) -> models.SuscripcionVipResponse:
    """
    Registra una suscripción VIP en el historial y actualiza el estado VIP del pasajero.
    """
    # 1. Verificar si el usuario existe y tiene rol PASAJERO (o existe perfil en la tabla pasajeros)
    sql_check = text("SELECT usuario_id FROM pasajeros WHERE usuario_id = :pasajero_id")
    pasajero = db.execute(sql_check, {"pasajero_id": datos.pasajero_id}).mappings().first()

    if not pasajero:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró un perfil de pasajero registrado para el usuario ID {datos.pasajero_id}."
        )

    fecha_inicio = datetime.now()
    fecha_fin = fecha_inicio + timedelta(days=datos.dias_activados)

    # 2. Insertar registro en historial_suscripciones_vip
    sql_insert = text("""
        INSERT INTO historial_suscripciones_vip
        (pasajero_id, monto_pagado, metodo_pago, dias_activados, fecha_inicio, fecha_fin, registrado_por_admin_id)
        VALUES
        (:pasajero_id, :monto, :metodo, :dias, :inicio, :fin, :admin_id)
    """)

    result = db.execute(
        sql_insert,
        {
            "pasajero_id": datos.pasajero_id,
            "monto": datos.monto_pagado,
            "metodo": datos.metodo_pago.value,
            "dias": datos.dias_activados,
            "inicio": fecha_inicio,
            "fin": fecha_fin,
            "admin_id": admin_id,
        },
    )

    suscripcion_id = result.lastrowid

    # 3. Actualizar la tabla pasajeros marcándolo como VIP y actualizando su fecha de vencimiento
    sql_update_pasajero = text("""
        UPDATE pasajeros
        SET es_vip = TRUE, vip_hasta = :fin
        WHERE usuario_id = :pasajero_id
    """)
    db.execute(sql_update_pasajero, {"fin": fecha_fin, "pasajero_id": datos.pasajero_id})

    # Guardar ambas operaciones de forma atómica
    db.commit()

    return getSuscripcionById(db, suscripcion_id)


def getSuscripcionById(db: Session, suscripcion_id: int) -> models.SuscripcionVipResponse:
    """
    Obtiene el detalle de una suscripción VIP por su ID.
    """
    sql = text("""
        SELECT id, pasajero_id, monto_pagado, metodo_pago, dias_activados,
               fecha_inicio, fecha_fin, registrado_por_admin_id, creado_en
        FROM historial_suscripciones_vip
        WHERE id = :id
    """)
    row = db.execute(sql, {"id": suscripcion_id}).mappings().first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No existe un registro de suscripción VIP con ID {suscripcion_id}."
        )

    return models.SuscripcionVipResponse(**row)


def getHistorialByPasajeroId(db: Session, pasajero_id: int) -> List[models.SuscripcionVipResponse]:
    """
    Obtiene todo el historial de suscripciones VIP asociadas a un pasajero.
    """
    sql = text("""
        SELECT id, pasajero_id, monto_pagado, metodo_pago, dias_activados,
               fecha_inicio, fecha_fin, registrado_por_admin_id, creado_en
        FROM historial_suscripciones_vip
        WHERE pasajero_id = :pasajero_id
        ORDER BY creado_en DESC
    """)
    rows = db.execute(sql, {"pasajero_id": pasajero_id}).mappings().all()

    return [models.SuscripcionVipResponse(**row) for row in rows]