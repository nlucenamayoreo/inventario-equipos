# PROJECT REPORT — Inventario de Equipos TI

**Estado: PROJECT COMPLETE**  
Generado: 2026-10-09T20:52:19+00:00 · Validación: 2026-10-09T20:52:15+00:00

## 1. Resumen

| Aspecto | Solución |
|---|---|
| Frontend | React vite + TypeScript, react-router · hosting amplify-static |
| API | API Gateway REST REGIONAL + 51 endpoints Lambda python3.13 (hexagonal) |
| Base de datos | Aurora PostgreSQL `may_dev_inventario_db` · 12 tablas, 3 vistas, 1 funciones |
| Auth | Amazon Cognito (grupos: admin_ti, consulta) |
| Requisitos | 17 en project-spec.yaml |
| Exposición | internal |

## 2. Criterios de finalización (16)

| # | Criterio | Estado |
|---|---|---|
| 1 | Especificación completa: project-spec con requisitos, modelo de datos fuente y esquema introspeccionado | OK |
| 2 | Manifest del proyecto revisado (sin borrador, endpoints y pantallas trazados a requisitos) | OK |
| 3 | Scripts Aurora completos por ambiente (provisioning, schema, validation, rollback, migration) | OK |
| 4 | SQL Aurora validado en PostgreSQL efímero (idempotente, TOTAL_FALTA=0, rollback limpio) | OK |
| 5 | Backend hexagonal: handlers y use cases existen; dependencias entre capas y SQL en su lugar | OK |
| 6 | Tests del backend en verde (unitarios con fakes e integración contra el esquema generado) | OK |
| 7 | Lint del backend limpio (ruff) | OK |
| 8 | Template SAM único y samconfig dev/qa/prod con tags y rutas por ambiente | OK |
| 9 | Template válido (cfn-lint y transformación SAM) | OK |
| 10 | IAM mínimo y resiliencia (sin wildcards salvo ENI; SQS con DLQ, reintentos, visibility e idempotencia) | OK |
| 11 | Frontend con arquitectura estándar (Page → Controller → Api → axiosApiGateway, naming y tamaños) | OK |
| 12 | Frontend compila, cumple Prettier y sus tests pasan | OK |
| 13 | Sin SDKs de BaaS ni accesos directos a datos desde el frontend (Supabase, Firebase) | OK |
| 14 | Sin secretos ni identificadores de ambiente hardcodeados | OK |
| 15 | Sin TODO/FIXME/pseudocódigo en el código generado | OK |
| 16 | Reporte final con matriz REQUISITO → DESTINO y solo pendientes de configuración | OK |

## 3. Matriz REQUISITO → DESTINO

### 3.1 Requisitos

