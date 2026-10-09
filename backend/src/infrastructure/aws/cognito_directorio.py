"""Directorio de identidad sobre Amazon Cognito: invita a una persona (contraseña temporal por correo)."""

from __future__ import annotations

from functools import lru_cache

import boto3

from application.ports.seguridad import DirectorioIdentidad
from domain.exceptions import BusinessRuleViolation


@lru_cache(maxsize=1)
def _client():
    return boto3.client("cognito-idp")


def pool_de_emisor(emisor: str | None) -> str:
    """El User Pool sale del ``iss`` del token (https://cognito-idp.<región>.amazonaws.com/<pool>)."""
    if not emisor or "cognito-idp." not in emisor:
        raise BusinessRuleViolation("No se pudo identificar el directorio de usuarios del token.")
    return emisor.rstrip("/").rsplit("/", 1)[-1]


class CognitoDirectorio(DirectorioIdentidad):
    def invitar(self, correo: str, nombre: str, emisor: str | None) -> None:
        pool = pool_de_emisor(emisor)
        client = _client()
        try:
            client.admin_create_user(
                UserPoolId=pool,
                Username=correo,
                DesiredDeliveryMediums=["EMAIL"],
                UserAttributes=[
                    {"Name": "email", "Value": correo},
                    {"Name": "email_verified", "Value": "true"},
                    {"Name": "name", "Value": nombre},
                ],
            )
        except client.exceptions.UsernameExistsException:
            return
