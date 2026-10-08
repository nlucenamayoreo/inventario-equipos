-- Inventario de Equipos TI — PostgreSQL
CREATE SCHEMA IF NOT EXISTS inventario_ti;
SET search_path TO inventario_ti;

CREATE TYPE nivel_dotacion AS ENUM ('obligatorio', 'permitido', 'no_permitido');
CREATE TYPE estado_usuario AS ENUM ('activo', 'vacaciones', 'desactivado', 'eliminado');
CREATE TYPE estado_activo  AS ENUM ('disponible', 'asignado', 'en_resguardo', 'prestamo',
                                    'pendiente_recuperacion', 'en_reparacion', 'de_baja');
CREATE TYPE accion_vacacion AS ENUM ('conserva', 'resguardo', 'prestamo');

CREATE TABLE silo (
  id          serial PRIMARY KEY,
  nombre      text NOT NULL UNIQUE,
  activo      boolean NOT NULL DEFAULT true
);

CREATE TABLE departamento (
  id          serial PRIMARY KEY,
  silo_id     int NOT NULL REFERENCES silo(id),
  nombre      text NOT NULL,
  activo      boolean NOT NULL DEFAULT true,
  UNIQUE (silo_id, nombre)
);

CREATE TABLE tipo_equipo (
  id          serial PRIMARY KEY,
  nombre      text NOT NULL,
  activo      boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX ux_tipo_equipo_nombre ON tipo_equipo (lower(nombre));

CREATE TABLE articulo (
  id             serial PRIMARY KEY,
  codigo         text NOT NULL UNIQUE,              -- ART-001
  tipo_id        int NOT NULL REFERENCES tipo_equipo(id),
  marca          text NOT NULL,
  modelo         text NOT NULL,
  especificaciones text,
  vida_util_meses int CHECK (vida_util_meses IS NULL OR vida_util_meses >= 0),
  activo         boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX ux_articulo_modelo ON articulo (tipo_id, lower(marca), lower(modelo));

CREATE TABLE cargo (
  id          serial PRIMARY KEY,
  nombre      text NOT NULL,
  activo      boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX ux_cargo_nombre ON cargo (lower(nombre));

-- Perfil de dotación: una fila por cargo y tipo. Ausencia de fila = no_permitido.
CREATE TABLE cargo_dotacion (
  cargo_id             int NOT NULL REFERENCES cargo(id),
  tipo_id              int NOT NULL REFERENCES tipo_equipo(id),
  nivel                nivel_dotacion NOT NULL,
  articulo_restringido int REFERENCES articulo(id),   -- NULL = cualquier artículo del tipo
  PRIMARY KEY (cargo_id, tipo_id)
);

-- Mapeo del campo "title" de Google Workspace a cargos del catálogo
CREATE TABLE cargo_alias_google (
  alias     text PRIMARY KEY,                         -- en minúsculas
  cargo_id  int NOT NULL REFERENCES cargo(id)
);

CREATE TABLE usuario (
  id                     serial PRIMARY KEY,
  codigo                 text NOT NULL,
  nombre                 text NOT NULL,
  correo                 text,
  cargo_id               int REFERENCES cargo(id),
  departamento_id        int REFERENCES departamento(id),
  estado                 estado_usuario NOT NULL DEFAULT 'activo',
  pendiente_clasificar   boolean NOT NULL DEFAULT false,
  fuente_desactivacion   text,                        -- 'google' | 'manual'
  desactivado_en         timestamptz,
  creado_en              timestamptz NOT NULL DEFAULT now(),
  actualizado_en         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_usuario_codigo ON usuario (lower(codigo));
CREATE UNIQUE INDEX ux_usuario_correo ON usuario (lower(correo)) WHERE correo IS NOT NULL;

CREATE TABLE vacacion (
  id           serial PRIMARY KEY,
  usuario_id   int NOT NULL REFERENCES usuario(id),
  desde        date NOT NULL,
  hasta        date NOT NULL,
  accion       accion_vacacion NOT NULL,
  suplente_id  int REFERENCES usuario(id),
  nota         text,
  finalizada_en timestamptz,
  CHECK (hasta >= desde),
  CHECK ((accion = 'prestamo') = (suplente_id IS NOT NULL)),
  CHECK (suplente_id IS NULL OR suplente_id <> usuario_id)
);
CREATE UNIQUE INDEX ux_vacacion_abierta ON vacacion (usuario_id) WHERE finalizada_en IS NULL;

CREATE TABLE activo (
  id               serial PRIMARY KEY,
  articulo_id      int NOT NULL REFERENCES articulo(id),
  serial           text NOT NULL,
  estado           estado_activo NOT NULL DEFAULT 'disponible',
  usuario_id       int REFERENCES usuario(id),        -- titular
  prestado_a       int REFERENCES usuario(id),        -- suplente en préstamo
  fecha_asignacion date,
  creado_en        timestamptz NOT NULL DEFAULT now(),
  actualizado_en   timestamptz NOT NULL DEFAULT now(),
  CHECK ((estado IN ('asignado','en_resguardo','prestamo','pendiente_recuperacion')) = (usuario_id IS NOT NULL)),
  CHECK ((estado = 'prestamo') = (prestado_a IS NOT NULL))
);
CREATE UNIQUE INDEX ux_activo_serial ON activo (lower(serial));
CREATE INDEX ix_activo_usuario ON activo (usuario_id);

-- Historial de movimientos (auditoría)
CREATE TABLE activo_movimiento (
  id              bigserial PRIMARY KEY,
  activo_id       int NOT NULL REFERENCES activo(id),
  estado_anterior estado_activo,
  estado_nuevo    estado_activo NOT NULL,
  usuario_anterior int REFERENCES usuario(id),
  usuario_nuevo    int REFERENCES usuario(id),
  motivo          text,                 -- asignacion, liberacion, vacaciones, baja_usuario, sync_google, ...
  realizado_por   text NOT NULL,        -- correo del operador o 'sistema'
  realizado_en    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sync_google_log (
  id            bigserial PRIMARY KEY,
  iniciado_en   timestamptz NOT NULL DEFAULT now(),
  finalizado_en timestamptz,
  leidos        int, desactivados int, reactivados int, creados int,
  errores       jsonb,
  exitoso       boolean
);

-- ¿Puede el usuario recibir este artículo?
CREATE OR REPLACE FUNCTION puede_recibir(p_usuario int, p_articulo int) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM usuario u
    JOIN articulo a ON a.id = p_articulo
    JOIN cargo_dotacion cd ON cd.cargo_id = u.cargo_id AND cd.tipo_id = a.tipo_id
    WHERE u.id = p_usuario
      AND cd.nivel <> 'no_permitido'
      AND (cd.articulo_restringido IS NULL OR cd.articulo_restringido = a.id)
  );
$$;

-- Tenencia por usuario y tipo
CREATE OR REPLACE VIEW v_tenencia AS
SELECT a.usuario_id, ar.tipo_id, count(*) AS unidades,
       bool_or(NOT puede_recibir(a.usuario_id, a.articulo_id)) AS fuera_de_perfil
FROM activo a JOIN articulo ar ON ar.id = a.articulo_id
WHERE a.estado IN ('asignado','en_resguardo','prestamo')
GROUP BY a.usuario_id, ar.tipo_id;

-- Faltantes obligatorios por usuario
CREATE OR REPLACE VIEW v_faltantes AS
SELECT u.id AS usuario_id, cd.tipo_id
FROM usuario u
JOIN cargo_dotacion cd ON cd.cargo_id = u.cargo_id AND cd.nivel = 'obligatorio'
LEFT JOIN v_tenencia t ON t.usuario_id = u.id AND t.tipo_id = cd.tipo_id
WHERE u.estado IN ('activo','vacaciones') AND t.usuario_id IS NULL;

-- Cobertura por departamento y tipo (solo tipos obligatorios)
CREATE OR REPLACE VIEW v_cobertura_departamento AS
SELECT d.id AS departamento_id, d.silo_id, cd.tipo_id,
       count(*)                                   AS exigidos,
       count(*) FILTER (WHERE t.usuario_id IS NOT NULL) AS cubiertos
FROM usuario u
JOIN departamento d ON d.id = u.departamento_id
JOIN cargo_dotacion cd ON cd.cargo_id = u.cargo_id AND cd.nivel = 'obligatorio'
LEFT JOIN v_tenencia t ON t.usuario_id = u.id AND t.tipo_id = cd.tipo_id
WHERE u.estado IN ('activo','vacaciones')
GROUP BY d.id, d.silo_id, cd.tipo_id;