| Requisito | Descripción | Endpoints | Use cases | Pantallas |
|---|---|---|---|---|
| RF-01 | Sesión y roles | GET /me → `SesionApi`<br>GET /sync-google/estado → `SesionApi` | `GetSessionUseCase`, `GetSyncGoogleStatusUseCase` | — |
| RF-02 | Silos y departamentos | GET /silos → `CatalogosApi`<br>POST /silos → `CatalogosApi`<br>GET /departamentos → `CatalogosApi`<br>POST /departamentos → `CatalogosApi` | `ListSilosUseCase`, `CreateSiloUseCase`, `ListDepartamentosUseCase`, `CreateDepartamentoUseCase` | `None` |
| RF-03 | Tipos de equipo y artículos | GET /tipos-equipo → `CatalogosApi`<br>POST /tipos-equipo → `CatalogosApi`<br>GET /articulos → `CatalogosApi`<br>POST /articulos → `CatalogosApi`<br>PATCH /tipos-equipo/{tipoId} → `CatalogosApi` | `ListTiposEquipoUseCase`, `CreateTipoEquipoUseCase`, `ListArticulosUseCase`, `CreateArticuloUseCase`, `UpdateTipoEquipoUseCase` | `None` |
| RF-04 | Cargos y perfil de dotación | GET /cargos → `CatalogosApi`<br>POST /cargos → `CatalogosApi`<br>PUT /cargos/{cargoId}/dotacion/{tipoId} → `CatalogosApi` | `ListCargosUseCase`, `CreateCargoUseCase`, `UpdateDotacionUseCase` | `None` |
| RF-05 | Colaboradores | GET /usuarios → `UsuariosApi`<br>POST /usuarios → `UsuariosApi`<br>PATCH /usuarios/{usuarioId} → `UsuariosApi` | `ListUsuariosUseCase`, `CreateUsuarioUseCase`, `UpdateUsuarioUseCase` | `None` |
| RF-06 | Vacaciones | POST /usuarios/{usuarioId}/vacaciones → `UsuariosApi`<br>POST /usuarios/{usuarioId}/vacaciones/finalizar → `UsuariosApi` | `RegisterVacacionesUseCase`, `FinishVacacionesUseCase` | `None` |
| RF-07 | Baja lógica y desactivación | DELETE /usuarios/{usuarioId} → `UsuariosApi`<br>POST /usuarios/{usuarioId}/desactivar → `UsuariosApi`<br>POST /usuarios/{usuarioId}/reactivar → `UsuariosApi` | `DeleteUsuarioUseCase`, `DeactivateUsuarioUseCase`, `ReactivateUsuarioUseCase` | `None` |
| RF-08 | Registro de activos | GET /activos → `ActivosApi`<br>POST /activos → `ActivosApi` | `ListActivosUseCase`, `CreateActivoUseCase` | `None` |
| RF-09 | Asignación, liberación y estados | POST /activos/{activoId}/asignar → `ActivosApi`<br>POST /activos/{activoId}/liberar → `ActivosApi`<br>POST /activos/{activoId}/estado → `ActivosApi` | `AssignActivoUseCase`, `ReleaseActivoUseCase`, `ChangeActivoEstadoUseCase` | `None`, `None` |
| RF-10 | Historial de movimientos | GET /activos/{activoId}/movimientos → `ActivosApi` | `ListMovimientosUseCase` | `None` |
| RF-11 | Resumen de cobertura | GET /silos → `CatalogosApi`<br>GET /departamentos → `CatalogosApi`<br>GET /tipos-equipo → `CatalogosApi`<br>GET /articulos → `CatalogosApi`<br>GET /cargos → `CatalogosApi`<br>GET /usuarios → `UsuariosApi`<br>GET /activos → `ActivosApi` | `ListSilosUseCase`, `ListDepartamentosUseCase`, `ListTiposEquipoUseCase`, `ListArticulosUseCase`, `ListCargosUseCase`, `ListUsuariosUseCase`, `ListActivosUseCase` | `None` |
| RF-12 | Roles y personas con acceso | GET /permisos → `SeguridadApi`<br>GET /roles → `SeguridadApi`<br>POST /roles → `SeguridadApi`<br>PATCH /roles/{rolId} → `SeguridadApi`<br>GET /operadores → `SeguridadApi`<br>POST /operadores → `SeguridadApi`<br>PATCH /operadores/{operadorId} → `SeguridadApi` | `ListPermisosUseCase`, `ListRolesUseCase`, `CreateRolUseCase`, `UpdateRolUseCase`, `ListOperadoresUseCase`, `InviteOperadorUseCase`, `UpdateOperadorUseCase` | `None` |
| RF-13 | Responsable de resguardo | DELETE /usuarios/{usuarioId} → `UsuariosApi`<br>POST /usuarios/{usuarioId}/vacaciones → `UsuariosApi`<br>POST /usuarios/{usuarioId}/vacaciones/finalizar → `UsuariosApi`<br>POST /usuarios/{usuarioId}/desactivar → `UsuariosApi`<br>POST /usuarios/{usuarioId}/reactivar → `UsuariosApi`<br>POST /activos → `ActivosApi`<br>POST /activos/{activoId}/asignar → `ActivosApi`<br>POST /activos/{activoId}/liberar → `ActivosApi`<br>POST /activos/{activoId}/estado → `ActivosApi`<br>GET /operadores → `SeguridadApi` | `DeleteUsuarioUseCase`, `RegisterVacacionesUseCase`, `FinishVacacionesUseCase`, `DeactivateUsuarioUseCase`, `ReactivateUsuarioUseCase`, `CreateActivoUseCase`, `AssignActivoUseCase`, `ReleaseActivoUseCase`, `ChangeActivoEstadoUseCase`, `ListOperadoresUseCase` | `None`, `None` |
| RF-14 | Límite de equipos por persona | POST /activos → `ActivosApi`<br>POST /activos/{activoId}/asignar → `ActivosApi`<br>POST /activos/{activoId}/liberar → `ActivosApi`<br>POST /activos/{activoId}/estado → `ActivosApi`<br>PATCH /tipos-equipo/{tipoId} → `CatalogosApi` | `CreateActivoUseCase`, `AssignActivoUseCase`, `ReleaseActivoUseCase`, `ChangeActivoEstadoUseCase`, `UpdateTipoEquipoUseCase` | `None`, `None` |
| RF-15 | Aprobación de reasignaciones | GET /reasignaciones → `ReasignacionesApi`<br>POST /reasignaciones → `ReasignacionesApi`<br>POST /reasignaciones/{reasignacionId}/aprobar → `ReasignacionesApi`<br>POST /reasignaciones/{reasignacionId}/rechazar → `ReasignacionesApi`<br>POST /reasignaciones/{reasignacionId}/cancelar → `ReasignacionesApi` | `ListReasignacionesUseCase`, `RequestReasignacionUseCase`, `ApproveReasignacionUseCase`, `RejectReasignacionUseCase`, `CancelReasignacionUseCase` | `None`, `None` |
| RF-16 | Cargas masivas con machote | POST /importaciones/usuarios → `ImportacionesApi`<br>POST /importaciones/activos → `ImportacionesApi` | `ImportUsuariosUseCase`, `ImportActivosUseCase` | `None`, `None` |
| RF-17 | Marcas, modelos y características | POST /articulos → `CatalogosApi`<br>GET /marcas → `CatalogosApi`<br>POST /marcas → `CatalogosApi`<br>PATCH /marcas/{marcaId} → `CatalogosApi`<br>GET /modelos → `CatalogosApi`<br>POST /modelos → `CatalogosApi`<br>PATCH /modelos/{modeloId} → `CatalogosApi`<br>GET /caracteristicas → `CatalogosApi`<br>POST /caracteristicas → `CatalogosApi`<br>PATCH /caracteristicas/{caracteristicaId} → `CatalogosApi` | `CreateArticuloUseCase`, `ListMarcasUseCase`, `CreateMarcaUseCase`, `UpdateMarcaUseCase`, `ListModelosUseCase`, `CreateModeloUseCase`, `UpdateModeloUseCase`, `ListCaracteristicasUseCase`, `CreateCaracteristicaUseCase`, `UpdateCaracteristicaUseCase` | `None` |

