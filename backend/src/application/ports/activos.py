"""Port de activos, su historial y el estado de la sincronización con Google Workspace."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date

from domain.entities.activos import Activo, EstadoActivo, Movimiento


class ActivoRepository(ABC):
    @abstractmethod
    def list_all(self) -> list[Activo]: ...

    @abstractmethod
    def get(self, activo_id: int) -> Activo | None:
        """Bloqueado para actualizar dentro de la transacción."""

    @abstractmethod
    def serial_en_uso(self, serial: str) -> bool:
        """Sin distinguir mayúsculas."""

    @abstractmethod
    def create(
        self, articulo_id: int, serial: str, estado: EstadoActivo, usuario_id: int | None, fecha: date | None
    ) -> Activo: ...

    @abstractmethod
    def save(self, activo: Activo) -> None: ...

    @abstractmethod
    def de_titular(self, usuario_id: int) -> list[Activo]: ...

    @abstractmethod
    def prestados_a(self, usuario_id: int) -> list[Activo]: ...

    @abstractmethod
    def add_movimiento(
        self, antes: Activo | None, despues: Activo, motivo: str, realizado_por: str
    ) -> None: ...

    @abstractmethod
    def movimientos(self, activo_id: int) -> list[Movimiento]:
        """Más reciente primero, con los nombres de los usuarios (incluye eliminados)."""


class SyncGoogleRepository(ABC):
    @abstractmethod
    def estado(self) -> dict:
        """Última corrida y última corrida exitosa de ``sync_google_log``."""
