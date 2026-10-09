"""Colaboradores que reciben equipos y sus vacaciones."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from enum import StrEnum

from domain.exceptions import ValidationError


class EstadoUsuario(StrEnum):
    ACTIVO = "activo"
    VACACIONES = "vacaciones"
    DESACTIVADO = "desactivado"
    ELIMINADO = "eliminado"


class AccionVacacion(StrEnum):
    CONSERVA = "conserva"
    RESGUARDO = "resguardo"
    PRESTAMO = "prestamo"

    @classmethod
    def parse(cls, raw: object) -> AccionVacacion:
        try:
            return cls(str(raw))
        except ValueError as error:
            raise ValidationError("Indique qué pasa con los equipos.", details={"field": "accion"}) from error


@dataclass(frozen=True)
class Vacacion:
    id: int
    usuario_id: int
    desde: date
    hasta: date
    accion: AccionVacacion
    suplente_id: int | None = None
    nota: str | None = None
    finalizada_en: datetime | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "usuarioId": self.usuario_id,
            "desde": self.desde,
            "hasta": self.hasta,
            "accion": self.accion.value,
            "suplenteId": self.suplente_id,
            "nota": self.nota,
            "finalizadaEn": self.finalizada_en,
        }


@dataclass(frozen=True)
class Usuario:
    id: int
    codigo: str
    nombre: str
    correo: str | None
    cargo_id: int | None
    departamento_id: int | None
    estado: EstadoUsuario
    pendiente_clasificar: bool = False
    fuente_desactivacion: str | None = None
    desactivado_en: datetime | None = None
    vacacion: Vacacion | None = None

    @property
    def vigente(self) -> bool:
        return self.estado in (EstadoUsuario.ACTIVO, EstadoUsuario.VACACIONES)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "codigo": self.codigo,
            "nombre": self.nombre,
            "correo": self.correo,
            "cargoId": self.cargo_id,
            "departamentoId": self.departamento_id,
            "estado": self.estado.value,
            "pendienteClasificar": self.pendiente_clasificar,
            "fuenteDesactivacion": self.fuente_desactivacion,
            "desactivadoEn": self.desactivado_en,
            "vacacion": self.vacacion.to_dict() if self.vacacion else None,
        }


@dataclass(frozen=True)
class ResultadoBaja:
    liberados: int
    prestamos_devueltos_a_ti: int
    vacaciones_ajustadas: int

    def to_dict(self) -> dict:
        return {
            "liberados": self.liberados,
            "prestamosDevueltosATi": self.prestamos_devueltos_a_ti,
            "vacacionesAjustadas": self.vacaciones_ajustadas,
        }