### 3.2 Endpoints

| Método | Ruta | Función Lambda | Handler | Auth |
|---|---|---|---|---|
| GET | /me | SesionApi | entrypoints.lambda_handlers.sesion.handler | cognito |
| GET | /sync-google/estado | SesionApi | entrypoints.lambda_handlers.sesion.handler | cognito |
| GET | /silos | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| POST | /silos | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| GET | /departamentos | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| POST | /departamentos | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| GET | /tipos-equipo | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| POST | /tipos-equipo | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| GET | /articulos | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| POST | /articulos | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| GET | /cargos | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| POST | /cargos | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| PUT | /cargos/{cargoId}/dotacion/{tipoId} | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| GET | /usuarios | UsuariosApi | entrypoints.lambda_handlers.usuarios.handler | cognito |
| POST | /usuarios | UsuariosApi | entrypoints.lambda_handlers.usuarios.handler | cognito |
| PATCH | /usuarios/{usuarioId} | UsuariosApi | entrypoints.lambda_handlers.usuarios.handler | cognito |
| DELETE | /usuarios/{usuarioId} | UsuariosApi | entrypoints.lambda_handlers.usuarios.handler | cognito |
| POST | /usuarios/{usuarioId}/vacaciones | UsuariosApi | entrypoints.lambda_handlers.usuarios.handler | cognito |
| POST | /usuarios/{usuarioId}/vacaciones/finalizar | UsuariosApi | entrypoints.lambda_handlers.usuarios.handler | cognito |
| POST | /usuarios/{usuarioId}/desactivar | UsuariosApi | entrypoints.lambda_handlers.usuarios.handler | cognito |
| POST | /usuarios/{usuarioId}/reactivar | UsuariosApi | entrypoints.lambda_handlers.usuarios.handler | cognito |
| GET | /activos | ActivosApi | entrypoints.lambda_handlers.activos.handler | cognito |
| POST | /activos | ActivosApi | entrypoints.lambda_handlers.activos.handler | cognito |
| POST | /activos/{activoId}/asignar | ActivosApi | entrypoints.lambda_handlers.activos.handler | cognito |
| POST | /activos/{activoId}/liberar | ActivosApi | entrypoints.lambda_handlers.activos.handler | cognito |
| POST | /activos/{activoId}/estado | ActivosApi | entrypoints.lambda_handlers.activos.handler | cognito |
| GET | /activos/{activoId}/movimientos | ActivosApi | entrypoints.lambda_handlers.activos.handler | cognito |
| PATCH | /tipos-equipo/{tipoId} | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| GET | /marcas | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| POST | /marcas | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| PATCH | /marcas/{marcaId} | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| GET | /modelos | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| POST | /modelos | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| PATCH | /modelos/{modeloId} | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| GET | /caracteristicas | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| POST | /caracteristicas | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| PATCH | /caracteristicas/{caracteristicaId} | CatalogosApi | entrypoints.lambda_handlers.catalogos.handler | cognito |
| GET | /permisos | SeguridadApi | entrypoints.lambda_handlers.seguridad.handler | cognito |
| GET | /roles | SeguridadApi | entrypoints.lambda_handlers.seguridad.handler | cognito |
| POST | /roles | SeguridadApi | entrypoints.lambda_handlers.seguridad.handler | cognito |
| PATCH | /roles/{rolId} | SeguridadApi | entrypoints.lambda_handlers.seguridad.handler | cognito |
| GET | /operadores | SeguridadApi | entrypoints.lambda_handlers.seguridad.handler | cognito |
| POST | /operadores | SeguridadApi | entrypoints.lambda_handlers.seguridad.handler | cognito |
| PATCH | /operadores/{operadorId} | SeguridadApi | entrypoints.lambda_handlers.seguridad.handler | cognito |
| GET | /reasignaciones | ReasignacionesApi | entrypoints.lambda_handlers.reasignaciones.handler | cognito |
| POST | /reasignaciones | ReasignacionesApi | entrypoints.lambda_handlers.reasignaciones.handler | cognito |
| POST | /reasignaciones/{reasignacionId}/aprobar | ReasignacionesApi | entrypoints.lambda_handlers.reasignaciones.handler | cognito |
| POST | /reasignaciones/{reasignacionId}/rechazar | ReasignacionesApi | entrypoints.lambda_handlers.reasignaciones.handler | cognito |
| POST | /reasignaciones/{reasignacionId}/cancelar | ReasignacionesApi | entrypoints.lambda_handlers.reasignaciones.handler | cognito |
| POST | /importaciones/usuarios | ImportacionesApi | entrypoints.lambda_handlers.importaciones.handler | cognito |
| POST | /importaciones/activos | ImportacionesApi | entrypoints.lambda_handlers.importaciones.handler | cognito |

