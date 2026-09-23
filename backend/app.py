import uvicorn
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Importación de routers
from routers.auth import apiAuth
from routers.usuarios import apiUsuarios
from routers.pasajeros import apiPasajeros
from routers.taxistas import apiTaxistas
from routers.viajes import apiViajes
from routers.suscripciones_vip import apiSuscripcionesVip
from routers.direcciones_favoritas import apiDireccionesFavoritas
from routers.calificaciones import apiCalificaciones

app = FastAPI(
    title="API San Gil Taxis - MVP",
    description="Backend en FastAPI para la gestión de taxis en tiempo real en San Gil, Santander.",
    version="1.0.0",
)

# -----------------------------------------------------------------------------
# Configuración CORS con orígenes explícitos (Requerido para con/sin credenciales)
# -----------------------------------------------------------------------------
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # Lista explícita en lugar de '*' o regex amplio
    allow_credentials=True,         # Requerido cuando conCredentials=true en React
    allow_methods=["*"],
    allow_headers=["*"],
)

# Capturador global para que en caso de error 500 se refleje el origen exacto sin usar '*'
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"❌ Error Interno no controlado: {str(exc)}")
    origin = request.headers.get("origin")
    
    headers = {}
    if origin in origins:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Error interno en el servidor: {str(exc)}"},
        headers=headers
    )

# ... Inclusión de routers y ejecución ...
app.include_router(apiAuth.router)
app.include_router(apiUsuarios.router)
app.include_router(apiPasajeros.router)
app.include_router(apiTaxistas.router)
app.include_router(apiViajes.router)
app.include_router(apiSuscripcionesVip.router)
app.include_router(apiDireccionesFavoritas.router)
app.include_router(apiCalificaciones.router)

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)