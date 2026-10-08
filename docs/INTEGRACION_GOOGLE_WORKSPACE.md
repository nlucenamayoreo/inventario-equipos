# Integración con Google Workspace

Objetivo: cuando una cuenta se **suspende o elimina** en Google Workspace, el usuario queda `desactivado`
en la aplicación y sus equipos pasan a `pendiente_recuperacion`. Opcionalmente, crear usuarios nuevos automáticamente.

## Acceso (solo lectura)

1. Cuenta de servicio en Google Cloud.
2. Delegación de dominio en la consola de administración de Workspace (la hace un súper administrador) con los ámbitos:
   - `https://www.googleapis.com/auth/admin.directory.user.readonly`
   - `https://www.googleapis.com/auth/admin.reports.audit.readonly` (solo para la opción en tiempo real)
3. Impersonar a un administrador del dominio. Credenciales en un gestor de secretos, nunca en el repositorio.

## Opción A — Sincronización programada (base, obligatoria)

Cada 15–30 min (n8n o job del backend):

1. `GET admin/directory/v1/users?customer=my_customer&projection=full` paginando, con los campos
   `primaryEmail, name, suspended, archived, orgUnitPath, organizations(department,title)`.
2. Cruzar con `usuario.correo` (minúsculas).
3. Reglas:
   - Cuenta `suspended = true`, `archived = true` o ausente del directorio → usuario `desactivado`
     (`fuente_desactivacion = 'google'`, `desactivado_en = now()`), activos con titular → `pendiente_recuperacion`.
   - Cuenta activa y usuario `desactivado` por Google → vuelve a `activo` (los activos siguen pendientes hasta que TI decida).
   - (Opcional) Cuenta nueva no existente → crear usuario; mapear `organizations.title` a `cargo` mediante la tabla `cargo_alias_google`
     y `organizations.department` a `departamento`. Si no hay mapeo, crear con estado `activo` y marcar "pendiente de clasificar".
4. Registrar cada corrida en `sync_google_log` (inicio, fin, leídos, desactivados, reactivados, creados, errores).
5. Mostrar en la app la fecha de la última sincronización exitosa.

## Opción B — Casi tiempo real (complemento)

- `activities.watch` de la Reports API (aplicación `admin`) para eventos `SUSPEND_USER`, `DELETE_USER`, `UNSUSPEND_USER`.
- Google llama a un webhook HTTPS (n8n o endpoint del backend) que aplica las mismas reglas para ese correo.
- Los canales vencen: programar su renovación. La Opción A sigue corriendo como respaldo.

## Consideraciones

- Solo cubre casas cuyo correo esté en Workspace; el resto se gestiona manualmente u otra fuente.
- Si RRHH registra egresos antes que TI suspenda la cuenta, evaluar la nómina como disparador y Google como confirmación.
- Generar una alerta al responsable de TI con los equipos pendientes de recuperación de cada usuario desactivado.
