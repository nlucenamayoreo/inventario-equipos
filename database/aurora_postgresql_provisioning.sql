-- =============================================================================
-- may_dev_inventario — Aurora PostgreSQL — PROVISIONING
-- Ambiente: dev | Base: may_dev_inventario_db
-- Ejecutar como: master (rds_superuser) conectado a la base 'postgres'
-- psql -v ON_ERROR_STOP=1 ... Generado por la skill aws-project-* (no editar a mano;
-- ajustar config.yaml y regenerar).
-- =============================================================================
\set ON_ERROR_STOP on
-- Variables requeridas: -v pass_ro=... -v pass_rw=... -v pass_ddl=... -v pass_admin=...
\if :{?pass_ro}
\else
  \echo 'Falta la variable psql pass_ro (-v pass_ro=...)'
  SELECT 1/0 AS falta_pass_ro;
\endif
\if :{?pass_rw}
\else
  \echo 'Falta la variable psql pass_rw (-v pass_rw=...)'
  SELECT 1/0 AS falta_pass_rw;
\endif
\if :{?pass_ddl}
\else
  \echo 'Falta la variable psql pass_ddl (-v pass_ddl=...)'
  SELECT 1/0 AS falta_pass_ddl;
\endif
\if :{?pass_admin}
\else
  \echo 'Falta la variable psql pass_admin (-v pass_admin=...)'
  SELECT 1/0 AS falta_pass_admin;
\endif

-- 0. Guarda: nunca ejecutar contra Supabase
DO $do$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL AND to_regclass('storage.objects') IS NOT NULL THEN
    RAISE EXCEPTION 'Destino parece un proyecto Supabase (auth.users/storage.objects). Abortado.';
  END IF;
END
$do$;

-- 1. Política de contraseñas (>=12, mayúscula, minúscula, número, especial; no expiran)
SELECT set_config('dbkit.check_pass_ro', :'pass_ro', false) AS _ \gset
DO $do$
DECLARE p text := current_setting('dbkit.check_pass_ro');
BEGIN
  IF length(p) < 12 OR p !~ '[A-Z]' OR p !~ '[a-z]' OR p !~ '[0-9]' OR p !~ '[^A-Za-z0-9]' THEN
    RAISE EXCEPTION 'La contraseña pass_ro no cumple la política (>=12, mayúscula, minúscula, número, especial)';
  END IF;
  PERFORM set_config('dbkit.check_pass_ro', '', false);
END
$do$;
SELECT set_config('dbkit.check_pass_rw', :'pass_rw', false) AS _ \gset
DO $do$
DECLARE p text := current_setting('dbkit.check_pass_rw');
BEGIN
  IF length(p) < 12 OR p !~ '[A-Z]' OR p !~ '[a-z]' OR p !~ '[0-9]' OR p !~ '[^A-Za-z0-9]' THEN
    RAISE EXCEPTION 'La contraseña pass_rw no cumple la política (>=12, mayúscula, minúscula, número, especial)';
  END IF;
  PERFORM set_config('dbkit.check_pass_rw', '', false);
END
$do$;
SELECT set_config('dbkit.check_pass_ddl', :'pass_ddl', false) AS _ \gset
DO $do$
DECLARE p text := current_setting('dbkit.check_pass_ddl');
BEGIN
  IF length(p) < 12 OR p !~ '[A-Z]' OR p !~ '[a-z]' OR p !~ '[0-9]' OR p !~ '[^A-Za-z0-9]' THEN
    RAISE EXCEPTION 'La contraseña pass_ddl no cumple la política (>=12, mayúscula, minúscula, número, especial)';
  END IF;
  PERFORM set_config('dbkit.check_pass_ddl', '', false);
