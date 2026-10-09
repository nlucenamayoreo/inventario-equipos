"""Seguridad: permisos, roles configurables y operadores (personas con acceso a la aplicación)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

CATALOGOS = "catalogos.gestionar"
ARTICULOS = "articulos.gestionar"
USUARIOS = "usuarios.gestionar"
ACTIVOS_REGISTRAR = "activos.registrar"
ACTIVOS_ASIGNAR = "activos.asignar"
REASIGNACIONES_SOLICITAR = "reasignaciones.solicitar"
REASIGNACIONES_APROBAR = "reasignaciones.aprobar"
SEGURIDAD = "seguridad.gestionar"

#: Grupo de Cognito que siempre es superadministrador (arranque del sistema).
GRUPO_SUPERADMIN = "admin_ti"
ROL_SUPERADMIN = "Superadministrador"


@dataclass(frozen=True)
class Permiso:
    codigo: str
    modulo: str
    descripcion: str

    def to_dict(self) -> dict:
        return {"codigo": self.codigo, "modulo": self.modulo, "descripcion": self.descripcion}


@dataclass(frozen=True)
class Rol:
    id: int
    nombre: str
    descripcion: str | None
    es_sistema: bool
    activo: bool
    permisos: tuple[str, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "nombre": self.nombre,
            "descripcion": self.descripcion,
            "esSistema": self.es_sistema,
            "activo": self.activo,
            "permisos": list(self.permisos),
        }


@dataclass(frozen=True)
class Operador:
    id: int
    correo: str
    nombre: str
    rol_id: int
    activo: bool
    rol_nombre: str | None = None
    rol_es_sistema: bool = False
    permisos: tuple[str, ...] = field(default_factory=tuple)
    creado_en: datetime | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "correo": self.correo,
            "nombre": self.nombre,
            "rolId": self.rol_id,
            "rolNombre": self.rol_nombre,
            "activo": self.activo,
            "creadoEn": self.creado_en,
        }
