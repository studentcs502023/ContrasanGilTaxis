import time
import requests

# Servidor Traccar Demo y ID del Taxi
TRACCAR_URL = "http://demo4.traccar.org:5055"
DEVICE_ID = "taxi1"

# Ruta simulada: Avanzando por la Carrera 19 hacia el Parque Principal de San Gil
ruta_san_gil = [
    {"lat": 6.5535, "lon": -73.1345},
    {"lat": 6.5540, "lon": -73.1350},
    {"lat": 6.5545, "lon": -73.1355},
    {"lat": 6.5550, "lon": -73.1358},
    {"lat": 6.5552, "lon": -73.1360},  # Parque Principal
    {"lat": 6.5558, "lon": -73.1365},
    {"lat": 6.5565, "lon": -73.1370},
]

print("🚗 Iniciando simulación de taxi en vivo por San Gil...")

for i, punto in enumerate(ruta_san_gil, start=1):
    params = {
        "id": DEVICE_ID,
        "lat": punto["lat"],
        "lon": punto["lon"],
        "speed": 25,  # km/h
    }

    try:
        # Se agrega timeout=5 para evitar que se quede congelado si falla la conexión
        response = requests.get(TRACCAR_URL, params=params, timeout=5)
        if response.status_code == 200:
            print(
                f"[{i}/{len(ruta_san_gil)}] GPS enviado correctamente: Lat {punto['lat']}, Lon {punto['lon']}"
            )
        else:
            print(
                f"[{i}/{len(ruta_san_gil)}] Servidor respondió con código: {response.status_code}"
            )
    except requests.exceptions.RequestException as e:
        print(
            f"[{i}/{len(ruta_san_gil)}] ⚠️ No se pudo conectar a Traccar Demo (Error de Red). Continuando..."
        )

    # Esperar 3 segundos entre cada punto para simular movimiento real
    time.sleep(3)

print("🏁 Simulación finalizada.")