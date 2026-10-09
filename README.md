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
cp .env.example .env.local   # URL de la API y Cognito (salidas del backend desplegado)
npm run dev                  # http://localhost:5173
npm test                     # cálculos del resumen y machotes
npm run build                # typecheck + build de producción en dist/
```

La aplicación siempre consume la API real (no hay modo demostración): para desarrollar local apunte
`VITE_API_BASE_URL` al stage de `dev`.

### Pantallas y permisos

Las pestañas y acciones dependen de los permisos del rol de cada persona (módulo **Seguridad**). Quien ingresa sin
estar registrado como persona con acceso ve todo en solo lectura (Visitante).

- **Resumen**: filtros silo → departamento → búsqueda; indicadores, cobertura con semáforo, stock y matriz usuario × tipo.
- **Usuarios**: alta, ficha con vacaciones (conserva / resguardo / préstamo), edición, desactivar/reactivar, baja lógica,
  equipos, faltantes, asignación de disponibles (respeta cargo y máximo por tipo) y solicitud de reasignación.
- **Activos**: alta (artículo por modelo y características), listado con responsable del resguardo, liberar/recibir y
  cambio de estado indicando quién queda a cargo, solicitud de reasignación e historial.
- **Reasignaciones**: solicitudes pendientes y su aprobación o rechazo por el gerente de sistemas.
- **Catálogos**: silos, departamentos, tipos (máximo por persona), marcas, modelos, características por tipo, artículos
  y perfiles de dotación por cargo.
- **Cargas masivas**: machotes Excel con listas desplegables para usuarios y activos; vista previa con errores por fila
  y aplicación todo o nada.
- **Seguridad**: roles con sus permisos e invitación de personas con acceso (Cognito envía la contraseña temporal).

### Contenedor

```bash
cd frontend
docker build -t inventario-ti-frontend .
docker run -p 8080:8080 -e API_BASE_URL=https://<api>/dev -e COGNITO_USER_POOL_ID=... \
  -e COGNITO_CLIENT_ID=... inventario-ti-frontend
```

| Variable | Uso |
|---|---|
| `API_BASE_URL` | URL de la API (o `/api` con `API_UPSTREAM`). |
| `API_UPSTREAM` | Si se define, nginx reenvía `/api/` a ese destino (mismo origen, sin CORS). Vacío = sin proxy. |
| `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` | User Pool y cliente de Cognito. |

La configuración se escribe en `/config.js` al arrancar, así la misma imagen sirve para sandbox, QA y PRD.
