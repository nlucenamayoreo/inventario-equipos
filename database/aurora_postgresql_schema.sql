-- =============================================================================
-- may_dev_inventario — Aurora PostgreSQL — SCHEMA
-- Ambiente: dev | Base: may_dev_inventario_db
-- Ejecutar como: master o usr_inventario_deploy conectado a may_dev_inventario_db
-- psql -v ON_ERROR_STOP=1 ... Generado por la skill aws-project-* (no editar a mano;
-- ajustar config.yaml y regenerar).
-- =============================================================================
\set ON_ERROR_STOP on
DO $do$
BEGIN
  IF current_database() <> 'may_dev_inventario_db' THEN
    RAISE EXCEPTION 'Base actual % distinta de la esperada may_dev_inventario_db', current_database();
  END IF;
  IF to_regclass('auth.users') IS NOT NULL THEN
    RAISE EXCEPTION 'Destino parece Supabase. Abortado.';
  END IF;
END
$do$;
BEGIN;
SET LOCAL ROLE ddl_inventario;
SET LOCAL search_path = may_dev_inventario_sch_core;
SET LOCAL check_function_bodies = off;

-- ---------------------------------------------------------------- tipos
DO $do$
BEGIN
  IF to_regtype('may_dev_inventario_sch_core.accion_vacacion') IS NULL THEN
    CREATE TYPE may_dev_inventario_sch_core.accion_vacacion AS ENUM ('conserva', 'resguardo', 'prestamo');
  END IF;
END
$do$;
DO $do$
BEGIN
  IF to_regtype('may_dev_inventario_sch_core.estado_activo') IS NULL THEN
    CREATE TYPE may_dev_inventario_sch_core.estado_activo AS ENUM ('disponible', 'asignado', 'en_resguardo', 'prestamo', 'pendiente_recuperacion', 'en_reparacion', 'de_baja');
  END IF;
END
$do$;
DO $do$
BEGIN
  IF to_regtype('may_dev_inventario_sch_core.estado_usuario') IS NULL THEN
    CREATE TYPE may_dev_inventario_sch_core.estado_usuario AS ENUM ('activo', 'vacaciones', 'desactivado', 'eliminado');
  END IF;
END
$do$;
DO $do$
BEGIN
  IF to_regtype('may_dev_inventario_sch_core.nivel_dotacion') IS NULL THEN
    CREATE TYPE may_dev_inventario_sch_core.nivel_dotacion AS ENUM ('obligatorio', 'permitido', 'no_permitido');
  END IF;
END
$do$;

-- ---------------------------------------------------------------- secuencias
CREATE SEQUENCE IF NOT EXISTS may_dev_inventario_sch_core.seq_activo_id AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS may_dev_inventario_sch_core.seq_activo_movimiento_id AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS may_dev_inventario_sch_core.seq_articulo_id AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS may_dev_inventario_sch_core.seq_cargo_id AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS may_dev_inventario_sch_core.seq_departamento_id AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS may_dev_inventario_sch_core.seq_silo_id AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS may_dev_inventario_sch_core.seq_sync_google_log_id AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS may_dev_inventario_sch_core.seq_tipo_equipo_id AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS may_dev_inventario_sch_core.seq_usuario_id AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS may_dev_inventario_sch_core.seq_vacacion_id AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

-- ---------------------------------------------------------------- auth: espejo de usuarios + contexto
-- Reemplaza auth.users (Cognito es el IdP). El backend vincula cognito_sub en el primer login.
CREATE TABLE IF NOT EXISTS may_dev_inventario_sch_core.tbl_app_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cognito_sub text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_app_users PRIMARY KEY (id),
  CONSTRAINT uq_app_users_cognito_sub UNIQUE (cognito_sub)
);
CREATE INDEX IF NOT EXISTS idx_app_users_email_expr ON may_dev_inventario_sch_core.tbl_app_users (lower(email));
-- Contexto de sesión por transacción (set_config(..., true)) fijado por PostgresUnitOfWork.
CREATE OR REPLACE FUNCTION may_dev_inventario_sch_core.fn_auth_uid() RETURNS uuid
  LANGUAGE sql STABLE PARALLEL SAFE AS $fn$SELECT nullif(current_setting('app.user_id', true), '')::uuid$fn$;
