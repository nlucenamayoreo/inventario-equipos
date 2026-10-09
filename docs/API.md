# Contrato de la API REST — Inventario de Equipos TI

Contrato que consume el frontend (`frontend/src/shared/api/http-client.ts`). Tipos exactos en
`frontend/src/shared/api/types.ts`. Lo implementa el backend Python (`backend/src`, una Lambda por módulo).

## Convenciones

- URL base: la del stage de API Gateway (`VITE_API_BASE_URL` / `API_BASE_URL`), sin prefijo `/api`.
- JSON en **camelCase**; ids numéricos; fechas `YYYY-MM-DD`; marcas de tiempo ISO 8601 (UTC).
- Autenticación: token de Cognito (`Authorization: Bearer <id token>`). Sin token → `401` y el frontend muestra el ingreso.
- Errores: `{ "error": { "code", "title", "message", "details" } }`. El `message` se muestra tal cual: **en español**.
  - `400` validación · `401` sin sesión · `403` el rol no tiene el permiso · `404` no existe
  - `409` duplicado · `422` regla de negocio (p. ej. `limite_por_tipo`, `no_permitido`)
- Toda transición de estado, titular o responsable del resguardo de un activo inserta una fila en `tbl_activo_movimiento`
  con `realizado_por` = correo del operador (o `sistema`) y el `motivo` indicado abajo. Cada operación es una transacción.

## Permisos y roles

Los roles se crean en la aplicación (módulo Seguridad) y agrupan permisos. Los `GET` están abiertos a toda cuenta
autenticada; las operaciones de escritura exigen el permiso indicado:

| Permiso | Permite |
|---|---|
| `catalogos.gestionar` | silos, departamentos, tipos (incluye máximo por persona), cargos y dotación |
| `articulos.gestionar` | marcas, modelos, características y artículos (también crearlos desde la carga masiva) |
| `usuarios.gestionar` | alta, edición, vacaciones, desactivar/reactivar, baja; carga masiva de usuarios |
| `activos.registrar` | alta de activos; carga masiva de activos |
| `activos.asignar` | asignar disponibles, liberar/recibir, cambiar estado |
| `reasignaciones.solicitar` | solicitar que un equipo pase de una persona a otra |
| `reasignaciones.aprobar` | aprobar o rechazar reasignaciones (gerente de sistemas) |
| `seguridad.gestionar` | roles y personas con acceso |

- **Superadministrador**: rol del sistema con todos los permisos; también lo es toda cuenta del grupo de Cognito `admin_ti`
  (se registra sola como persona con acceso la primera vez que ingresa).
- **Persona con acceso (operador)**: cuenta registrada en `tbl_operador` con un rol. Puede quedar como responsable del resguardo.
- Cuenta autenticada que no es operador: **Visitante** (solo lectura). Operador desactivado: sin permisos.

