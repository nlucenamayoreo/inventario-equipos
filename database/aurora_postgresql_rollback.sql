-- =============================================================================
-- may_dev_inventario — Aurora PostgreSQL — ROLLBACK
-- Ambiente: dev | Base: may_dev_inventario_db
-- Ejecutar como: master conectado a may_dev_inventario_db. Orden descendente; NUNCA contra Supabase
-- psql -v ON_ERROR_STOP=1 ... Generado por la skill aws-project-* (no editar a mano;
-- ajustar config.yaml y regenerar).
-- =============================================================================
\set ON_ERROR_STOP on
DO $do$
BEGIN
  IF current_database() <> 'may_dev_inventario_db' THEN
    RAISE EXCEPTION 'Rollback abortado: base actual % distinta de may_dev_inventario_db', current_database();
  END IF;
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname IN ('auth', 'storage', 'supabase_functions', 'realtime')) THEN
    RAISE EXCEPTION 'Rollback abortado: se detectaron esquemas de Supabase en la base actual.';
  END IF;
END
$do$;
BEGIN;
-- 0a. extensiones del aplicativo (la base es exclusiva del aplicativo; arrastran sus índices)
-- 0b. todo lo que pertenece al rol ddl del aplicativo: lo generado por la skill y lo agregado por
--     database/changes (incluida tbl_schema_changes) aunque dependa entre sí. Un objeto de OTRO
--     dueño que dependa de estos hace fallar el rollback (DROP OWNED no usa CASCADE).
DROP OWNED BY ddl_inventario;
-- 2. vistas materializadas y vistas
DROP VIEW IF EXISTS may_dev_inventario_sch_core.vw_tenencia;
DROP VIEW IF EXISTS may_dev_inventario_sch_core.vw_faltantes;
DROP VIEW IF EXISTS may_dev_inventario_sch_core.vw_cobertura_departamento;
-- 3. FK
ALTER TABLE IF EXISTS may_dev_inventario_sch_core.tbl_activo DROP CONSTRAINT IF EXISTS fk_activo_articulo;
ALTER TABLE IF EXISTS may_dev_inventario_sch_core.tbl_activo DROP CONSTRAINT IF EXISTS fk_activo_usuario_prestado_a;
ALTER TABLE IF EXISTS may_dev_inventario_sch_core.tbl_activo DROP CONSTRAINT IF EXISTS fk_activo_usuario_usuario_id;
ALTER TABLE IF EXISTS may_dev_inventario_sch_core.tbl_activo_movimiento DROP CONSTRAINT IF EXISTS fk_activo_movimiento_activo;
ALTER TABLE IF EXISTS may_dev_inventario_sch_core.tbl_activo_movimiento DROP CONSTRAINT IF EXISTS fk_activo_movimiento_usuario_usuario_anterior;
ALTER TABLE IF EXISTS may_dev_inventario_sch_core.tbl_activo_movimiento DROP CONSTRAINT IF EXISTS fk_activo_movimiento_usuario_usuario_nuevo;
ALTER TABLE IF EXISTS may_dev_inventario_sch_core.tbl_articulo DROP CONSTRAINT IF EXISTS fk_articulo_tipo_equipo;
ALTER TABLE IF EXISTS may_dev_inventario_sch_core.tbl_cargo_alias_google DROP CONSTRAINT IF EXISTS fk_cargo_alias_google_cargo;
ALTER TABLE IF EXISTS may_dev_inventario_sch_core.tbl_cargo_dotacion DROP CONSTRAINT IF EXISTS fk_cargo_dotacion_articulo;
ALTER TABLE IF EXISTS may_dev_inventario_sch_core.tbl_cargo_dotacion DROP CONSTRAINT IF EXISTS fk_cargo_dotacion_cargo;
ALTER TABLE IF EXISTS may_dev_inventario_sch_core.tbl_cargo_dotacion DROP CONSTRAINT IF EXISTS fk_cargo_dotacion_tipo_equipo;
ALTER TABLE IF EXISTS may_dev_inventario_sch_core.tbl_departamento DROP CONSTRAINT IF EXISTS fk_departamento_silo;
ALTER TABLE IF EXISTS may_dev_inventario_sch_core.tbl_usuario DROP CONSTRAINT IF EXISTS fk_usuario_cargo;
ALTER TABLE IF EXISTS may_dev_inventario_sch_core.tbl_usuario DROP CONSTRAINT IF EXISTS fk_usuario_departamento;
ALTER TABLE IF EXISTS may_dev_inventario_sch_core.tbl_vacacion DROP CONSTRAINT IF EXISTS fk_vacacion_usuario_suplente_id;
ALTER TABLE IF EXISTS may_dev_inventario_sch_core.tbl_vacacion DROP CONSTRAINT IF EXISTS fk_vacacion_usuario_usuario_id;
-- 4. tablas (orden topológico inverso)
DROP TABLE IF EXISTS may_dev_inventario_sch_core.tbl_activo_movimiento;
DROP TABLE IF EXISTS may_dev_inventario_sch_core.tbl_vacacion;
DROP TABLE IF EXISTS may_dev_inventario_sch_core.tbl_activo;
DROP TABLE IF EXISTS may_dev_inventario_sch_core.tbl_usuario;
DROP TABLE IF EXISTS may_dev_inventario_sch_core.tbl_cargo_dotacion;
DROP TABLE IF EXISTS may_dev_inventario_sch_core.tbl_departamento;
DROP TABLE IF EXISTS may_dev_inventario_sch_core.tbl_cargo_alias_google;
DROP TABLE IF EXISTS may_dev_inventario_sch_core.tbl_articulo;
DROP TABLE IF EXISTS may_dev_inventario_sch_core.tbl_tipo_equipo;
DROP TABLE IF EXISTS may_dev_inventario_sch_core.tbl_sync_google_log;
DROP TABLE IF EXISTS may_dev_inventario_sch_core.tbl_silo;
DROP TABLE IF EXISTS may_dev_inventario_sch_core.tbl_cargo;
-- 5. funciones
DROP ROUTINE IF EXISTS may_dev_inventario_sch_core.fn_puede_recibir(p_usuario integer, p_articulo integer);
DROP TABLE IF EXISTS may_dev_inventario_sch_core.tbl_app_users;
DROP FUNCTION IF EXISTS may_dev_inventario_sch_core.fn_auth_uid();
DROP FUNCTION IF EXISTS may_dev_inventario_sch_core.fn_auth_role();
DROP FUNCTION IF EXISTS may_dev_inventario_sch_core.fn_auth_email();
DROP FUNCTION IF EXISTS may_dev_inventario_sch_core.fn_auth_jwt();
-- 6. secuencias y tipos
DROP SEQUENCE IF EXISTS may_dev_inventario_sch_core.seq_activo_id;
DROP SEQUENCE IF EXISTS may_dev_inventario_sch_core.seq_activo_movimiento_id;
DROP SEQUENCE IF EXISTS may_dev_inventario_sch_core.seq_articulo_id;
DROP SEQUENCE IF EXISTS may_dev_inventario_sch_core.seq_cargo_id;
DROP SEQUENCE IF EXISTS may_dev_inventario_sch_core.seq_departamento_id;
DROP SEQUENCE IF EXISTS may_dev_inventario_sch_core.seq_silo_id;
DROP SEQUENCE IF EXISTS may_dev_inventario_sch_core.seq_sync_google_log_id;
DROP SEQUENCE IF EXISTS may_dev_inventario_sch_core.seq_tipo_equipo_id;
DROP SEQUENCE IF EXISTS may_dev_inventario_sch_core.seq_usuario_id;
DROP SEQUENCE IF EXISTS may_dev_inventario_sch_core.seq_vacacion_id;
DROP TYPE IF EXISTS may_dev_inventario_sch_core.nivel_dotacion;
DROP TYPE IF EXISTS may_dev_inventario_sch_core.estado_usuario;
DROP TYPE IF EXISTS may_dev_inventario_sch_core.estado_activo;
DROP TYPE IF EXISTS may_dev_inventario_sch_core.accion_vacacion;
-- 7. extensiones
-- 8. esquemas (RESTRICT: falla si quedan objetos no generados por esta skill)
DROP SCHEMA IF EXISTS may_dev_inventario_sch_core;
-- 9. privilegios y default privileges de los roles en esta base
DROP OWNED BY ro_inventario, rw_inventario, ddl_inventario, admin_inventario;
COMMIT;

-- 10. Base de datos, usuarios y roles: requiere conexión a 'postgres' y CONFIRMACIÓN HUMANA.
--     Descomentar el bloque y ejecutarlo aparte.
-- >>> MANUAL_BEGIN <<<
-- \connect postgres
-- DROP DATABASE IF EXISTS may_dev_inventario_db;
-- DROP ROLE IF EXISTS usr_inventario_dba;
-- DROP ROLE IF EXISTS usr_inventario_deploy;
-- DROP ROLE IF EXISTS usr_inventario_app;
-- DROP ROLE IF EXISTS usr_inventario_report;
-- REVOKE admin_inventario FROM CURRENT_USER;
-- DROP ROLE IF EXISTS admin_inventario;
-- DROP ROLE IF EXISTS ddl_inventario;
-- DROP ROLE IF EXISTS rw_inventario;
-- DROP ROLE IF EXISTS ro_inventario;
-- >>> MANUAL_END <<<

\echo 'Rollback de objetos completado.'
