"""Port de reasignaciones (solicitudes de pasar un equipo de una persona a otra)."""

from __future__ import annotations

from abc import ABC, abstractmethod

from domain.entities.activos import EstadoReasignacion, Reasignacion


class ReasignacionRepository(ABC):
    @abstractmethod
    def list_all(self, estado: EstadoReasignacion | None = None) -> list[Reasignacion]:
        """Pendientes primero; luego las más recientes."""

    @abstractmethod
    def get(self, reasignacion_id: int) -> Reasignacion | None:
        """Bloqueada para actualizar."""

    @abstractmethod
    def pendiente_de_activo(self, activo_id: int) -> Reasignacion | None: ...

    @abstractmethod
    def create(
        self, activo_id: int, usuario_origen: int, usuario_destino: int, motivo: str, solicitado_por: int
    ) -> Reasignacion: ...

    @abstractmethod
    def resolver(
        self, reasignacion_id: int, estado: EstadoReasignacion, resuelto_por: int, comentario: str | None
    ) -> Reasignacion: ...
