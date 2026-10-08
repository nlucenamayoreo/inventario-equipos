# Inventario de Equipos TI — Grupo Mayoreo

Aplicación para inventariar los equipos de TI, saber a qué usuario está asignado cada uno y ver, por silo y por
departamento, qué equipos se tienen y cuáles faltan según el cargo de cada usuario.

| Ruta | Contenido |
|---|---|
| `frontend/` | Aplicación web (React + TypeScript + Vite). |
| `docs/ESPECIFICACION.md` | Reglas de negocio (fuente de verdad funcional). |
| `docs/API.md` | Contrato REST que debe implementar el backend. |
| `docs/INTEGRACION_GOOGLE_WORKSPACE.md` | Sincronización de usuarios con Google Workspace. |
| `db/` | Esquema PostgreSQL y catálogos base. |
| `prototipo/` | Maqueta aprobada (referencia de pantallas). |
| `CLAUDE.md` | Estándares de la organización y orden de trabajo. |

## Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 — modo demostración, sin backend
npm test           # reglas de negocio (simulador + cálculos)
npm run build      # typecheck + build de producción en dist/
```

### Modos de datos

| `VITE_API_MODE` / `API_MODE` | Comportamiento |
|---|---|
| `mock` (por defecto en desarrollo) | Simulador en el navegador con los datos de ejemplo del prototipo. Persiste en `localStorage`; botón «Restablecer datos» y selector de rol para probar `consulta`. |
| `http` | Consume la API REST de `docs/API.md` (`/api/...`). |

Para desarrollar contra un backend local: `VITE_API_MODE=http npm run dev` (Vite reenvía `/api` a
`API_PROXY_TARGET`, por defecto `http://localhost:3000`).

### Pantallas

- **Resumen**: filtros silo → departamento → búsqueda; indicadores (incluye desactivados y pendientes de recuperación);
  cobertura por silo y por departamento con semáforo; stock por tipo; matriz usuario × tipo.
- **Usuarios**: alta con vista previa de la dotación del cargo; listado con filtros; ficha con vacaciones
  (conserva / resguardo / préstamo), edición, desactivar/reactivar, baja lógica, equipos asignados y en préstamo,
  faltantes y asignación de disponibles permitidos por el cargo.
- **Activos**: alta de artículos y unidades (valida perfil del cargo), listado con filtros, liberar/recibir,
  cambio de estado (disponible / en reparación / de baja) e historial de movimientos.
- **Catálogos**: silos, departamentos, tipos, perfiles de dotación por cargo (nivel y artículo restringido) y artículos.

El rol `consulta` ve todo en solo lectura. Sin sesión (API responde `401`) se muestra «Ingresar con Google».

### Contenedor

```bash
cd frontend
docker build -t inventario-ti-frontend .
docker run -p 8080:8080 -e API_UPSTREAM=http://api:3000 inventario-ti-frontend
```

| Variable | Uso |
|---|---|
| `API_MODE` | `http` (defecto) o `mock` para una demo sin backend. |
| `API_UPSTREAM` | Si se define, nginx reenvía `/api/` a ese destino (mismo origen, sin CORS). Vacío = sin proxy. |
| `API_URL` | Base de la API cuando está en otro origen (p. ej. `https://api.inventario.example`). |
| `LOGIN_URL` | URL de inicio de sesión (por defecto `<API_URL>/api/auth/google`). |

La configuración se escribe en `/config.js` al arrancar, así la misma imagen sirve para sandbox, QA y PRD.
