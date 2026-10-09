# Despliegue dev — INVENTARIO

Inicio: 2026-10-09T13:29:42+00:00 · fin: 2026-10-09T13:29:44+00:00

| Paso | Estado | Detalle |
|---|---|---|
| plataforma | DRY-RUN | deploy/build/dev/platform.yaml (52 recursos) |
| base de datos | DRY-RUN | deploy/build/dev/database.zip: aurora_postgresql_data.sql, aurora_postgresql_provisioning.sql, aurora_postgresql_schema.sql, aurora_postgresql_validation.sql |
| backend | DRY-RUN | backend-f78b987847bb5b9e.zip (5368 KB) · stack dev-inventario-api · 7 parámetros |
| frontend | DRY-RUN | npm run build (vite, variables VITE_*) → dist/ → Amplify |
| horario de servicio | DRY-RUN | start · warmup 04:45 · start 05:00 · stop 19:00 (America/Costa_Rica) |

Horario de servicio: 05:00–19:00 (America/Costa_Rica), arranque de la base 04:45. Fuera de ese horario las Lambdas quedan en concurrencia 0 y Aurora detenida.
