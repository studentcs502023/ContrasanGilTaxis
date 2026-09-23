# routers/auth/serviceAuth.py

import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from routers.auth.models import UsuarioCreate, RolEnum
from connections.database import get_db

# Configuración de claves y firma de JWT
JWT_SECRET_KEY = "e83a9f4c8b2d1e0f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

# Esquema de seguridad Bearer
security_scheme = HTTPBearer()


def verificar_contrasena(plain_password: str, hashed_password: str) -> bool:
    try:
        password_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except Exception:
        return False


def crear_token_acceso(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)


def autenticar_usuario(db: Session, credenciales):
    sql = text("""
        SELECT id, nombre, telefono, email, contrasena_hash, rol, estado_cuenta 
        FROM usuarios 
        WHERE telefono = :telefono AND estado_cuenta = 'ACTIVO'
    """)
    usuario = db.execute(sql, {"telefono": credenciales.telefono.strip()}).mappings().first()

    if not usuario or not verificar_contrasena(credenciales.contrasena, usuario["contrasena_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Teléfono o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = crear_token_acceso(data={
        "sub": str(usuario["id"]),
        "id": usuario["id"],
        "nombre": usuario["nombre"],
        "rol": usuario["rol"]
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": {
            "id": usuario["id"],
            "nombre": usuario["nombre"],
            "telefono": usuario["telefono"],
            "email": usuario["email"],
            "rol": usuario["rol"]
        }
    }


# 🔑 FUNCIÓN CORREGIDA: Ahora actúa como dependencia global de FastAPI
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> dict:
    """
    Extrae el token JWT del Header Authorization Bearer y consulta la base de datos.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales de autenticación",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials

    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        usuario_id: Optional[int] = payload.get("id") or payload.get("sub") or payload.get("usuario_id")
        
        if usuario_id is None:
            raise credentials_exception

    except jwt.PyJWTError:
        raise credentials_exception

    sql = text("""
        SELECT id, nombre, telefono, email, rol, estado_cuenta 
        FROM usuarios 
        WHERE id = :id AND estado_cuenta = 'ACTIVO'
    """)
    usuario = db.execute(sql, {"id": int(usuario_id)}).mappings().first()

    if usuario is None:
        raise credentials_exception

    return dict(usuario)


def registrar_nuevo_usuario(db: Session, datos: UsuarioCreate):
    email_normalizado = datos.email.lower().strip() if datos.email else None

    existente = db.execute(
        text("SELECT id, telefono, email FROM usuarios WHERE telefono = :telefono OR (email IS NOT NULL AND email = :email)"),
        {"telefono": datos.telefono.strip(), "email": email_normalizado}
    ).fetchone()

    if existente:
        if existente.telefono == datos.telefono.strip():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El número de teléfono ya está registrado."
            )
        if email_normalizado and existente.email == email_normalizado:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El correo electrónico ya se encuentra registrado."
            )

    pwd_bytes = datos.contrasena.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

    rol_str = datos.rol.value if hasattr(datos.rol, 'value') else str(datos.rol)

    try:
        insert_usuario_sql = text("""
            INSERT INTO usuarios (
                nombre, telefono, email, contrasena_hash, rol, estado_cuenta, 
                acepto_politicas, fecha_aceptacion_politicas
            )
            VALUES (
                :nombre, :telefono, :email, :contrasena_hash, :rol, 'ACTIVO',
                :acepto_politicas, CASE WHEN :acepto_politicas = TRUE THEN NOW() ELSE NULL END
            )
        """)

        res_usuario = db.execute(insert_usuario_sql, {
            "nombre": datos.nombre.strip(),
            "telefono": datos.telefono.strip(),
            "email": email_normalizado,
            "contrasena_hash": hashed_password,
            "rol": rol_str,
            "acepto_politicas": datos.acepto_politicas
        })

        usuario_id = res_usuario.lastrowid

        if datos.rol == RolEnum.TAXISTA and datos.datos_taxista:
            insert_taxista_sql = text("""
                INSERT INTO taxistas (
                    usuario_id, placa, modelo_vehiculo, numero_licencia, estado_servicio, ultima_ubicacion
                )
                VALUES (
                    :usuario_id, :placa, :modelo_vehiculo, :numero_licencia, 'INACTIVO',
                    ST_GeomFromText('POINT(-73.1321 6.5512)', 4326)
                )
            """)

            db.execute(insert_taxista_sql, {
                "usuario_id": usuario_id,
                "placa": datos.datos_taxista.placa.upper().strip(),
                "modelo_vehiculo": datos.datos_taxista.modelo_vehiculo,
                "numero_licencia": datos.datos_taxista.numero_licencia
            })

        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al guardar el usuario en la base de datos: {str(e)}"
        )

    return {
        "id": usuario_id,
        "nombre": datos.nombre,
        "telefono": datos.telefono,
        "email": datos.email,
        "rol": rol_str
    }