## Sesión e integración

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/me` | `Sesion { correo, nombre, rol, operadorId, superadmin, activo, permisos[] }` |
| GET | `/sync-google/estado` | `SyncGoogleEstado { ultimaExitosa, ultimaCorrida }` (de `sync_google_log`) |

## Catálogos

| Método | Ruta | Cuerpo | Reglas |
|---|---|---|---|
| GET/POST | `/silos` | `{ nombre }` | nombre único (sin mayúsculas) |
| GET/POST | `/departamentos` | `{ nombre, siloId }` | único por silo |
| GET/POST | `/tipos-equipo` | `{ nombre }` | único; queda `no_permitido` en todos los cargos. Cada tipo trae `maxPorUsuario` |
| PATCH | `/tipos-equipo/:id` | `{ nombre?, maxPorUsuario? }` | máximo por persona entre 1 y 20 (sin configurar: Laptop 2, demás 1) |
| GET/POST | `/marcas` | `{ nombre }` | única |
| PATCH | `/marcas/:id` | `{ nombre?, activo? }` | |
| GET/POST | `/modelos` | `{ marcaId, tipoId, nombre }` | único por marca + tipo |
| PATCH | `/modelos/:id` | `{ nombre?, activo? }` | |
| GET/POST | `/caracteristicas` | `{ tipoId, nombre, valores[] }` | por tipo de equipo (RAM, Disco…); trae `valores[{ id, valor, activo }]` |
| PATCH | `/caracteristicas/:id` | `{ nombre?, activo?, valores? }` | `valores` agrega (no borra los existentes) |
| GET | `/articulos` | | con `modeloId` y `caracteristicas[{ caracteristicaId, valorId }]` |
| POST | `/articulos` | `{ modeloId, especificaciones?, vidaUtilMeses?, caracteristicas? }` | tipo y marca salen del modelo; un artículo por modelo; valores de características del mismo tipo; genera `ART-001…` |
| GET/POST | `/cargos` | `{ nombre }` | único; crea una fila `permitido` por tipo |
| PUT | `/cargos/:id/dotacion/:tipoId` | `{ nivel, articuloRestringidoId }` | el artículo debe ser del tipo; `no_permitido` sin restricción |

## Usuarios (colaboradores)

`GET /usuarios` devuelve todos **menos** los `eliminado`, con `vacacion` abierta o `null`.

| Método | Ruta | Cuerpo | Reglas / efecto | Motivo |
|---|---|---|---|---|
| POST | `/usuarios` | `{ codigo, nombre, correo?, cargoId, departamentoId }` | código y correo únicos | — |
| PATCH | `/usuarios/:id` | campos parciales | cambiar de cargo **no** libera equipos («fuera de perfil») | — |
| DELETE | `/usuarios/:id?custodioId=` | | baja lógica: sus activos → `disponible` y préstamos recibidos → `en_resguardo`, a cargo de `custodioId` (por defecto, quien opera); ajusta vacaciones. Devuelve `{ liberados, prestamosDevueltosATi, vacacionesAjustadas }` | `baja_usuario` |
| POST | `/usuarios/:id/vacaciones` | `{ desde, hasta, accion, suplenteId?, nota?, custodioId? }` | `resguardo`: equipos → `en_resguardo` a cargo de `custodioId`; `prestamo`: al suplente, respetando su cargo y el máximo por tipo | `vacaciones` |
| POST | `/usuarios/:id/vacaciones/finalizar` | | equipos vuelven a `asignado` | `fin_vacaciones` |
| POST | `/usuarios/:id/desactivar` | `{ custodioId? }` | activos → `pendiente_recuperacion`; préstamos recibidos → `en_resguardo` a cargo de `custodioId` | `desactivacion` |
| POST | `/usuarios/:id/reactivar` | | `desactivado` → `activo` | — |

## Activos

Responsable del resguardo (`custodioId`): todo activo `disponible`, `en_resguardo` o `en_reparacion` tiene una persona con
acceso a cargo. Si no se indica, queda quien realiza la acción. Máximo por persona y tipo: cuentan los equipos de los que es
titular (asignado, resguardo, préstamo, pendiente) más los recibidos en préstamo.

| Método | Ruta | Cuerpo | Reglas / efecto | Motivo |
|---|---|---|---|---|
| GET | `/activos` | | todos (incluye `de_baja`), con `custodioId` | |
| POST | `/activos` | `{ articuloId, serial, estado, usuarioId?, custodioId? }` | serial único sin mayúsculas. Con `usuarioId`: persona vigente, cargo que lo permite y bajo el máximo → `asignado` | `alta` |
| POST | `/activos/:id/asignar` | `{ usuarioId }` | solo desde `disponible` (de persona a persona es una reasignación) | `asignacion` |
| POST | `/activos/:id/liberar` | `{ custodioId? }` | con titular → `disponible` a cargo de `custodioId`; bloqueado si hay reasignación pendiente | `liberacion` / `recuperacion` |
| POST | `/activos/:id/estado` | `{ estado, custodioId? }` | solo sin titular; `de_baja` no lleva responsable | `cambio_estado` |
| GET | `/activos/:id/movimientos` | | más reciente primero; nombres de titulares y de responsables del resguardo | |

## Reasignaciones (aprobación del gerente de sistemas)

| Método | Ruta | Cuerpo | Reglas / efecto |
|---|---|---|---|
| GET | `/reasignaciones?estado=` | | pendientes primero; `estado` ∈ `pendiente`, `aprobada`, `rechazada`, `cancelada` |
| POST | `/reasignaciones` | `{ activoId, usuarioDestino, motivo }` | equipo con titular (`asignado`, `en_resguardo`, `pendiente_recuperacion`), sin otra solicitud pendiente; destino vigente, cargo que lo permite y bajo el máximo |
| POST | `/reasignaciones/:id/aprobar` | `{ comentario? }` | no la aprueba quien la solicitó (salvo superadministrador); se revalida y el equipo pasa a `asignado` al destino (motivo `reasignacion`) |
| POST | `/reasignaciones/:id/rechazar` | `{ comentario }` | comentario obligatorio |
| POST | `/reasignaciones/:id/cancelar` | | quien la solicitó o quien puede aprobar |

## Seguridad

| Método | Ruta | Cuerpo | Reglas |
|---|---|---|---|
| GET | `/permisos` | | catálogo de permisos `{ codigo, modulo, descripcion }` |
| GET/POST | `/roles` | `{ nombre, descripcion?, permisos[] }` | nombre único |
| PATCH | `/roles/:id` | `{ nombre?, descripcion?, activo?, permisos? }` | el rol Superadministrador no se modifica |
| GET | `/operadores` | | personas con acceso (lo usan todas las vistas para elegir responsable) |
| POST | `/operadores` | `{ correo, nombre, rolId }` | crea la cuenta en Cognito (contraseña temporal por correo) y la registra con su rol |
| PATCH | `/operadores/:id` | `{ nombre?, rolId?, activo? }` | nadie cambia su propio rol ni se desactiva; solo un superadministrador gestiona superadministradores |

## Cargas masivas (machotes Excel)

El navegador lee el machote `.xlsx` (descargado desde la aplicación, con listas desplegables) y envía las filas en JSON.
`confirmar: false` = vista previa. Las filas se procesan en orden dentro de una transacción; si alguna falla no se aplica
ninguna. Máximo 1000 filas. Respuesta: `{ filas: [{ fila, ok, detalle }], errores, validas, aplicado }`.

| Método | Ruta | Columnas (`filas[]`) | Permiso |
|---|---|---|---|
| POST | `/importaciones/usuarios` | `codigo, nombre, correo, cargo, departamento, silo` | `usuarios.gestionar` |
| POST | `/importaciones/activos` | `tipo, marca, modelo, especificaciones, caracteristicas («RAM: 16 GB; Disco: 512 GB»), serial, estado (Disponible / En reparación / De baja), codigo_usuario, correo_custodio` | `activos.registrar` (crear marcas, modelos o artículos nuevos exige `articulos.gestionar`) |

## Indicadores

El Resumen (cobertura, faltantes, matriz, fuera de perfil) se calcula en el navegador a partir de los listados
(`frontend/src/shared/domain/`), con las mismas definiciones que las vistas de tenencia, faltantes y cobertura de la base.

## Sincronización con Google Workspace

No tiene endpoint para el frontend salvo `/sync-google/estado`. El job (n8n o backend) aplicará las reglas de
`docs/INTEGRACION_GOOGLE_WORKSPACE.md` con motivo `sync_google` y `realizado_por = 'sistema'`.
