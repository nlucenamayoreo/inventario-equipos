"""Port de colaboradores (usuarios del inventario) y sus vacaciones."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date

from domain.entities.usuarios import AccionVacacion, EstadoUsuario, Usuario


class UsuarioRepository(ABC):
    @abstractmethod
    def list_visibles(self) -> list[Usuario]:
        """Todos menos los eliminados, con su vacación abierta."""

    @abstractmethod
    def get(self, usuario_id: int) -> Usuario | None:
        """Usuario no eliminado (bloqueado para actualizar), con su vacación abierta."""

    @abstractmethod
    def por_codigo(self, codigo: str) -> Usuario | None:
        """Usuario no eliminado con ese código, sin distinguir mayúsculas."""

    @abstractmethod
    def estado_por_codigo(self, codigo: str, excluir_id: int | None = None) -> EstadoUsuario | None:
        """Estado del usuario con ese código (incluye eliminados), sin distinguir mayúsculas."""

    @abstractmethod
    def correo_en_uso(self, correo: str, excluir_id: int | None = None) -> bool: ...

    @abstractmethod
    def create(
        self, codigo: str, nombre: str, correo: str | None, cargo_id: int, departamento_id: int
    ) -> Usuario: ...

    @abstractmethod
    def save(self, usuario: Usuario) -> Usuario:
        """Persiste datos y estado (no la vacación)."""

    @abstractmethod
    def create_vacacion(
        self,
        usuario_id: int,
        desde: date,
        hasta: date,
        accion: AccionVacacion,
        suplente_id: int | None,
        nota: str | None,
    ) -> None: ...

    @abstractmethod
    def finalizar_vacacion(self, usuario_id: int) -> None:
        """Cierra la vacación abierta del usuario, si la hay."""

    @abstractmethod
    def quitar_suplente(self, suplente_id: int) -> int:
        """Vacaciones abiertas donde era suplente pasan a ``resguardo`` sin suplente. Devuelve cuántas."""