END
$do$;
SELECT set_config('dbkit.check_pass_admin', :'pass_admin', false) AS _ \gset
DO $do$
DECLARE p text := current_setting('dbkit.check_pass_admin');
BEGIN
  IF length(p) < 12 OR p !~ '[A-Z]' OR p !~ '[a-z]' OR p !~ '[0-9]' OR p !~ '[^A-Za-z0-9]' THEN
    RAISE EXCEPTION 'La contraseña pass_admin no cumple la política (>=12, mayúscula, minúscula, número, especial)';
  END IF;
  PERFORM set_config('dbkit.check_pass_admin', '', false);
END
$do$;

-- 2. Roles de grupo (NOLOGIN). Herencia: admin > ddl > rw > ro
SELECT format('CREATE ROLE %I NOLOGIN', 'ro_inventario')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ro_inventario') \gexec
SELECT format('CREATE ROLE %I NOLOGIN', 'rw_inventario')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rw_inventario') \gexec
SELECT format('CREATE ROLE %I NOLOGIN', 'ddl_inventario')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ddl_inventario') \gexec
SELECT format('CREATE ROLE %I NOLOGIN', 'admin_inventario')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_inventario') \gexec
GRANT ro_inventario TO rw_inventario;
GRANT rw_inventario TO ddl_inventario;
GRANT ddl_inventario TO admin_inventario;
-- el master necesita membresía para SET ROLE, ALTER DEFAULT PRIVILEGES y OWNER de la base
SELECT format('GRANT %I TO %I', 'admin_inventario', current_user) \gexec

-- 3. Usuarios (LOGIN) con contraseña parametrizada que no expira
SELECT format('CREATE ROLE %I LOGIN', 'usr_inventario_report')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'usr_inventario_report') \gexec
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L VALID UNTIL %L', 'usr_inventario_report', :'pass_ro', 'infinity') \gexec
GRANT ro_inventario TO usr_inventario_report;
SELECT format('CREATE ROLE %I LOGIN', 'usr_inventario_app')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'usr_inventario_app') \gexec
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L VALID UNTIL %L', 'usr_inventario_app', :'pass_rw', 'infinity') \gexec
GRANT rw_inventario TO usr_inventario_app;
SELECT format('CREATE ROLE %I LOGIN', 'usr_inventario_deploy')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'usr_inventario_deploy') \gexec
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L VALID UNTIL %L', 'usr_inventario_deploy', :'pass_ddl', 'infinity') \gexec
GRANT ddl_inventario TO usr_inventario_deploy;
SELECT format('CREATE ROLE %I LOGIN', 'usr_inventario_dba')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'usr_inventario_dba') \gexec
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L VALID UNTIL %L', 'usr_inventario_dba', :'pass_admin', 'infinity') \gexec
GRANT admin_inventario TO usr_inventario_dba;

