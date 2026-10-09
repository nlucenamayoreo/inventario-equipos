"""Escenario base para los tests: catálogos, cargos con dotación y dos colaboradores."""

from __future__ import annotations

from application.dto.principal import Principal
from domain.entities.catalogos import NivelDotacion
from fakes.fake_app_unit_of_work import FakeAppUnitOfWork

ADMIN = Principal(subject="sub-admin", email="Admin.TI@empresa.com", groups=frozenset({"admin_ti"}))
CONSULTA = Principal(subject="sub-consulta", email="consulta@empresa.com", groups=frozenset({"consulta"}))


def escenario() -> FakeAppUnitOfWork:
    """Tipos: 1 Laptop, 2 Monitor. Artículos: 1 Latitude (laptop), 2 Precision (laptop), 3 P24 (monitor).
    Cargos: 1 Ejecutivo (laptop obligatoria, monitor no permitido),
    2 Desarrollador (laptop obligatoria solo Precision, monitor obligatorio).
    Usuarios: 1 Ana (Ejecutivo), 2 Beto (Desarrollador). Silo 1 / departamento 1."""
    uow = FakeAppUnitOfWork()
    c = uow.catalogos
    c.create_silo("Comercial")
    c.create_departamento(1, "Ventas")
    c.create_tipo("Laptop")
    c.create_tipo("Monitor")
    c.create_articulo(1, "Dell", "Latitude 5440", None, 48)
    c.create_articulo(1, "Dell", "Precision 3581", None, 48)
    c.create_articulo(2, "HP", "P24 G5", None, 60)
    c.create_cargo("Ejecutivo", NivelDotacion.PERMITIDO)
    c.upsert_dotacion(1, 1, NivelDotacion.OBLIGATORIO, None)
    c.upsert_dotacion(1, 2, NivelDotacion.NO_PERMITIDO, None)
    c.create_cargo("Desarrollador", NivelDotacion.OBLIGATORIO)
    c.upsert_dotacion(2, 1, NivelDotacion.OBLIGATORIO, 2)
    uow.usuarios.create("U-001", "Ana", "ana@empresa.com", 1, 1)
    uow.usuarios.create("U-002", "Beto", "beto@empresa.com", 2, 1)
    return uow
