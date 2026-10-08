# Especificación funcional — Inventario de Equipos TI

## 1. Catálogos

- **Silo**: agrupación de departamentos (ej. Comercial, Operaciones, Corporativo).
- **Departamento**: pertenece a un silo.
- **Tipo de equipo**: Laptop, Monitor, Teclado, Mouse, Headset, Base laptop (ampliable).
- **Artículo**: modelo concreto de un tipo (tipo, marca, modelo, especificaciones, vida útil en meses).
  Se crea una vez; luego se registran sus unidades (activos) con serial. No se repite tipo+marca+modelo.
- **Cargo** y su **perfil de dotación**: para cada tipo de equipo, un nivel:
  - `obligatorio`: el usuario debe tenerlo (cuenta como faltante si no lo tiene).
  - `permitido` (se muestra "Opcional"): puede tenerlo; no cuenta como faltante.
  - `no_permitido`: no se le puede asignar.
  - Opcionalmente, un **artículo restringido** por tipo: solo ese artículo se puede asignar (ej. Desarrollador → laptop Precision).
  - Cargo nuevo: todos los tipos nacen `permitido`. Tipo nuevo: queda `no_permitido` en todos los cargos hasta configurarse.

## 2. Usuarios

Campos: código/cédula (único), nombre, correo (único; llave con Google Workspace), cargo, departamento, estado.

Estados:
- `activo`
- `vacaciones` (con periodo y acción sobre equipos)
- `desactivado` (detectado desde Google Workspace o manual)
- `eliminado` (baja lógica)

### 2.1 Crear
Obligatorios: código, nombre, cargo, departamento. Al elegir el cargo se muestra su dotación (obligatorio / opcional / no permitido).

### 2.2 Eliminar
- Pide confirmación indicando cuántos equipos se liberarán.
- Sus equipos pasan a `disponible` (se registra movimiento).
- Si tenía equipos recibidos en préstamo de otro usuario, esos pasan a `en_resguardo` (vuelven a TI).
- Si era suplente en las vacaciones de otro, esas vacaciones cambian a acción `resguardo`.
- **Implementar como baja lógica** (`estado = eliminado`) para conservar el historial; el prototipo borra físicamente solo por simplicidad.

### 2.3 Vacaciones
Formulario: desde, hasta (hasta ≥ desde), acción sobre equipos, suplente (si aplica), observación.

| Acción | Efecto sobre sus activos en estado `asignado` |
|---|---|
| `conserva` | Sin cambio. |
| `resguardo` | Pasan a `en_resguardo` (TI los custodia). |
| `prestamo` | Pasan a `prestamo` con `prestado_a = suplente` (el suplente debe estar activo). |

**Finalizar vacaciones**: el usuario vuelve a `activo`; sus activos en `en_resguardo` o `prestamo` vuelven a `asignado` y se limpia `prestado_a`.
Sugerido: job diario que avise de vacaciones cuya fecha "hasta" ya pasó sin finalizarse.

## 3. Activos (unidades con serial)

Campos: artículo, serial (único, sin distinguir mayúsculas), estado, titular (`usuario_id`), `prestado_a`, fecha de asignación.

Estados y significado:

| Estado | Titular | En uso por |
|---|---|---|
| `disponible` | — | — |
| `asignado` | usuario | el titular |
| `en_resguardo` | usuario | TI |
| `prestamo` | usuario | suplente (`prestado_a`) |
| `pendiente_recuperacion` | usuario desactivado | equipo por devolver |
| `en_reparacion` | — | — |
| `de_baja` | — | — |

Reglas:
- Registrar activo: obligatorio artículo y serial. Estado inicial `disponible`, `en_reparacion` o `de_baja`.
  Si se indica usuario al crear, queda `asignado` (validando el perfil del cargo).
- **Asignar** (desde la ficha del usuario): la ficha lista los activos `disponible` **permitidos por el cargo**,
  primero los de tipos que le faltan, con filtro por tipo e indicación de cuántos se ocultaron por el cargo.
- **Liberar**: cualquier activo con titular vuelve a `disponible`, limpia titular, `prestado_a` y fecha.
- **Fuera de perfil**: un activo cuyo titular tiene un cargo que no lo permite (p. ej. tras cambiar el perfil)
  se marca visualmente y se cuenta en el Resumen. No se libera automáticamente.
- Cada cambio de estado/titular genera un registro en `activo_movimiento` (quién, cuándo, de→a, motivo).

## 4. Resumen (pantalla principal)

Filtros: silo, departamento (dependiente del silo), búsqueda por nombre/código/cargo.

Indicadores:
- Equipos activos (todo menos `de_baja`), asignados, resguardo/préstamo, disponibles.
- Usuarios de vacaciones, usuarios con faltantes, equipos fuera de perfil.
- Agregar al integrar Google: usuarios desactivados y equipos pendientes de recuperación.

Bloques:
- **Cobertura por silo**: % = (tipos obligatorios cubiertos) / (tipos obligatorios exigidos) de sus usuarios.
- **Cobertura por departamento**: por tipo, "usuarios que lo tienen / usuarios cuyo cargo lo exige"; "—" si ningún cargo lo exige.
  Semáforo: 100 % verde, 50–99 % ámbar, < 50 % rojo.
- **Stock disponible por tipo**.
- **Matriz usuario × tipo**: serial si lo tiene (ámbar si está en resguardo/préstamo, morado si fuera de perfil),
  "Falta" (obligatorio sin equipo), "Opcional" (permitido sin equipo), "No aplica" (no permitido).

"Tener" un tipo = el usuario es titular de un activo de ese tipo en estado `asignado`, `en_resguardo` o `prestamo`.

## 5. Ficha del usuario

Datos, estado, banner de vacaciones (fechas y acción), acciones (registrar/finalizar vacaciones, eliminar),
dotación del cargo, equipos asignados (con estado y marca "fuera de perfil", botón liberar),
equipos recibidos en préstamo, lo que le falta, y la lista de disponibles para asignar.

## 6. Roles

- `admin_ti`: crea/edita catálogos, usuarios y activos; asigna y libera.
- `consulta`: solo lectura del Resumen y listados.
