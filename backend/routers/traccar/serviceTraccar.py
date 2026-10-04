import os
import requests
from requests.auth import HTTPBasicAuth
from typing import List, Dict, Any, Optional

# Configuración del servidor Traccar Local
TRACCAR_URL = os.getenv("TRACCAR_URL", "http://localhost:8082").rstrip("/")
TRACCAR_USER = os.getenv("TRACCAR_USER", "admin")
TRACCAR_PASS = os.getenv("TRACCAR_PASS", "admin")
TRACCAR_TOKEN = os.getenv("TRACCAR_TOKEN", None)


def _obtener_cabeceras_y_auth():
    """
    Helper interno para preparar cabeceras y método de autenticación.
    """
    headers = {"Accept": "application/json"}
    auth = None
    
    if TRACCAR_TOKEN:
        headers["Authorization"] = f"Bearer {TRACCAR_TOKEN}"
    else:
        auth = HTTPBasicAuth(TRACCAR_USER, TRACCAR_PASS)
        
    return headers, auth


def obtener_posiciones_traccar_local() -> List[Dict[str, Any]]:
    """
    Consulta todas las posiciones GPS activas en tiempo real desde Traccar local.
    """
    endpoint = f"{TRACCAR_URL}/api/positions"
    headers, auth = _obtener_cabeceras_y_auth()

    try:
        response = requests.get(
            endpoint, 
            headers=headers, 
            auth=auth, 
            timeout=3.0
        )

        if response.status_code == 200:
            return response.json()
        
        print(f"⚠️ Error {response.status_code} al consultar Traccar local: {response.text}")
        return []

    except requests.exceptions.RequestException as e:
        print(f"⚠️ Error de conexión con Traccar local: {e}")
        return []

def obtener_coordenadas_taxista(device_id: str = "Taxi1") -> Optional[Dict[str, float]]:
    """
    Busca la posición GPS actual de un taxi comparando identificadores, uniqueId y nombres en Traccar,
    o consultando directamente la posición del dispositivo si no está en el feed general.
    """
    target_id = str(device_id).strip()
    target_id_lower = target_id.lower()
    
    headers, auth = _obtener_cabeceras_y_auth()

    # 1. Intentar buscar primero el ID interno del dispositivo en Traccar por su uniqueId (placa) o name
    matching_device_id = None
    try:
        resp_devices = requests.get(f"{TRACCAR_URL}/api/devices", headers=headers, auth=auth, timeout=3.0)
        if resp_devices.status_code == 200:
            devices = resp_devices.json()
            for d in devices:
                d_name = str(d.get("name", "")).strip().lower()
                d_uniq = str(d.get("uniqueId", "")).strip().lower()
                if d_name == target_id_lower or d_uniq == target_id_lower:
                    matching_device_id = d.get("id")
                    break
    except Exception as e:
        print(f"⚠️ Error al consultar dispositivos en Traccar: {e}")

    # Si el dispositivo no existe en Traccar, puedes optar por auto-registrarse o retornar None
    if not matching_device_id:
        print(f"⚠️ El dispositivo '{target_id}' no está registrado en Traccar.")
        return None

    # 2. Consultar directamente las posiciones filtradas por el ID del dispositivo en Traccar (/api/positions?deviceId=ID)
    try:
        resp_pos = requests.get(
            f"{TRACCAR_URL}/api/positions", 
            params={"deviceId": matching_device_id}, 
            headers=headers, 
            auth=auth, 
            timeout=3.0
        )
        if resp_pos.status_code == 200:
            positions = resp_pos.json()
            if positions and len(positions) > 0:
                # Tomamos la posición más reciente
                pos = positions[-1]
                lat = pos.get("latitude")
                lon = pos.get("longitude")
                if lat is not None and lon is not None:
                    return {
                        "latitud": float(lat),
                        "longitud": float(lon),
                        "velocidad": float(pos.get("speed", 0.0)),
                        "ultima_actualizacion": pos.get("fixTime") or pos.get("serverTime")
                    }
    except Exception as e:
        print(f"⚠️️ Error al consultar posición específica para deviceId {matching_device_id}: {e}")

    return None

def registrar_dispositivo_en_traccar(nombre_taxi: str, id_unico: str) -> Optional[Dict[str, Any]]:
    """
    Registra automáticamente un nuevo taxi en Traccar local para que pueda transmitir.
    """
    endpoint = f"{TRACCAR_URL}/api/devices"
    headers, auth = _obtener_cabeceras_y_auth()
    
    payload = {
        "name": nombre_taxi,
        "uniqueId": id_unico
    }

    try:
        response = requests.post(
            endpoint, 
            json=payload, 
            headers=headers, 
            auth=auth, 
            timeout=4.0
        )

        if response.status_code in [200, 201]:
            return response.json()
        
        print(f"⚠️ No se pudo registrar el dispositivo en Traccar. Status: {response.status_code}")
        return None

    except requests.exceptions.RequestException as e:
        print(f"⚠️ Error al conectar con Traccar para registrar dispositivo: {e}")
        return None