CREATE OR REPLACE FUNCTION may_dev_inventario_sch_core.fn_auth_role() RETURNS text
  LANGUAGE sql STABLE PARALLEL SAFE AS $fn$SELECT coalesce(nullif(current_setting('app.role', true), ''), 'anon')$fn$;
CREATE OR REPLACE FUNCTION may_dev_inventario_sch_core.fn_auth_email() RETURNS text
  LANGUAGE sql STABLE PARALLEL SAFE AS $fn$SELECT nullif(current_setting('app.email', true), '')$fn$;
CREATE OR REPLACE FUNCTION may_dev_inventario_sch_core.fn_auth_jwt() RETURNS jsonb
  LANGUAGE sql STABLE PARALLEL SAFE AS $fn$SELECT coalesce(nullif(current_setting('app.jwt_claims', true), ''), '{}')::jsonb$fn$;

-- ---------------------------------------------------------------- funciones (previas a tablas)
CREATE OR REPLACE FUNCTION may_dev_inventario_sch_core.fn_puede_recibir(p_usuario integer, p_articulo integer)
  RETURNS boolean
  LANGUAGE sql
  STABLE
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM tbl_usuario u
    JOIN tbl_articulo a ON a.id = p_articulo
    JOIN tbl_cargo_dotacion cd ON cd.cargo_id = u.cargo_id AND cd.tipo_id = a.tipo_id
    WHERE u.id = p_usuario
      AND cd.nivel <> 'no_permitido'
      AND (cd.articulo_restringido IS NULL OR cd.articulo_restringido = a.id)
  );