### 3.3 Objetos de base de datos

| Origen | Aurora | Tipo |
|---|---|---|
| public.activo | may_dev_inventario_sch_core.tbl_activo | table |
| public.activo_id_seq | may_dev_inventario_sch_core.seq_activo_id | sequence |
| public.activo_movimiento | may_dev_inventario_sch_core.tbl_activo_movimiento | table |
| public.activo_movimiento_id_seq | may_dev_inventario_sch_core.seq_activo_movimiento_id | sequence |
| public.articulo | may_dev_inventario_sch_core.tbl_articulo | table |
| public.articulo_id_seq | may_dev_inventario_sch_core.seq_articulo_id | sequence |
| public.cargo | may_dev_inventario_sch_core.tbl_cargo | table |
| public.cargo_alias_google | may_dev_inventario_sch_core.tbl_cargo_alias_google | table |
| public.cargo_dotacion | may_dev_inventario_sch_core.tbl_cargo_dotacion | table |
| public.cargo_id_seq | may_dev_inventario_sch_core.seq_cargo_id | sequence |
| public.cobertura_departamento | may_dev_inventario_sch_core.vw_cobertura_departamento | view |
| public.departamento | may_dev_inventario_sch_core.tbl_departamento | table |
| public.departamento_id_seq | may_dev_inventario_sch_core.seq_departamento_id | sequence |
| public.faltantes | may_dev_inventario_sch_core.vw_faltantes | view |
| public.silo | may_dev_inventario_sch_core.tbl_silo | table |
| public.silo_id_seq | may_dev_inventario_sch_core.seq_silo_id | sequence |
| public.sync_google_log | may_dev_inventario_sch_core.tbl_sync_google_log | table |
| public.sync_google_log_id_seq | may_dev_inventario_sch_core.seq_sync_google_log_id | sequence |
| public.tenencia | may_dev_inventario_sch_core.vw_tenencia | view |
| public.tipo_equipo | may_dev_inventario_sch_core.tbl_tipo_equipo | table |
| public.tipo_equipo_id_seq | may_dev_inventario_sch_core.seq_tipo_equipo_id | sequence |
| public.usuario | may_dev_inventario_sch_core.tbl_usuario | table |
| public.usuario_id_seq | may_dev_inventario_sch_core.seq_usuario_id | sequence |
| public.vacacion | may_dev_inventario_sch_core.tbl_vacacion | table |
| public.vacacion_id_seq | may_dev_inventario_sch_core.seq_vacacion_id | sequence |
| auth.users | may_dev_inventario_sch_core.tbl_app_users | table |
| public.puede_recibir | may_dev_inventario_sch_core.fn_puede_recibir | function |
| auth.uid() | fn_auth_uid() | auth helper |
| auth.role() | fn_auth_role() | auth helper |
| auth.email() | fn_auth_email() | auth helper |
| auth.jwt() | fn_auth_jwt() | auth helper |

