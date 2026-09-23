from typing import List, Optional
from fastapi import APIRouter, Depends, Path, Query
from starlette import status
from sqlalchemy.orm import Session
from sqlalchemy import text

from connections.database import get_db
from routers.auth import serviceAuth
from routers.auth.roleChecker import RoleChecker
from routers.viajes import serviceViajes, models

# Definición de permisos de rol
permitir_cliente = RoleChecker(["CLIENTE", "PASAJERO", "ADMIN"])
permitir_taxista = RoleChecker(["TAXISTA", "CONDUCTOR", "ADMIN"])
permitir_ambos = RoleChecker(["CLIENTE", "PASAJERO", "TAXISTA", "CONDUCTOR", "ADMIN"])

router = APIRouter(
    prefix="/api/viajes",
    tags=["Solicitudes de Viaje"],
)


@router.post(
    "/solicitar",
    response_model=models.ViajeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear solicitud de carrera (Solo Cliente)",
)
def post_solicitar_viaje(
    datos: models.ViajeCreate,
    current_user: dict = Depends(permitir_cliente),
    db: Session = Depends(get_db),
):
    """
    Permite al pasajero en sesión solicitar un servicio registrando sus coordenadas GPS.
    """
    return serviceViajes.crearSolicitud(
        db=db, 
        pasajero_id=current_user["id"], 
        datos=datos
    )


@router.get(
    "/pendientes", 
    response_model=List[models.ViajeResponse],
    status_code=status.HTTP_200_OK,
    summary="Listar carreras pendientes cercanas (Solo Taxista)"
)
def listar_carreras_pendientes(
    latitud: float = Query(..., description="Latitud GPS actual del taxista"),
    longitud: float = Query(..., description="Longitud GPS actual del taxista"),
    radio_metros: int = Query(5000, description="Radio de búsqueda en metros", gt=0),
    current_user: dict = Depends(permitir_taxista),
    db: Session = Depends(get_db),
):
    """
    Lista carreras en estado 'SOLICITADO' dentro del radio de alcance del taxista.
    """
    return serviceViajes.getSolicitudesPendientesCercanas(
        db=db,
        taxista_usuario_id=current_user["id"],
        latitud=latitud,
        longitud=longitud,
        radio_metros=radio_metros
    )


@router.get(
    "/radar",
    status_code=status.HTTP_200_OK,
    summary="Obtener solicitudes en un rango de 500 metros (Radar)",
)
def get_solicitudes_radar(
    lat: float = Query(..., description="Latitud actual del taxista"),
    lon: float = Query(..., description="Longitud actual del taxista"),
    radio: float = Query(500.0, description="Radio de cobertura en metros"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(permitir_taxista),
):
    """
    Devuelve la lista de solicitudes PENDIENTE a menos del radio especificado (default 500m)
    usando el Stored Procedure de MariaDB.
    """
    return serviceViajes.obtener_solicitudes_en_radar(
        db=db, 
        latitud_taxista=lat, 
        longitud_taxista=lon, 
        radio_metros=radio
    )


@router.get(
    "/mi-viaje-activo", 
    response_model=Optional[models.ViajeResponse],
    status_code=status.HTTP_200_OK,
    summary="Obtener el viaje activo del pasajero en sesión"
)
def obtener_viaje_activo_usuario(
    current_user: dict = Depends(permitir_cliente),
    db: Session = Depends(get_db)
):
    """
    Retorna el viaje activo del pasajero (SOLICITADO, ACEPTADO, EN_CAMINO, EN_CURSO).
    Si no tiene ninguno activo, retorna null.
    """
    sql = text("""
        SELECT id FROM solicitudes_viaje 
        WHERE pasajero_id = :pasajero_id 
          AND estado IN ('SOLICITADO', 'ACEPTADO', 'EN_CAMINO', 'EN_CURSO')
        ORDER BY id DESC LIMIT 1
    """)
    viaje = db.execute(sql, {"pasajero_id": current_user["id"]}).first()
    
    if not viaje:
        return None
        
    return serviceViajes.getViajeById(db, viaje.id)


@router.patch(
    "/{viaje_id}/aceptar",
    response_model=models.ViajeResponse,
    status_code=status.HTTP_200_OK,
    summary="Aceptar un viaje disponible (Solo Taxista)",
)
def patch_aceptar_viaje(
    viaje_id: int = Path(..., description="ID del viaje a aceptar", gt=0),
    current_user: dict = Depends(permitir_taxista),
    db: Session = Depends(get_db),
):
    """
    Asigna la carrera al taxista que presiona el botón de aceptar.
    """
    return serviceViajes.aceptarViaje(
        db=db, 
        viaje_id=viaje_id, 
        usuario_taxista_id=current_user["id"]
    )


@router.patch(
    "/{viaje_id}/estado",
    response_model=models.ViajeResponse,
    status_code=status.HTTP_200_OK,
    summary="Actualizar estado del viaje",
)
def patch_cambiar_estado(
    datos: models.ViajeEstadoUpdate,
    viaje_id: int = Path(..., description="ID del viaje", gt=0),
    current_user: dict = Depends(permitir_ambos),
    db: Session = Depends(get_db),
):
    """
    Permite cambiar el estado de la carrera (EN_CAMINO, EN_CURSO, FINALIZADO, CANCELADO).
    """
    return serviceViajes.cambiarEstadoViaje(db=db, viaje_id=viaje_id, nuevo_estado=datos.estado)


@router.get(
    "/{viaje_id}",
    response_model=models.ViajeResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener detalles de un viaje por ID",
)
def get_viaje_by_id(
    viaje_id: int = Path(..., description="ID del viaje", gt=0),
    current_user: dict = Depends(permitir_ambos),
    db: Session = Depends(get_db),
):
    """
    Retorna los datos detallados de una carrera específica.
    """
    return serviceViajes.getViajeById(db=db, viaje_id=viaje_id)