\set ON_ERROR_STOP on
-- Datos iniciales para may_qa_inventario_db (origen: semillas de database/source). Generado por la skill; no editar a mano.
-- Ejecutar DESPUÉS de aurora_postgresql_schema.sql, como master, sobre la base del aplicativo.
-- Re-ejecutable: las filas existentes (misma clave) se conservan.
BEGIN;
-- public.tipo_equipo → may_qa_inventario_sch_core.tbl_tipo_equipo (6 filas)
CREATE TEMP TABLE _stg_tbl_tipo_equipo (LIKE may_qa_inventario_sch_core.tbl_tipo_equipo) ON COMMIT DROP;
COPY _stg_tbl_tipo_equipo (id, nombre, activo) FROM stdin;
1	Laptop	t
2	Monitor	t
3	Teclado	t
4	Mouse	t
5	Headset	t
6	Base laptop	t
\.
INSERT INTO may_qa_inventario_sch_core.tbl_tipo_equipo (id, nombre, activo) SELECT id, nombre, activo FROM _stg_tbl_tipo_equipo ON CONFLICT DO NOTHING;
SELECT setval(s, GREATEST(m, 1), m IS NOT NULL) FROM (SELECT pg_get_serial_sequence('may_qa_inventario_sch_core.tbl_tipo_equipo', 'id') AS s, (SELECT max(id) FROM may_qa_inventario_sch_core.tbl_tipo_equipo) AS m) x WHERE s IS NOT NULL;
COMMIT;
\echo 'Datos iniciales cargados.'
