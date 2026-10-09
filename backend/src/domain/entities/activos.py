"""Activos (unidades con serial) y su historial de movimientos."""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import date, datetime
from enum import StrEnum

from domain.exceptions import ValidationError


class EstadoActivo(StrEnum):
    DISPONIBLE = "disponible"
    ASIGNADO = "asignado"
    EN_RESGUARDO = "en_resguardo"
    PRESTAMO = "prestamo"
    PENDIENTE_RECUPERACION = "pendiente_recuperacion"
    EN_REPARACION = "en_reparacion"
    DE_BAJA = "de_baja"

    @property
    def es_tenencia(self) -> bool:
        """El titular "tiene" el equipo (cuenta para cobertura)."""
        return self in (EstadoActivo.ASIGNADO, EstadoActivo.EN_RESGUARDO, EstadoActivo.PRESTAMO)

    @property
    def requiere_titular(self) -> bool:
        return self.es_tenencia or self is EstadoActivo.PENDIENTE_RECUPERACION

    @property
    def requiere_custodio(self) -> bool:
        """Fuera de manos del titular: alguien con acceso a la aplicación responde por el equipo."""
        return self in (EstadoActivo.DISPONIBLE, EstadoActivo.EN_RESGUARDO, EstadoActivo.EN_REPARACION)


_CONSERVAR = object()

#: Estados que se pueden fijar a un activo sin titular (alta y cambio de estado).
ESTADOS_SIN_TITULAR = (EstadoActivo.DISPONIBLE, EstadoActivo.EN_REPARACION, EstadoActivo.DE_BAJA)


def parse_estado_sin_titular(raw: object) -> EstadoActivo:
    try:
        estado = EstadoActivo(str(raw))
    except ValueError:
        estado = None
    if estado not in ESTADOS_SIN_TITULAR:
        raise ValidationError("Estado no válido.", details={"field": "estado"})
    return estado


@dataclass(frozen=True)
class Activo:
    id: int
    articulo_id: int
    serial: str
    estado: EstadoActivo
    usuario_id: int | None = None
    prestado_a: int | None = None
    fecha_asignacion: date | None = None
    custodio_id: int | None = None

    def mover(
        self,
        estado: EstadoActivo,
        *,
        titular: int | None | object = _CONSERVAR,
        prestado_a: int | None = None,
        fecha_asignacion: date | None | object = _CONSERVAR,
        custodio_id: int | None = None,
    ) -> Activo:
        """Nuevo estado respetando las restricciones de la tabla: titular solo en estados que lo exigen,
        ``prestado_a`` solo en préstamo, fecha de asignación solo con titular y custodio siempre que el
        equipo no está en manos de su titular."""
        if estado.requiere_custodio and custodio_id is None:
            raise ValidationError(
                "Indique quién queda a cargo del resguardo del equipo.", details={"field": "custodioId"}
            )
        nuevo_titular = self.usuario_id if titular is _CONSERVAR else titular
        if not estado.requiere_titular:
            nuevo_titular = None
        fecha = self.fecha_asignacion if fecha_asignacion is _CONSERVAR else fecha_asignacion
        return replace(
            self,
            estado=estado,
            usuario_id=nuevo_titular,
            prestado_a=prestado_a if estado is EstadoActivo.PRESTAMO else None,
            fecha_asignacion=fecha if nuevo_titular is not None else None,
            custodio_id=custodio_id if estado.requiere_custodio else None,
        )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "articuloId": self.articulo_id,
            "serial": self.serial,
            "estado": self.estado.value,
            "usuarioId": self.usuario_id,
            "prestadoA": self.prestado_a,
            "fechaAsignacion": self.fecha_asignacion,
            "custodioId": self.custodio_id,
        }


@dataclass(frozen=True)
class Movimiento:
    id: int
    activo_id: int
    estado_anterior: EstadoActivo | None
    estado_nuevo: EstadoActivo
    usuario_anterior: int | None
    usuario_nuevo: int | None
    motivo: str | None
    realizado_por: str
    realizado_en: datetime
    usuario_anterior_nombre: str | None = None
    usuario_nuevo_nombre: str | None = None
    custodio_anterior: int | None = None
    custodio_nuevo: int | None = None
    custodio_anterior_nombre: str | None = None
    custodio_nuevo_nombre: str | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "activoId": self.activo_id,
            "estadoAnterior": self.estado_anterior.value if self.estado_anterior else None,
            "estadoNuevo": self.estado_nuevo.value,
            "usuarioAnterior": self.usuario_anterior,
            "usuarioNuevo": self.usuario_nuevo,
            "usuarioAnteriorNombre": self.usuario_anterior_nombre,
            "usuarioNuevoNombre": self.usuario_nuevo_nombre,
            "custodioAnterior": self.custodio_anterior,
            "custodioNuevo": self.custodio_nuevo,
            "custodioAnteriorNombre": self.custodio_anterior_nombre,
            "custodioNuevoNombre": self.custodio_nuevo_nombre,
            "motivo": self.motivo,
            "realizadoPor": self.realizado_por,
            "realizadoEn": self.realizado_en,
        }


class EstadoReasignacion(StrEnum):
    PENDIENTE = "pendiente"
    APROBADA = "aprobada"
    RECHAZADA = "rechazada"
    CANCELADA = "cancelada"


#: Estados desde los que un equipo puede pasar de una persona a otra.
ESTADOS_REASIGNABLES = (EstadoActivo.ASIGNADO, EstadoActivo.EN_RESGUARDO, EstadoActivo.PENDIENTE_RECUPERACION)


@dataclass(frozen=True)
class Reasignacion:
    id: int
    activo_id: int
    usuario_origen: int
    usuario_destino: int
    motivo: str
    estado: EstadoReasignacion
    solicitado_por: int
    solicitado_en: datetime
    resuelto_por: int | None = None
    resuelto_en: datetime | None = None
    comentario: str | None = None
    solicitado_por_nombre: str | None = None
    resuelto_por_nombre: str | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "activoId": self.activo_id,
            "usuarioOrigen": self.usuario_origen,
            "usuarioDestino": self.usuario_destino,
            "motivo": self.motivo,
            "estado": self.estado.value,
            "solicitadoPor": self.solicitado_por,
            "solicitadoPorNombre": self.solicitado_por_nombre,
            "solicitadoEn": self.solicitado_en,
            "resueltoPor": self.resuelto_por,
            "resueltoPorNombre": self.resuelto_por_nombre,
            "resueltoEn": self.resuelto_en,
            "comentario": self.comentario,
        }
