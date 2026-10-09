"""Ports de seguridad: roles, operadores y el directorio de identidad (Cognito)."""

from __future__ import annotations

from abc import ABC, abstractmethod

from domain.entities.seguridad import Operador, Permiso, Rol


class SeguridadRepository(ABC):
    @abstractmethod
    def list_permisos(self) -> list[Permiso]: ...

    @abstractmethod
    def list_roles(self) -> list[Rol]: ...

    @abstractmethod
    def get_rol(self, rol_id: int) -> Rol | None: ...

    @abstractmethod
    def rol_por_nombre(self, nombre: str) -> Rol | None:
        """Sin distinguir mayúsculas."""

    @abstractmethod
    def create_rol(self, nombre: str, descripcion: str | None, permisos: list[str]) -> Rol: ...

    @abstractmethod
    def update_rol(
        self, rol_id: int, nombre: str, descripcion: str | None, activo: bool, permisos: list[str]
    ) -> Rol: ...

    @abstractmethod
    def list_operadores(self) -> list[Operador]: ...

    @abstractmethod
    def get_operador(self, operador_id: int) -> Operador | None: ...

    @abstractmethod
    def operador_por_correo(self, correo: str) -> Operador | None:
        """Con su rol y permisos; sin distinguir mayúsculas."""

    @abstractmethod
    def create_operador(
        self, correo: str, nombre: str, rol_id: int, invitado_por: str | None
    ) -> Operador: ...

    @abstractmethod
    def update_operador(self, operador_id: int, nombre: str, rol_id: int, activo: bool) -> Operador: ...


class DirectorioIdentidad(ABC):
    """Cuentas de acceso (Cognito): la aplicación invita y la persona define su contraseña al ingresar."""

    @abstractmethod
    def invitar(self, correo: str, nombre: str, emisor: str | None) -> None:
        """Crea la cuenta y envía la contraseña temporal por correo. Idempotente si ya existe.
        ``emisor`` es el ``iss`` del token del operador que invita (identifica el User Pool)."""
