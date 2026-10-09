"""Catálogos: silos, departamentos, tipos de equipo, artículos y cargos con su perfil de dotación."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum

from domain.exceptions import ValidationError


class NivelDotacion(StrEnum):
    OBLIGATORIO = "obligatorio"
    PERMITIDO = "permitido"
    NO_PERMITIDO = "no_permitido"

    @classmethod
    def parse(cls, raw: object) -> NivelDotacion:
        try:
            return cls(str(raw))
        except ValueError as error:
            raise ValidationError("Nivel de dotación no válido.", details={"field": "nivel"}) from error


@dataclass(frozen=True)
class Silo:
    id: int
    nombre: str
    activo: bool = True

    def to_dict(self) -> dict:
        return {"id": self.id, "nombre": self.nombre, "activo": self.activo}


@dataclass(frozen=True)
class Departamento:
    id: int
    silo_id: int
    nombre: str
    activo: bool = True

    def to_dict(self) -> dict:
        return {"id": self.id, "siloId": self.silo_id, "nombre": self.nombre, "activo": self.activo}


@dataclass(frozen=True)
class TipoEquipo:
    id: int
    nombre: str
    activo: bool = True

    def to_dict(self) -> dict:
        return {"id": self.id, "nombre": self.nombre, "activo": self.activo}


@dataclass(frozen=True)
class Articulo:
    id: int
    codigo: str
    tipo_id: int
    marca: str
    modelo: str
    especificaciones: str | None = None
    vida_util_meses: int | None = None
    activo: bool = True

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "codigo": self.codigo,
            "tipoId": self.tipo_id,
            "marca": self.marca,
            "modelo": self.modelo,
            "especificaciones": self.especificaciones,
            "vidaUtilMeses": self.vida_util_meses,
            "activo": self.activo,
        }


@dataclass(frozen=True)
class DotacionItem:
    tipo_id: int
    nivel: NivelDotacion
    articulo_restringido_id: int | None = None

    def to_dict(self) -> dict:
        return {
            "tipoId": self.tipo_id,
            "nivel": self.nivel.value,
            "articuloRestringidoId": self.articulo_restringido_id,
        }


@dataclass(frozen=True)
class Cargo:
    id: int
    nombre: str
    activo: bool = True
    dotacion: tuple[DotacionItem, ...] = field(default_factory=tuple)

    def item(self, tipo_id: int) -> DotacionItem | None:
        return next((d for d in self.dotacion if d.tipo_id == tipo_id), None)

    def nivel(self, tipo_id: int) -> NivelDotacion:
        item = self.item(tipo_id)
        return item.nivel if item else NivelDotacion.NO_PERMITIDO

    def permite(self, articulo: Articulo) -> bool:
        """Equivale a ``puede_recibir()``: tipo no "no permitido" y, si hay artículo restringido, ese."""
        item = self.item(articulo.tipo_id)
        if item is None or item.nivel is NivelDotacion.NO_PERMITIDO:
            return False
        return item.articulo_restringido_id is None or item.articulo_restringido_id == articulo.id

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "nombre": self.nombre,
            "activo": self.activo,
            "dotacion": [d.to_dict() for d in self.dotacion],
        }
