"""Módulo sesion: rol según el grupo de Cognito y estado de la sincronización."""

from application.dto.principal import Principal
from application.use_cases.sesion import GetSessionUseCase, GetSyncGoogleStatusUseCase
from fakes.escenario import ADMIN, CONSULTA, escenario


def test_rol_por_grupo():
    assert GetSessionUseCase().execute(ADMIN)["rol"] == "admin_ti"
    assert GetSessionUseCase().execute(CONSULTA)["rol"] == "consulta"
    sin_grupo = Principal(subject="s", email="x@empresa.com", claims={"name": "Equis"})
    assert GetSessionUseCase().execute(sin_grupo) == {
        "correo": "x@empresa.com",
        "nombre": "Equis",
        "rol": "consulta",
    }


def test_estado_sync():
    uow = escenario()
    assert GetSyncGoogleStatusUseCase(uow.factory).execute(CONSULTA) == {
        "ultimaExitosa": None,
        "ultimaCorrida": None,
    }
