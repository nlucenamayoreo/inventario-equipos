"""Módulo sesion: rol y permisos efectivos del operador y estado de la sincronización."""

from application.dto.principal import Principal
from application.use_cases.seguridad import ResolveOperadorUseCase
from application.use_cases.sesion import GetSessionUseCase, GetSyncGoogleStatusUseCase
from domain.entities.seguridad import ACTIVOS_ASIGNAR, SEGURIDAD
from fakes.escenario import ANALISTA, CONSULTA, escenario


def test_superadmin_por_grupo_se_registra_como_operador():
    uow = escenario()
    nuevo = Principal(
        subject="s", email="Jefe@empresa.com", groups=frozenset({"admin_ti"}), claims={"name": "Jefe"}
    )
    resuelto = ResolveOperadorUseCase(uow.factory).execute(nuevo)
    assert resuelto.superadmin and resuelto.operador_id == 4 and resuelto.puede(SEGURIDAD)
    sesion = GetSessionUseCase(uow.factory).execute(resuelto)
    assert sesion["rol"] == "Superadministrador" and len(sesion["permisos"]) == 8


def test_permisos_segun_rol_y_visitante():
    uow = escenario()
    analista = ResolveOperadorUseCase(uow.factory).execute(
        Principal(subject="a", email="ANALISTA@empresa.com")
    )
    assert analista.operador_id == 2 and analista.puede(ACTIVOS_ASIGNAR) and not analista.puede(SEGURIDAD)
    assert GetSessionUseCase(uow.factory).execute(ANALISTA)["rol"] == "Analista Intelix"
    visitante = ResolveOperadorUseCase(uow.factory).execute(
        Principal(subject="s", email="x@empresa.com", claims={"name": "Equis"})
    )
    assert GetSessionUseCase(uow.factory).execute(visitante) == {
        "correo": "x@empresa.com",
        "nombre": "Equis",
        "rol": "Visitante",
        "operadorId": None,
        "superadmin": False,
        "activo": True,
        "permisos": [],
    }


def test_operador_desactivado_no_tiene_permisos():
    uow = escenario()
    uow.seguridad.update_operador(2, "Analista", 2, False)
    analista = ResolveOperadorUseCase(uow.factory).execute(
        Principal(subject="a", email="analista@empresa.com")
    )
    assert not analista.puede(ACTIVOS_ASIGNAR)
    assert GetSessionUseCase(uow.factory).execute(analista)["permisos"] == []


def test_estado_sync():
    uow = escenario()
    assert GetSyncGoogleStatusUseCase(uow.factory).execute(CONSULTA) == {
        "ultimaExitosa": None,
        "ultimaCorrida": None,
    }
