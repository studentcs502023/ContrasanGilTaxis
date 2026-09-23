import bcrypt
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException
from starlette import status

from routers.usuarios.models import UsuarioCreate, UsuarioUpdate


def hash_password(password: str) -> str:
    """
    Genera un hash seguro utilizando bcrypt nativo.
    Codifica en UTF-8 y trunca a los primeros 72 bytes para evitar errores.
    """
    # 1. Convertir la contraseña a bytes y truncar a 72 bytes
    pwd_bytes = password.encode('utf-8')[:72]
    
    # 2. Generar salt y calcular hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    
    # 3. Retornar el hash como string UTF-8 para guardar en la base de datos
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica una contraseña en texto plano contra su hash Bcrypt almacenado.
    """
    try:
        pwd_bytes = plain_password.encode('utf-8')[:72]
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


def getUsuarios(db: Session):
    """
    Obtiene todos los usuarios con estado de cuenta ACTIVO.
    """
    query = text("""
        SELECT id, nombre, telefono, email, rol, estado_cuenta, 
               acepto_politicas, fecha_aceptacion_politicas, creado_en, actualizado_en 
        FROM usuarios
        WHERE estado_cuenta = 'ACTIVO'
    """)
    try:
        result = db.execute(query).mappings().all()
        return result
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al consultar los usuarios: {str(e)}",
        )


def getUsuarioById(db: Session, usuario_id: int):
    """
    Obtiene un usuario específico por su ID. Lanza 404 si no existe.
    """
    query = text("""
        SELECT id, nombre, telefono, email, rol, estado_cuenta, 
               acepto_politicas, fecha_aceptacion_politicas, creado_en, actualizado_en 
        FROM usuarios 
        WHERE id = :id AND estado_cuenta = 'ACTIVO'
    """)
    try:
        result = db.execute(query, {"id": usuario_id}).mappings().first()
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Usuario no encontrado o inactivo"
            )
        return result
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al buscar el usuario: {str(e)}",
        )


def postUsuario(db: Session, usuario: UsuarioCreate):
    """
    Registra un nuevo usuario guardando el hash Bcrypt en `contrasena_hash`
    e inicializa su perfil dependiente (pasajero o taxista).
    """
    rol_normalizado = usuario.rol.strip().upper()

    # Encriptar la contraseña utilizando bcrypt nativo
    contrasena_encriptada = hash_password(usuario.contrasena)

    query_usuario = text("""
        INSERT INTO usuarios (
            nombre, telefono, email, contrasena_hash, rol, acepto_politicas, fecha_aceptacion_politicas
        )
        VALUES (
            :nombre, :telefono, :email, :contrasena_hash, :rol, :acepto_politicas,
            CASE WHEN :acepto_politicas = TRUE THEN NOW() ELSE NULL END
        )
    """)

    params = {
        "nombre": usuario.nombre.strip(),
        "telefono": usuario.telefono.strip(),
        "email": usuario.email.strip().lower() if usuario.email else None,
        "contrasena_hash": contrasena_encriptada,
        "rol": rol_normalizado,
        "acepto_politicas": usuario.acepto_politicas
    }

    try:
        # Insertar en la tabla principal `usuarios`
        result = db.execute(query_usuario, params)
        new_id = result.lastrowid

        # Inicializar en las tablas dependientes según el rol
        if rol_normalizado in ["CLIENTE", "PASAJERO"]:
            query_pasajero = text("""
                INSERT INTO pasajeros (usuario_id, es_vip) 
                VALUES (:usuario_id, FALSE)
            """)
            db.execute(query_pasajero, {"usuario_id": new_id})

        elif rol_normalizado in ["TAXISTA", "CONDUCTOR"]:
            query_taxista = text("""
                INSERT INTO taxistas (usuario_id, placa, estado_servicio, ultima_ubicacion) 
                VALUES (
                    :usuario_id, 
                    CONCAT('TMP', :usuario_id), 
                    'INACTIVO', 
                    ST_GeomFromText('POINT(-73.1321 6.5512)')
                )
            """)
            db.execute(query_taxista, {"usuario_id": new_id})

        # Confirmar la transacción
        db.commit()

        return getUsuarioById(db, new_id)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El número de teléfono o correo electrónico ya se encuentra registrado.",
        )
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno en la base de datos al registrar el usuario: {str(e)}",
        )


def updateUsuario(db: Session, usuario_id: int, usuario_data: UsuarioUpdate):
    """
    Actualiza parcialmente los datos de un usuario.
    """
    getUsuarioById(db, usuario_id)

    update_fields = []
    params = {"id": usuario_id}

    if usuario_data.nombre is not None:
        update_fields.append("nombre = :nombre")
        params["nombre"] = usuario_data.nombre

    if usuario_data.telefono is not None:
        update_fields.append("telefono = :telefono")
        params["telefono"] = usuario_data.telefono

    if usuario_data.email is not None:
        update_fields.append("email = :email")
        params["email"] = usuario_data.email

    if usuario_data.rol is not None:
        update_fields.append("rol = :rol")
        params["rol"] = usuario_data.rol

    if usuario_data.estado_cuenta is not None:
        update_fields.append("estado_cuenta = :estado_cuenta")
        params["estado_cuenta"] = usuario_data.estado_cuenta

    if usuario_data.acepto_politicas is not None:
        update_fields.append("acepto_politicas = :acepto_politicas")
        params["acepto_politicas"] = usuario_data.acepto_politicas
        
        if usuario_data.acepto_politicas is True:
            update_fields.append("fecha_aceptacion_politicas = NOW()")

    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se enviaron campos para actualizar",
        )

    query_str = f"""
        UPDATE usuarios 
        SET {', '.join(update_fields)}
        WHERE id = :id
    """

    try:
        db.execute(text(query_str), params)
        db.commit()
        return getUsuarioById(db, usuario_id)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La actualización viola restricciones de unicidad (teléfono/email ya existe)",
        )
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar el usuario: {str(e)}",
        )


def deleteUsuarioLogico(db: Session, usuario_id: int):
    """
    Desactiva lógicamente la cuenta del usuario pasando su estado a 'INACTIVO'.
    """
    getUsuarioById(db, usuario_id)

    query = text("""
        UPDATE usuarios 
        SET estado_cuenta = 'INACTIVO' 
        WHERE id = :id
    """)
    try:
        db.execute(query, {"id": usuario_id})
        db.commit()
        return {"mensaje": f"Usuario con ID {usuario_id} desactivado correctamente"}
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al desactivar el usuario: {str(e)}",
        )