-- 4. Base de datos (CREATE DATABASE no admite IF NOT EXISTS ni transacción)
SELECT format('CREATE DATABASE %I OWNER %I ENCODING %L', 'may_dev_inventario_db', 'admin_inventario', 'UTF8')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'may_dev_inventario_db') \gexec
\connect may_dev_inventario_db
REVOKE ALL ON DATABASE may_dev_inventario_db FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE may_dev_inventario_db TO ro_inventario;
GRANT ALL ON DATABASE may_dev_inventario_db TO admin_inventario;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- 5. Esquemas, permisos y default privileges (se repite por esquema)
-- >>> PER_SCHEMA_BEGIN <<<
CREATE SCHEMA IF NOT EXISTS may_dev_inventario_sch_core AUTHORIZATION ddl_inventario;
GRANT USAGE ON SCHEMA may_dev_inventario_sch_core TO ro_inventario;
GRANT ALL ON SCHEMA may_dev_inventario_sch_core TO admin_inventario;
GRANT SELECT ON ALL TABLES IN SCHEMA may_dev_inventario_sch_core TO ro_inventario;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA may_dev_inventario_sch_core TO ro_inventario;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA may_dev_inventario_sch_core TO rw_inventario;
GRANT USAGE, UPDATE ON ALL SEQUENCES IN SCHEMA may_dev_inventario_sch_core TO rw_inventario;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA may_dev_inventario_sch_core TO rw_inventario;
GRANT ALL ON ALL TABLES IN SCHEMA may_dev_inventario_sch_core TO admin_inventario;
GRANT ALL ON ALL SEQUENCES IN SCHEMA may_dev_inventario_sch_core TO admin_inventario;
ALTER DEFAULT PRIVILEGES FOR ROLE ddl_inventario IN SCHEMA may_dev_inventario_sch_core GRANT SELECT ON TABLES TO ro_inventario;
ALTER DEFAULT PRIVILEGES FOR ROLE ddl_inventario IN SCHEMA may_dev_inventario_sch_core GRANT SELECT ON SEQUENCES TO ro_inventario;
ALTER DEFAULT PRIVILEGES FOR ROLE ddl_inventario IN SCHEMA may_dev_inventario_sch_core GRANT INSERT, UPDATE, DELETE ON TABLES TO rw_inventario;
ALTER DEFAULT PRIVILEGES FOR ROLE ddl_inventario IN SCHEMA may_dev_inventario_sch_core GRANT USAGE, UPDATE ON SEQUENCES TO rw_inventario;
ALTER DEFAULT PRIVILEGES FOR ROLE ddl_inventario IN SCHEMA may_dev_inventario_sch_core GRANT EXECUTE ON FUNCTIONS TO rw_inventario;
ALTER DEFAULT PRIVILEGES FOR ROLE ddl_inventario IN SCHEMA may_dev_inventario_sch_core GRANT ALL ON TABLES TO admin_inventario;
ALTER DEFAULT PRIVILEGES FOR ROLE admin_inventario IN SCHEMA may_dev_inventario_sch_core GRANT SELECT ON TABLES TO ro_inventario;
ALTER DEFAULT PRIVILEGES FOR ROLE admin_inventario IN SCHEMA may_dev_inventario_sch_core GRANT SELECT ON SEQUENCES TO ro_inventario;
ALTER DEFAULT PRIVILEGES FOR ROLE admin_inventario IN SCHEMA may_dev_inventario_sch_core GRANT INSERT, UPDATE, DELETE ON TABLES TO rw_inventario;
ALTER DEFAULT PRIVILEGES FOR ROLE admin_inventario IN SCHEMA may_dev_inventario_sch_core GRANT USAGE, UPDATE ON SEQUENCES TO rw_inventario;
ALTER DEFAULT PRIVILEGES FOR ROLE admin_inventario IN SCHEMA may_dev_inventario_sch_core GRANT EXECUTE ON FUNCTIONS TO rw_inventario;
ALTER DEFAULT PRIVILEGES FOR ROLE admin_inventario IN SCHEMA may_dev_inventario_sch_core GRANT ALL ON TABLES TO admin_inventario;
-- >>> PER_SCHEMA_END <<<

-- 6. Funciones: sin EXECUTE para PUBLIC en objetos futuros
ALTER DEFAULT PRIVILEGES FOR ROLE ddl_inventario REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE admin_inventario REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- 7. search_path fijado por usuario (la app NO ejecuta SET en runtime → sin pinning en RDS Proxy)
ALTER ROLE usr_inventario_report IN DATABASE may_dev_inventario_db SET search_path = may_dev_inventario_sch_core;
ALTER ROLE usr_inventario_app IN DATABASE may_dev_inventario_db SET search_path = may_dev_inventario_sch_core;
ALTER ROLE usr_inventario_deploy IN DATABASE may_dev_inventario_db SET search_path = may_dev_inventario_sch_core;
ALTER ROLE usr_inventario_dba IN DATABASE may_dev_inventario_db SET search_path = may_dev_inventario_sch_core;

-- 8. Extensiones (compatibles o con adaptación documentada)

\echo 'Provisioning completado.'
