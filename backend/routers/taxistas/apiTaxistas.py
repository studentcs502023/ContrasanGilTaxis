from typing import List
from fastapi import APIRouter, Depends, Path, Query
from starlette import status
from sqlalchemy.orm import Session

from connections.database import get_db
from routers.auth.serviceAuth import get_current_user
from routers.auth.roleChecker import RoleChecker  # Importación del middleware de roles
from routers.taxistas import serviceTaxistas, models

# Definimos los permisos específicos
permitir_taxista = RoleChecker(["TAXISTA"])
permitir_ambos = RoleChecker(["CLIENTE", "TAXISTA", "ADMIN"])

router = APIRouter(
    prefix="/api/taxistas",
    tags=["Taxistas"],
    dependencies=[Depends(get_current_user)],  # Autenticación JWT previa
)


@router.get(
    "/cercanos",
    response_model=List[models.TaxistaCreate],
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(permitir_ambos)],  # Clientes y taxistas pueden consultar taxis cercanos
    summary="Buscar taxis disponibles en un radio cercano (ej: 500m)",
)
async def get_taxis_cercanos(
    latitud: float = Query(..., description="Latitud actual del cliente"),
    longitud: float = Query(..., description="Longitud actual del cliente"),
    radio_metros: int = Query(500, description="Radio de búsqueda en metros", gt=0),
    db: Session = Depends(get_db),
):
    """
    Retorna la lista de taxistas en estado 'disponible' situados dentro del radio especificado.
    """
    return serviceTaxistas.getTaxisCercanos(db, latitud, longitud, radio_metros)

@router.get(
    "/{usuario_id}",
    response_model=models.TaxistaResponse,  
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(permitir_ambos)],
    summary="Obtener perfil de taxista por ID",
)
async def get_taxista_by_id(
    usuario_id: int = Path(..., description="ID del taxista a consultar", gt=0),
    db: Session = Depends(get_db),
):
    """
    Obtiene la información detallada del vehículo, estado actual y coordenadas del taxista.
    """
    return serviceTaxistas.getTaxistaById(db, usuario_id)
@router.patch(
    "/actualizar/{usuario_id}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(permitir_taxista)],  # Solo un TAXISTA puede editar la información de su vehículo
    summary="Actualizar información del vehículo / licencia",
)
async def patch_taxista(
    usuario_id: int = Path(..., description="ID del taxista a actualizar", gt=0),
    datos: models.TaxistaUpdate = None,
    db: Session = Depends(get_db),
):
    """
    Permite actualizar datos como la placa, el modelo del vehículo o la licencia del conductor.
    """
    return serviceTaxistas.updateTaxista(db, usuario_id, datos)


@router.patch(
    "/{usuario_id}/estado",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(permitir_taxista)],  # Solo el TAXISTA puede cambiar su disponibilidad
    summary="Cambiar estado de disponibilidad (disponible, ocupado, inactivo)",
)
async def patch_estado_servicio(
    usuario_id: int = Path(..., description="ID del taxista", gt=0),
    datos: models.EstadoServicioUpdate = None,
    db: Session = Depends(get_db),
):
    """
    Permite al conductor conectarse, desconectarse o marcarse como ocupado.
    """
    return serviceTaxistas.updateEstadoServicio(db, usuario_id, datos)


@router.patch(
    "/{usuario_id}/ubicacion",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(permitir_taxista)],  # Solo el TAXISTA transmite su posición GPS
    summary="Actualizar posición GPS en tiempo real",
)
async def patch_ubicacion_gps(
    usuario_id: int = Path(..., description="ID del taxista", gt=0),
    ubicacion: models.UbicacionUpdate = None,
    db: Session = Depends(get_db),
):
    """
    Endpoint para actualizar la ubicación enviada por el GPS del dispositivo móvil del conductor.
    """
    return serviceTaxistas.updateUbicacionGPS(db, usuario_id, ubicacion)