$fn$;
-- ---------------------------------------------------------------- tablas
CREATE TABLE IF NOT EXISTS may_dev_inventario_sch_core.tbl_cargo (
  id integer DEFAULT nextval('may_dev_inventario_sch_core.seq_cargo_id'::regclass) NOT NULL,
  nombre text NOT NULL,
  activo boolean DEFAULT true NOT NULL
);
CREATE TABLE IF NOT EXISTS may_dev_inventario_sch_core.tbl_silo (
  id integer DEFAULT nextval('may_dev_inventario_sch_core.seq_silo_id'::regclass) NOT NULL,
  nombre text NOT NULL,
  activo boolean DEFAULT true NOT NULL
);
CREATE TABLE IF NOT EXISTS may_dev_inventario_sch_core.tbl_sync_google_log (
  id bigint DEFAULT nextval('may_dev_inventario_sch_core.seq_sync_google_log_id'::regclass) NOT NULL,
  iniciado_en timestamp with time zone DEFAULT now() NOT NULL,
  finalizado_en timestamp with time zone,
  leidos integer,
  desactivados integer,
  reactivados integer,
  creados integer,
  errores jsonb,
  exitoso boolean
);
CREATE TABLE IF NOT EXISTS may_dev_inventario_sch_core.tbl_tipo_equipo (
  id integer DEFAULT nextval('may_dev_inventario_sch_core.seq_tipo_equipo_id'::regclass) NOT NULL,
  nombre text NOT NULL,
  activo boolean DEFAULT true NOT NULL
);
CREATE TABLE IF NOT EXISTS may_dev_inventario_sch_core.tbl_articulo (
  id integer DEFAULT nextval('may_dev_inventario_sch_core.seq_articulo_id'::regclass) NOT NULL,
  codigo text NOT NULL,
  tipo_id integer NOT NULL,
  marca text NOT NULL,
  modelo text NOT NULL,
  especificaciones text,
  vida_util_meses integer,
  activo boolean DEFAULT true NOT NULL
);
CREATE TABLE IF NOT EXISTS may_dev_inventario_sch_core.tbl_cargo_alias_google (
  alias text NOT NULL,
  cargo_id integer NOT NULL
);
CREATE TABLE IF NOT EXISTS may_dev_inventario_sch_core.tbl_departamento (
  id integer DEFAULT nextval('may_dev_inventario_sch_core.seq_departamento_id'::regclass) NOT NULL,
  silo_id integer NOT NULL,
  nombre text NOT NULL,
  activo boolean DEFAULT true NOT NULL
);
CREATE TABLE IF NOT EXISTS may_dev_inventario_sch_core.tbl_cargo_dotacion (
  cargo_id integer NOT NULL,
  tipo_id integer NOT NULL,
  nivel nivel_dotacion NOT NULL,
  articulo_restringido integer
);
CREATE TABLE IF NOT EXISTS may_dev_inventario_sch_core.tbl_usuario (
  id integer DEFAULT nextval('may_dev_inventario_sch_core.seq_usuario_id'::regclass) NOT NULL,
  codigo text NOT NULL,
  nombre text NOT NULL,
  correo text,
  cargo_id integer,
  departamento_id integer,
  estado estado_usuario DEFAULT 'activo'::estado_usuario NOT NULL,
  pendiente_clasificar boolean DEFAULT false NOT NULL,
  fuente_desactivacion text,
  desactivado_en timestamp with time zone,
  creado_en timestamp with time zone DEFAULT now() NOT NULL,
  actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS may_dev_inventario_sch_core.tbl_activo (
  id integer DEFAULT nextval('may_dev_inventario_sch_core.seq_activo_id'::regclass) NOT NULL,
  articulo_id integer NOT NULL,
  serial text NOT NULL,
  estado estado_activo DEFAULT 'disponible'::estado_activo NOT NULL,
  usuario_id integer,
  prestado_a integer,
  fecha_asignacion date,
  creado_en timestamp with time zone DEFAULT now() NOT NULL,
  actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS may_dev_inventario_sch_core.tbl_vacacion (
  id integer DEFAULT nextval('may_dev_inventario_sch_core.seq_vacacion_id'::regclass) NOT NULL,
  usuario_id integer NOT NULL,
  desde date NOT NULL,
  hasta date NOT NULL,
  accion accion_vacacion NOT NULL,
  suplente_id integer,
  nota text,
  finalizada_en timestamp with time zone
);
CREATE TABLE IF NOT EXISTS may_dev_inventario_sch_core.tbl_activo_movimiento (
  id bigint DEFAULT nextval('may_dev_inventario_sch_core.seq_activo_movimiento_id'::regclass) NOT NULL,
  activo_id integer NOT NULL,
  estado_anterior estado_activo,
  estado_nuevo estado_activo NOT NULL,
  usuario_anterior integer,
  usuario_nuevo integer,
  motivo text,
  realizado_por text NOT NULL,
  realizado_en timestamp with time zone DEFAULT now() NOT NULL
);
ALTER SEQUENCE may_dev_inventario_sch_core.seq_activo_id OWNED BY may_dev_inventario_sch_core.tbl_activo.id;
ALTER SEQUENCE may_dev_inventario_sch_core.seq_activo_movimiento_id OWNED BY may_dev_inventario_sch_core.tbl_activo_movimiento.id;
ALTER SEQUENCE may_dev_inventario_sch_core.seq_articulo_id OWNED BY may_dev_inventario_sch_core.tbl_articulo.id;
ALTER SEQUENCE may_dev_inventario_sch_core.seq_cargo_id OWNED BY may_dev_inventario_sch_core.tbl_cargo.id;
ALTER SEQUENCE may_dev_inventario_sch_core.seq_departamento_id OWNED BY may_dev_inventario_sch_core.tbl_departamento.id;
ALTER SEQUENCE may_dev_inventario_sch_core.seq_silo_id OWNED BY may_dev_inventario_sch_core.tbl_silo.id;
ALTER SEQUENCE may_dev_inventario_sch_core.seq_sync_google_log_id OWNED BY may_dev_inventario_sch_core.tbl_sync_google_log.id;
ALTER SEQUENCE may_dev_inventario_sch_core.seq_tipo_equipo_id OWNED BY may_dev_inventario_sch_core.tbl_tipo_equipo.id;
ALTER SEQUENCE may_dev_inventario_sch_core.seq_usuario_id OWNED BY may_dev_inventario_sch_core.tbl_usuario.id;
ALTER SEQUENCE may_dev_inventario_sch_core.seq_vacacion_id OWNED BY may_dev_inventario_sch_core.tbl_vacacion.id;

-- ---------------------------------------------------------------- constraints (PK/UQ/CK/EX → FK)
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_activo'::regclass
                 AND conname = 'pk_activo') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_activo ADD CONSTRAINT pk_activo PRIMARY KEY (id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_activo_movimiento'::regclass
                 AND conname = 'pk_activo_movimiento') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_activo_movimiento ADD CONSTRAINT pk_activo_movimiento PRIMARY KEY (id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_articulo'::regclass
                 AND conname = 'pk_articulo') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_articulo ADD CONSTRAINT pk_articulo PRIMARY KEY (id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_cargo'::regclass
                 AND conname = 'pk_cargo') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_cargo ADD CONSTRAINT pk_cargo PRIMARY KEY (id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_cargo_alias_google'::regclass
                 AND conname = 'pk_cargo_alias_google') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_cargo_alias_google ADD CONSTRAINT pk_cargo_alias_google PRIMARY KEY (alias);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_cargo_dotacion'::regclass
                 AND conname = 'pk_cargo_dotacion') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_cargo_dotacion ADD CONSTRAINT pk_cargo_dotacion PRIMARY KEY (cargo_id, tipo_id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_departamento'::regclass
                 AND conname = 'pk_departamento') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_departamento ADD CONSTRAINT pk_departamento PRIMARY KEY (id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_silo'::regclass
                 AND conname = 'pk_silo') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_silo ADD CONSTRAINT pk_silo PRIMARY KEY (id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_sync_google_log'::regclass
                 AND conname = 'pk_sync_google_log') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_sync_google_log ADD CONSTRAINT pk_sync_google_log PRIMARY KEY (id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_tipo_equipo'::regclass
                 AND conname = 'pk_tipo_equipo') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_tipo_equipo ADD CONSTRAINT pk_tipo_equipo PRIMARY KEY (id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_usuario'::regclass
                 AND conname = 'pk_usuario') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_usuario ADD CONSTRAINT pk_usuario PRIMARY KEY (id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_vacacion'::regclass
                 AND conname = 'pk_vacacion') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_vacacion ADD CONSTRAINT pk_vacacion PRIMARY KEY (id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_articulo'::regclass
                 AND conname = 'uq_articulo_codigo') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_articulo ADD CONSTRAINT uq_articulo_codigo UNIQUE (codigo);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_departamento'::regclass
                 AND conname = 'uq_departamento_silo_id_nombre') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_departamento ADD CONSTRAINT uq_departamento_silo_id_nombre UNIQUE (silo_id, nombre);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_silo'::regclass
                 AND conname = 'uq_silo_nombre') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_silo ADD CONSTRAINT uq_silo_nombre UNIQUE (nombre);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_activo'::regclass
                 AND conname = 'ck_activo_check') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_activo ADD CONSTRAINT ck_activo_check CHECK (((estado = ANY (ARRAY['asignado'::estado_activo, 'en_resguardo'::estado_activo, 'prestamo'::estado_activo, 'pendiente_recuperacion'::estado_activo])) = (usuario_id IS NOT NULL)));
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_activo'::regclass
                 AND conname = 'ck_activo_check1') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_activo ADD CONSTRAINT ck_activo_check1 CHECK (((estado = 'prestamo'::estado_activo) = (prestado_a IS NOT NULL)));
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_articulo'::regclass
                 AND conname = 'ck_articulo_vida_util_meses') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_articulo ADD CONSTRAINT ck_articulo_vida_util_meses CHECK (((vida_util_meses IS NULL) OR (vida_util_meses >= 0)));
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_vacacion'::regclass
                 AND conname = 'ck_vacacion_check') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_vacacion ADD CONSTRAINT ck_vacacion_check CHECK ((hasta >= desde));
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_vacacion'::regclass
                 AND conname = 'ck_vacacion_check1') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_vacacion ADD CONSTRAINT ck_vacacion_check1 CHECK (((accion = 'prestamo'::accion_vacacion) = (suplente_id IS NOT NULL)));
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_vacacion'::regclass
                 AND conname = 'ck_vacacion_check2') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_vacacion ADD CONSTRAINT ck_vacacion_check2 CHECK (((suplente_id IS NULL) OR (suplente_id <> usuario_id)));
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_activo'::regclass
                 AND conname = 'fk_activo_articulo') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_activo ADD CONSTRAINT fk_activo_articulo FOREIGN KEY (articulo_id) REFERENCES tbl_articulo(id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_activo'::regclass
                 AND conname = 'fk_activo_usuario_prestado_a') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_activo ADD CONSTRAINT fk_activo_usuario_prestado_a FOREIGN KEY (prestado_a) REFERENCES tbl_usuario(id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_activo'::regclass
                 AND conname = 'fk_activo_usuario_usuario_id') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_activo ADD CONSTRAINT fk_activo_usuario_usuario_id FOREIGN KEY (usuario_id) REFERENCES tbl_usuario(id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_activo_movimiento'::regclass
                 AND conname = 'fk_activo_movimiento_activo') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_activo_movimiento ADD CONSTRAINT fk_activo_movimiento_activo FOREIGN KEY (activo_id) REFERENCES tbl_activo(id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_activo_movimiento'::regclass
                 AND conname = 'fk_activo_movimiento_usuario_usuario_anterior') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_activo_movimiento ADD CONSTRAINT fk_activo_movimiento_usuario_usuario_anterior FOREIGN KEY (usuario_anterior) REFERENCES tbl_usuario(id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_activo_movimiento'::regclass
                 AND conname = 'fk_activo_movimiento_usuario_usuario_nuevo') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_activo_movimiento ADD CONSTRAINT fk_activo_movimiento_usuario_usuario_nuevo FOREIGN KEY (usuario_nuevo) REFERENCES tbl_usuario(id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_articulo'::regclass
                 AND conname = 'fk_articulo_tipo_equipo') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_articulo ADD CONSTRAINT fk_articulo_tipo_equipo FOREIGN KEY (tipo_id) REFERENCES tbl_tipo_equipo(id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_cargo_alias_google'::regclass
                 AND conname = 'fk_cargo_alias_google_cargo') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_cargo_alias_google ADD CONSTRAINT fk_cargo_alias_google_cargo FOREIGN KEY (cargo_id) REFERENCES tbl_cargo(id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_cargo_dotacion'::regclass
                 AND conname = 'fk_cargo_dotacion_articulo') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_cargo_dotacion ADD CONSTRAINT fk_cargo_dotacion_articulo FOREIGN KEY (articulo_restringido) REFERENCES tbl_articulo(id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_cargo_dotacion'::regclass
                 AND conname = 'fk_cargo_dotacion_cargo') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_cargo_dotacion ADD CONSTRAINT fk_cargo_dotacion_cargo FOREIGN KEY (cargo_id) REFERENCES tbl_cargo(id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_cargo_dotacion'::regclass
                 AND conname = 'fk_cargo_dotacion_tipo_equipo') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_cargo_dotacion ADD CONSTRAINT fk_cargo_dotacion_tipo_equipo FOREIGN KEY (tipo_id) REFERENCES tbl_tipo_equipo(id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_departamento'::regclass
                 AND conname = 'fk_departamento_silo') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_departamento ADD CONSTRAINT fk_departamento_silo FOREIGN KEY (silo_id) REFERENCES tbl_silo(id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_usuario'::regclass
                 AND conname = 'fk_usuario_cargo') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_usuario ADD CONSTRAINT fk_usuario_cargo FOREIGN KEY (cargo_id) REFERENCES tbl_cargo(id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_usuario'::regclass
                 AND conname = 'fk_usuario_departamento') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_usuario ADD CONSTRAINT fk_usuario_departamento FOREIGN KEY (departamento_id) REFERENCES tbl_departamento(id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_vacacion'::regclass
                 AND conname = 'fk_vacacion_usuario_suplente_id') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_vacacion ADD CONSTRAINT fk_vacacion_usuario_suplente_id FOREIGN KEY (suplente_id) REFERENCES tbl_usuario(id);
  END IF;