Roles: `ro_inventario`, `rw_inventario`, `ddl_inventario`, `admin_inventario` · Usuarios: `usr_inventario_report`, `usr_inventario_app`, `usr_inventario_deploy`, `usr_inventario_dba` · search_path: `may_dev_inventario_sch_core`

### 3.4 Reglas de autorización

| Tabla | Regla | Comando | Condición | Se aplica en |
|---|---|---|---|---|
| * | Permisos por rol configurable (tbl_rol_permiso); el grupo admin_ti y el rol Superadministrador tienen todos; sin operador solo lectura | INSERT/UPDATE/DELETE |  | application.use_cases.common.require(principal, permiso) en cada caso de uso de escritura; el principal se completa en ResolveOperadorUseCase |

### 3.5 Servicios

| Origen | Destino |
|---|---|
| Supabase Auth | Amazon Cognito User Pool + authorizer de API Gateway |

## 4. Cambios estructurales, incompatibilidades y riesgos

**Cambios estructurales:** 
- Endpoints agrupados en una Lambda por módulo (sesion, catalogos, usuarios, activos) con despacho por ruta: 10 usuarios sin concurrencia, menos arranques en frío.
- Contrato REST de docs/API.md sin el prefijo /api: la URL base es la del stage de API Gateway (VITE_API_BASE_URL).
- Errores en el formato estándar {error: {code, title, message, details}}; las reglas de negocio responden 422.
- Roles y permisos en la base (tbl_rol, tbl_rol_permiso, tbl_operador) en lugar de grupos de Cognito: se administran desde la aplicación; Cognito solo autentica e invita.
- Cargas masivas: el navegador lee el machote .xlsx y envía las filas en JSON; el backend valida fila por fila (savepoint) y aplica todo o nada.

**Incompatibilidades:** ninguno.

**Riesgos:** 
- Sincronización con Google Workspace (docs/INTEGRACION_GOOGLE_WORKSPACE.md) pendiente: el estado se lee de sync_google_log pero el job aún no existe.

## 5. Pendientes (solo configuración de ambiente)

