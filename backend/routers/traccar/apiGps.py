import os
import requests
from requests.auth import HTTPBasicAuth
from fastapi import APIRouter, HTTPException  # 👈 HTTPException importado correctamente
from routers.traccar.serviceTraccar import obtener_coordenadas_taxista

router = APIRouter(prefix="/api/gps", tags=["GPS & Traccar Local"])

# Configuración de Traccar local
TRACCAR_URL = os.getenv("TRACCAR_URL", "http://localhost:8082").rstrip("/")
TRACCAR_USER = os.getenv("TRACCAR_USER", "admin")
TRACCAR_PASS = os.getenv("TRACCAR_PASS", "admin")
TRACCAR_TOKEN = os.getenv("TRACCAR_TOKEN", None)  # Opcional: pega tu token aquí si gustas


@router.get("/posiciones")
@router.get("/posiciones-locales")
def obtener_posiciones_traccar_local():
    endpoint = f"{TRACCAR_URL}/api/positions"
    headers = {"Accept": "application/json"}
    
    try:
        # 1. Si hay token disponible, usar autenticación Bearer Token
        if TRACCAR_TOKEN:
            headers["Authorization"] = f"Bearer {TRACCAR_TOKEN}"
            response = requests.get(endpoint, headers=headers, timeout=4.0)
        
        # 2. Si no hay token, usar HTTP Basic Auth con credenciales
        else:
            response = requests.get(
                endpoint, 
                headers=headers, 
                auth=HTTPBasicAuth(TRACCAR_USER, TRACCAR_PASS), 
                timeout=4.0
            )

        if response.status_code == 200:
            return response.json()
        else:
            print(f"⚠️ Traccar respondió con estado: {response.status_code}")
            return []

    except requests.exceptions.RequestException as e:
        print(f"⚠️ Error al conectar con el servicio local de Traccar: {e}")
        return []


@router.get("/posicion/{unique_id}")
def obtener_posicion_un_taxi(unique_id: str):
    """
    Retorna la posición GPS actual de un taxi específico desde Traccar.
    """
    posicion = obtener_coordenadas_taxista(unique_id)
    if not posicion:
        raise HTTPException(
            status_code=404, 
            detail=f"No se encontró posición activa para el dispositivo {unique_id}"
        )
    return posicion