END
$do$;
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'may_dev_inventario_sch_core.tbl_vacacion'::regclass
                 AND conname = 'fk_vacacion_usuario_usuario_id') THEN
    ALTER TABLE may_dev_inventario_sch_core.tbl_vacacion ADD CONSTRAINT fk_vacacion_usuario_usuario_id FOREIGN KEY (usuario_id) REFERENCES tbl_usuario(id);
  END IF;
END
$do$;

-- ---------------------------------------------------------------- índices
CREATE INDEX IF NOT EXISTS idx_activo_usuario_id ON may_dev_inventario_sch_core.tbl_activo USING btree (usuario_id);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_activo_ux_activo_serial ON may_dev_inventario_sch_core.tbl_activo USING btree (lower(serial));
CREATE UNIQUE INDEX IF NOT EXISTS uidx_articulo_tipo_id_expr ON may_dev_inventario_sch_core.tbl_articulo USING btree (tipo_id, lower(marca), lower(modelo));
CREATE UNIQUE INDEX IF NOT EXISTS uidx_cargo_ux_cargo_nombre ON may_dev_inventario_sch_core.tbl_cargo USING btree (lower(nombre));
CREATE UNIQUE INDEX IF NOT EXISTS uidx_tipo_equipo_ux_tipo_equipo_nombre ON may_dev_inventario_sch_core.tbl_tipo_equipo USING btree (lower(nombre));
CREATE UNIQUE INDEX IF NOT EXISTS uidx_usuario_ux_usuario_codigo ON may_dev_inventario_sch_core.tbl_usuario USING btree (lower(codigo));
CREATE UNIQUE INDEX IF NOT EXISTS uidx_usuario_ux_usuario_correo_partial ON may_dev_inventario_sch_core.tbl_usuario USING btree (lower(correo)) WHERE (correo IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_vacacion_usuario_id_partial ON may_dev_inventario_sch_core.tbl_vacacion USING btree (usuario_id) WHERE (finalizada_en IS NULL);

-- ---------------------------------------------------------------- funciones (usan tipos de tabla)
-- ---------------------------------------------------------------- vistas y vistas materializadas
CREATE OR REPLACE VIEW may_dev_inventario_sch_core.vw_tenencia AS
SELECT a.usuario_id,
    ar.tipo_id,
    count(*) AS unidades,
    bool_or(NOT fn_puede_recibir(a.usuario_id, a.articulo_id)) AS fuera_de_perfil
   FROM tbl_activo a
     JOIN tbl_articulo ar ON ar.id = a.articulo_id
  WHERE a.estado = ANY (ARRAY['asignado'::estado_activo, 'en_resguardo'::estado_activo, 'prestamo'::estado_activo])
  GROUP BY a.usuario_id, ar.tipo_id;
CREATE OR REPLACE VIEW may_dev_inventario_sch_core.vw_cobertura_departamento AS
SELECT d.id AS departamento_id,
    d.silo_id,
    cd.tipo_id,
    count(*) AS exigidos,
    count(*) FILTER (WHERE t.usuario_id IS NOT NULL) AS cubiertos
   FROM tbl_usuario u
     JOIN tbl_departamento d ON d.id = u.departamento_id
     JOIN tbl_cargo_dotacion cd ON cd.cargo_id = u.cargo_id AND cd.nivel = 'obligatorio'::nivel_dotacion
     LEFT JOIN vw_tenencia t ON t.usuario_id = u.id AND t.tipo_id = cd.tipo_id
  WHERE u.estado = ANY (ARRAY['activo'::estado_usuario, 'vacaciones'::estado_usuario])
  GROUP BY d.id, d.silo_id, cd.tipo_id;
CREATE OR REPLACE VIEW may_dev_inventario_sch_core.vw_faltantes AS
SELECT u.id AS usuario_id,
    cd.tipo_id
   FROM tbl_usuario u
     JOIN tbl_cargo_dotacion cd ON cd.cargo_id = u.cargo_id AND cd.nivel = 'obligatorio'::nivel_dotacion
     LEFT JOIN vw_tenencia t ON t.usuario_id = u.id AND t.tipo_id = cd.tipo_id
  WHERE (u.estado = ANY (ARRAY['activo'::estado_usuario, 'vacaciones'::estado_usuario])) AND t.usuario_id IS NULL;

-- ---------------------------------------------------------------- índices de vistas materializadas

-- ---------------------------------------------------------------- triggers

-- RLS: rls_mode=backend → la autorización vive en los use cases (ver generation-report.json).

-- ---------------------------------------------------------------- comentarios
COMMENT ON TABLE may_dev_inventario_sch_core.tbl_activo IS 'Unidad física con serial; estado y titular actuales.';
COMMENT ON TABLE may_dev_inventario_sch_core.tbl_activo_movimiento IS 'Auditoría de cada cambio de estado o titular de un activo.';
COMMENT ON TABLE may_dev_inventario_sch_core.tbl_cargo_dotacion IS 'Perfil de dotación: nivel por cargo y tipo; sin fila = no permitido.';
COMMENT ON TABLE may_dev_inventario_sch_core.tbl_usuario IS 'Colaboradores a quienes se asignan equipos (no son usuarios de la aplicación).';

COMMIT;

\echo 'Esquema creado/actualizado.'
