# Contrato de la API REST — Inventario de Equipos TI

Contrato que consume el frontend (`frontend/src/api/http.ts`). Tipos exactos en `frontend/src/api/types.ts`.
El simulador `frontend/src/api/mock/mockApi.ts` implementa **las mismas reglas** y sirve como especificación
ejecutable: sus pruebas (`mockApi.test.ts`) describen el comportamiento que debe tener el backend.

## Convenciones

- Prefijo: `/api`. JSON en **camelCase**; ids numéricos; fechas `YYYY-MM-DD`; marcas de tiempo ISO 8601 (UTC).
- Autenticación: cookie de sesión (el frontend usa `credentials: 'include'`). Si la API está en otro origen,
  habilitar CORS con credenciales para el origen del frontend.
- Errores: código HTTP + cuerpo `{ "error": { "codigo": "serial_duplicado", "mensaje": "El serial X ya está registrado." } }`.
  El `mensaje` se muestra tal cual al usuario: **en español**.
  - `400` validación · `401` sin sesión (el frontend muestra la pantalla de ingreso) · `403` rol sin permiso
  - `404` no existe · `409` conflicto con una regla de negocio o duplicado
- Roles: `admin_ti` puede todo; `consulta` solo `GET` (cualquier otra operación → `403`).
- Toda transición de estado o de titular de un activo inserta una fila en `activo_movimiento`
  con `realizado_por` = correo del operador (o `sistema`) y el `motivo` indicado abajo. Cada mutación en una transacción.

## Sesión e integración

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/me` | `Sesion { correo, nombre, rol }` · `401` si no hay sesión |
| GET | `/auth/google?redirect=<url>` | Inicia el SSO de Google (dominio corporativo) y vuelve a `redirect` |
| GET | `/sync-google/estado` | `SyncGoogleEstado { ultimaExitosa, ultimaCorrida }` (de `sync_google_log`) |

## Catálogos

| Método | Ruta | Cuerpo | Reglas |
|---|---|---|---|
| GET | `/silos` | | |
| POST | `/silos` | `{ nombre }` | nombre único (sin mayúsculas) |
| GET | `/departamentos` | | |
| POST | `/departamentos` | `{ nombre, siloId }` | único por silo |
| GET | `/tipos-equipo` | | ordenados como deben mostrarse (columnas de la matriz) |
| POST | `/tipos-equipo` | `{ nombre }` | único; **no** se crean filas de dotación → queda `no_permitido` en todos los cargos |
| GET | `/articulos` | | |
| POST | `/articulos` | `{ tipoId, marca, modelo, especificaciones?, vidaUtilMeses? }` | no repite tipo+marca+modelo (sin mayúsculas); genera `codigo` `ART-001…` |
| GET | `/cargos` | | cada cargo incluye `dotacion: [{ tipoId, nivel, articuloRestringidoId }]` |
| POST | `/cargos` | `{ nombre }` | único; crea una fila `permitido` por cada tipo existente |
| PUT | `/cargos/:id/dotacion/:tipoId` | `{ nivel, articuloRestringidoId }` | upsert; el artículo debe ser del tipo; si `no_permitido` se guarda sin restricción. Devuelve el `Cargo` |

## Usuarios

`GET /usuarios` devuelve todos **menos** los `eliminado`, cada uno con `vacacion` = vacación abierta (`finalizada_en IS NULL`) o `null`.

| Método | Ruta | Cuerpo | Reglas / efecto | Motivo movimiento |
|---|---|---|---|---|
| POST | `/usuarios` | `{ codigo, nombre, correo?, cargoId, departamentoId }` | código único, correo único (minúsculas) y válido | — |
| PATCH | `/usuarios/:id` | campos parciales | mismas validaciones. Cambiar de cargo **no** libera equipos (quedan «fuera de perfil») | — |
| DELETE | `/usuarios/:id` | | Baja lógica (`estado = eliminado`). Sus activos con titular → `disponible`; activos que tenía en préstamo (`prestado_a`) → `en_resguardo`; vacaciones donde era suplente → acción `resguardo`, sin suplente; su vacación abierta se finaliza. Devuelve `{ liberados, prestamosDevueltosATi, vacacionesAjustadas }` | `baja_usuario` |
| POST | `/usuarios/:id/vacaciones` | `{ desde, hasta, accion, suplenteId?, nota? }` | usuario `activo`; `hasta ≥ desde`; `prestamo` exige suplente `activo` distinto. Activos `asignado` → `en_resguardo` (resguardo) o `prestamo` con `prestadoA` (préstamo). Usuario → `vacaciones` | `vacaciones` |
| POST | `/usuarios/:id/vacaciones/finalizar` | | usuario `vacaciones` → `activo`; activos `en_resguardo`/`prestamo` → `asignado`, sin `prestadoA` | `fin_vacaciones` |
| POST | `/usuarios/:id/desactivar` | | Desactivación manual (`fuente_desactivacion = 'manual'`). Activos con titular → `pendiente_recuperacion`; préstamos recibidos → `en_resguardo`; mismo ajuste de vacaciones que la baja | `desactivacion` |
| POST | `/usuarios/:id/reactivar` | | `desactivado` → `activo`. Los equipos siguen pendientes hasta que TI los reciba | — |

## Activos

| Método | Ruta | Cuerpo | Reglas / efecto | Motivo movimiento |
|---|---|---|---|---|
| GET | `/activos` | | todos (incluye `de_baja`) | |
| POST | `/activos` | `{ articuloId, serial, estado, usuarioId? }` | serial único sin mayúsculas; `estado` ∈ `disponible`, `en_reparacion`, `de_baja`. Con `usuarioId`: usuario no desactivado y `puede_recibir()` → queda `asignado` con fecha de hoy | `alta` |
| POST | `/activos/:id/asignar` | `{ usuarioId }` | activo `disponible`; usuario `activo`/`vacaciones`; `puede_recibir()` | `asignacion` |
| POST | `/activos/:id/liberar` | | activo con titular → `disponible`; limpia titular, `prestado_a` y fecha | `liberacion` (`recuperacion` si estaba `pendiente_recuperacion`) |
| POST | `/activos/:id/estado` | `{ estado }` | solo sin titular; `disponible` / `en_reparacion` / `de_baja` | `cambio_estado` |
| GET | `/activos/:id/movimientos` | | más reciente primero; incluye `usuarioAnteriorNombre` y `usuarioNuevoNombre` (también de usuarios eliminados) | |

## Indicadores

El Resumen (cobertura, faltantes, matriz, fuera de perfil) se calcula en el navegador a partir de los listados
anteriores (`frontend/src/domain/`), con las mismas definiciones que las vistas `v_tenencia`, `v_faltantes` y
`v_cobertura_departamento` de `db/schema.sql`. Si el volumen crece, pueden exponerse endpoints basados en esas vistas.

## Sincronización con Google Workspace

No tiene endpoint para el frontend salvo `/sync-google/estado`. El job (n8n o backend) aplica las reglas de
`docs/INTEGRACION_GOOGLE_WORKSPACE.md` con motivo `sync_google` y `realizado_por = 'sistema'`.
