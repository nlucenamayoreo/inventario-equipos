# Inventario de Equipos TI — Grupo Mayoreo

Aplicación para inventariar los equipos de TI, saber a qué usuario está asignado cada uno y ver, por silo y por
departamento, qué equipos se tienen y cuáles faltan según el cargo de cada usuario.

## Cómo usar este paquete

| Ruta | Contenido |
|---|---|
| `docs/ESPECIFICACION.md` | Módulos, reglas de negocio, estados y validaciones. **Es la fuente de verdad funcional.** |
| `docs/INTEGRACION_GOOGLE_WORKSPACE.md` | Sincronización de usuarios con Google Workspace (alta, desactivación). |
| `db/schema.sql` | Modelo de datos PostgreSQL (tablas, restricciones, vistas de cobertura). |
| `db/seed_catalogos.sql` | Catálogos base (tipos de equipo). Sin datos de personas. |
| `docs/API.md` | Contrato REST que consume el frontend (endpoints, reglas, errores, motivos de movimiento). |
| `frontend/` | Frontend React + TypeScript terminado. `src/api/mock/mockApi.ts` es la especificación ejecutable del backend. |
| `prototipo/` | Maqueta funcional aprobada (formato Design Component `.dc.html`). Úsala como referencia de pantallas, textos y comportamiento; **no** como código a reutilizar. |

El prototipo `prototipo/Main.dc.html` contiene toda la lógica en la clase `Component` (métodos `createUser`,
`saveVac`, `endVac`, `doDelete`, `assignOne`, `permits`, `renderVals`…). Los otros tres `.dc.html` solo abren
`Main` en otra pestaña inicial. Los datos del prototipo son de ejemplo y viven en memoria.

## Stack y estándares de la organización

- Base de datos: **PostgreSQL** (estándar corporativo; Supabase no está dentro del estándar).
- Flujo de despliegue: prototipo con PostgreSQL → sandbox AWS (EC2/RDS) por el equipo RT → QA/PRD por Intelix.
  Mantén la app desplegable en contenedor y la configuración por variables de entorno.
- Frontend sugerido: React + TypeScript. Backend: API REST (Node/TypeScript) con migraciones versionadas.
  Si se elige otro stack, respeta el modelo de datos y las reglas de `docs/ESPECIFICACION.md`.
- Integraciones programadas: n8n (ya en uso en el grupo) o un job del backend.
- Toda la interfaz en **español**.

## Estándar visual

- Fondo blanco `#ffffff`, tipografía `Segoe UI` (13 px base), azul corporativo `#0093D0` como acento,
  bordes `#d4d9df`, radio 6 px.
- Botones primarios con texto blanco en `#00739F` (el `#0093D0` no alcanza contraste 4.5:1 con texto blanco).
- Semáforo: verde `#E3F4E8/#17663A`, ámbar `#FFF4D6/#7A4F00`, rojo `#FDE7E7/#A4262C`; nunca solo color: siempre texto.
- Morado `#EFE7F7/#5B2C83` para "fuera de perfil" y "préstamo".

## Orden de trabajo sugerido

1. Esquema de base de datos y migraciones (`db/schema.sql`).
2. API de catálogos: silos, departamentos, tipos, artículos, cargos con su dotación.
3. API de usuarios y activos, con las reglas de asignación, vacaciones y baja.
4. Pantallas: Resumen, Usuarios (con ficha), Activos, Catálogos — tal como el prototipo.
5. Historial de movimientos (auditoría) en cada cambio de estado de un activo.
6. Sincronización con Google Workspace.
7. Autenticación (Google SSO del dominio) y roles: `admin_ti` (todo), `consulta` (solo lectura).

## Criterios de aceptación clave

- No se puede asignar a un usuario un equipo que su cargo no permite (tipo "No permitido" o artículo distinto al restringido).
- Seriales únicos (sin distinguir mayúsculas/minúsculas).
- "Faltantes" y cobertura cuentan solo los tipos **obligatorios** del cargo.
- Toda transición de estado de un activo queda registrada en `activo_movimiento`.
- Un usuario desactivado en Google Workspace queda "Desactivado" y sus equipos pasan a "Pendiente de recuperación".
