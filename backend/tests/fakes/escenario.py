"""Escenario base para los tests: catálogos, cargos con dotación, colaboradores y personas con acceso."""

from __future__ import annotations

from application.dto.principal import Principal
from domain.entities import seguridad as p
from domain.entities.catalogos import NivelDotacion
from fakes.fake_app_unit_of_work import FakeAppUnitOfWork

_ANALISTA = (p.ACTIVOS_REGISTRAR, p.ACTIVOS_ASIGNAR, p.REASIGNACIONES_SOLICITAR)
_GERENTE = (p.REASIGNACIONES_APROBAR, p.REASIGNACIONES_SOLICITAR, p.USUARIOS, p.CATALOGOS)

ADMIN = Principal(
    subject="sub-admin",
    email="Admin.TI@empresa.com",
    groups=frozenset({"admin_ti"}),
    operador_id=1,
    rol=p.ROL_SUPERADMIN,
    superadmin=True,
)
ANALISTA = Principal(
    subject="sub-analista",
    email="analista@empresa.com",
    operador_id=2,
    rol="Analista Intelix",
    permisos=frozenset(_ANALISTA),
)
GERENTE = Principal(
    subject="sub-gerente",
    email="gerente@empresa.com",
    operador_id=3,
    rol="Gerente de sistemas",
    permisos=frozenset(_GERENTE),
)
CONSULTA = Principal(subject="sub-consulta", email="consulta@empresa.com", rol="Visitante")


def escenario() -> FakeAppUnitOfWork:
    """Tipos: 1 Laptop (máx. 2 por persona), 2 Monitor. Artículos: 1 Latitude (laptop),
    2 Precision (laptop), 3 P24 (monitor).
    Cargos: 1 Ejecutivo (laptop obligatoria, monitor no permitido),
    2 Desarrollador (laptop obligatoria solo Precision, monitor obligatorio).
    Usuarios: 1 Ana (Ejecutivo), 2 Beto (Desarrollador). Silo 1 / departamento 1.
    Roles: 1 Superadministrador, 2 Analista Intelix, 3 Gerente de sistemas.
    Operadores: 1 admin, 2 analista, 3 gerente (mismos ids que los principals)."""
    uow = FakeAppUnitOfWork()
    c = uow.catalogos
    c.create_silo("Comercial")
    c.create_departamento(1, "Ventas")
    c.create_tipo("Laptop")
    c.create_tipo("Monitor")
    c.update_tipo(1, "Laptop", 2)
    for marca in ("Dell", "HP"):
        c.create_marca(marca)
    c.create_modelo(1, 1, "Latitude 5440")
    c.create_modelo(1, 1, "Precision 3581")
    c.create_modelo(2, 2, "P24 G5")
    c.create_articulo(1, "Dell", "Latitude 5440", None, 48, modelo_id=1)
    c.create_articulo(1, "Dell", "Precision 3581", None, 48, modelo_id=2)
    c.create_articulo(2, "HP", "P24 G5", None, 60, modelo_id=3)
    c.create_caracteristica(1, "RAM")
    c.add_valor(1, "16 GB")
    c.add_valor(1, "32 GB")
    c.create_cargo("Ejecutivo", NivelDotacion.PERMITIDO)
    c.upsert_dotacion(1, 1, NivelDotacion.OBLIGATORIO, None)
    c.upsert_dotacion(1, 2, NivelDotacion.NO_PERMITIDO, None)
    c.create_cargo("Desarrollador", NivelDotacion.OBLIGATORIO)
    c.upsert_dotacion(2, 1, NivelDotacion.OBLIGATORIO, 2)
    uow.usuarios.create("U-001", "Ana", "ana@empresa.com", 1, 1)
    uow.usuarios.create("U-002", "Beto", "beto@empresa.com", 2, 1)
    s = uow.seguridad
    s.create_rol(p.ROL_SUPERADMIN, None, [], es_sistema=True)
    s.create_rol("Analista Intelix", None, list(_ANALISTA))
    s.create_rol("Gerente de sistemas", None, list(_GERENTE))
    s.create_operador("admin.ti@empresa.com", "Admin TI", 1, "sistema")
    s.create_operador("analista@empresa.com", "Analista", 2, "sistema")
    s.create_operador("gerente@empresa.com", "Gerente", 3, "sistema")
    return uow