- **dev** — crear parámetros SSM: `/dev/inventario/network/subnets` (VpcSubnetIds), `/dev/inventario/network/lambda-sg` (LambdaSecurityGroupId), `/dev/inventario/db/proxy-endpoint` (DbProxyEndpoint), `/dev/inventario/frontend/origin` (AllowedOrigins)
- **dev** — crear el secreto de Secrets Manager `/dev/inventario/db/app` con `username`/`password` del usuario `usr_<app>_app`
- **qa** — crear parámetros SSM: `/qa/inventario/network/subnets` (VpcSubnetIds), `/qa/inventario/network/lambda-sg` (LambdaSecurityGroupId), `/qa/inventario/db/proxy-endpoint` (DbProxyEndpoint), `/qa/inventario/frontend/origin` (AllowedOrigins)
- **qa** — crear el secreto de Secrets Manager `/qa/inventario/db/app` con `username`/`password` del usuario `usr_<app>_app`
- **prod** — crear parámetros SSM: `/prod/inventario/network/subnets` (VpcSubnetIds), `/prod/inventario/network/lambda-sg` (LambdaSecurityGroupId), `/prod/inventario/db/proxy-endpoint` (DbProxyEndpoint), `/prod/inventario/frontend/origin` (AllowedOrigins)
- **prod** — crear el secreto de Secrets Manager `/prod/inventario/db/app` con `username`/`password` del usuario `usr_<app>_app`
- Frontend — variables por ambiente en Amplify/pipeline: `VITE_API_BASE_URL`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID` (salidas del stack SAM)
- Base de datos — ejecutar provisioning con las 4 contraseñas por variable de psql (`-v pass_ro=... -v pass_rw=... -v pass_ddl=... -v pass_admin=...`), nunca en archivos
- Usuarios — crear los usuarios iniciales en Cognito y asignarlos a sus grupos (admin_ti, consulta)
- Amplify — regla de reescritura SPA: origen `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>` → `/index.html` (200)
- Opcional — `AlarmTopicArn` (SNS) en parameter_overrides para recibir las alarmas

## 6. Validaciones ejecutadas

| Criterio | Verificación | Estado | Detalle |
|---|---|---|---|
| C1 | project-spec.yaml con requisitos identificados | OK | 17 requisitos |
| C1 | Modelo de datos fuente aplicado e introspeccionado | OK |  |
| C2 | Manifest completo | OK |  |
| C2 | Cada regla de autorización tiene dónde se aplica (enforced_in) | OK |  |
| C2 | Cada requisito tiene endpoints o pantallas | OK |  |
| C2 | Sin errores pendientes declarados en el manifest | OK |  |
| C3 | Scripts Aurora por ambiente (dev, qa, prd) | OK |  |
| C3 | Objetos sin equivalente en Aurora documentados | OK |  |
| C4 | SQL en PostgreSQL efímero (idempotencia, validación, rollback) | OK | dev: PASSED; qa: PASSED; prd: PASSED |
| C8 | Un único template SAM parametrizado | OK |  |
| C8 | Template conforme al estándar (parámetros, runtime, logs) | OK |  |
| C5 | Estructura hexagonal del backend | OK |  |
| C5 | Handlers del manifest y del template implementados | OK | 7 handlers |
| C5 | Use cases del manifest implementados | OK | 51 use cases |
| C5 | Dependencias entre capas y handlers delgados | OK |  |
| C5 | SQL solo en adapters y con nombres de Aurora | OK |  |
| C6 | pytest (unitarios con fakes) | OK | 65 passed, 3 skipped in 0.29s |
| C6 | Cada módulo del manifest tiene tests unitarios | OK |  |
| C6 | pytest de integración contra el esquema generado (PG efímero) | OK | 4 passed in 0.41s |
| C7 | ruff check | OK |  |
| C8 | samconfig.toml dev/qa/prod con tags y rutas por ambiente | OK |  |
| C9 | cfn-lint | OK |  |
| C9 | Transformación SAM | OK | 82 recursos CloudFormation |
| C10 | IAM sin comodines (salvo ENI documentado) | OK |  |
| C10 | Colas SQS con los 4 controles del estándar | OK | sin colas (no aplica) |
| C11 | Capa compartida (gateway HTTP, auth, env) | OK |  |
| C11 | HTTP solo vía axiosApiGateway | OK |  |
| C11 | Módulos src/views con Page → Controller → Api | OK |  |
| C11 | Naming kebab-case (-page, use-*-controller, -api) | OK |  |
| C11 | Límites de tamaño de pages y secciones | OK |  |
| C11 | Componentes fuera de views/ ≤ 250 líneas | OK |  |
| C11 | Variables por ambiente y hosting | OK |  |
| C12 | Instalación y build del frontend | OK | install + build |
| C12 | Prettier | OK |  |
| C12 | Tests del frontend | OK |  |
| C13 | Cero referencias a Supabase en frontend y backend | OK |  |
| C14 | Sin secretos en código ni configuración | OK |  |
| C14 | Sin IDs/ARNs/endpoints de AWS hardcodeados | OK |  |
| C15 | Sin TODO/FIXME/pseudocódigo | OK |  |

## 7. Despliegue

```bash
# 1. Base de datos (por ambiente; desde database/ o database/environments/<amb>/)
psql "$ADMIN_URL/postgres" -v pass_ro=*** -v pass_rw=*** -v pass_ddl=*** -v pass_admin=*** \
     -f aurora_postgresql_provisioning.sql
psql "$ADMIN_URL/may_dev_inventario_db" -f aurora_postgresql_schema.sql
psql "$ADMIN_URL/may_dev_inventario_db" -f aurora_postgresql_data.sql             # datos del origen (re-ejecutable)
psql "$ADMIN_URL/may_dev_inventario_db" -At -f aurora_postgresql_validation.sql   # TOTAL_FALTA debe ser 0
# 2. Backend
cd backend && sam build && sam deploy --config-env dev   # qa / prod
# 3. Frontend: configurar variables por rama en Amplify (o build del Dockerfile) y desplegar
```

