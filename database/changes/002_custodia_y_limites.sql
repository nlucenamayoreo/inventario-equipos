-- Custodia: todo equipo que no está en manos de su titular tiene un responsable de resguardo (operador).
-- Límite de equipos por persona y tipo (Laptop = 2: la propia y una de resguardo o préstamo).

ALTER TABLE tbl_activo ADD COLUMN custodio_id int;
ALTER TABLE tbl_activo ADD CONSTRAINT fk_activo_operador_custodio FOREIGN KEY (custodio_id) REFERENCES tbl_operador (id);
-- Equipos ya registrados sin titular: quedan a cargo del primer superadministrador, si ya existe.
UPDATE tbl_activo SET custodio_id = (
    SELECT o.id FROM tbl_operador o JOIN tbl_rol r ON r.id = o.rol_id
    WHERE r.es_sistema AND o.activo ORDER BY o.id LIMIT 1)
  WHERE estado IN ('disponible', 'en_resguardo', 'en_reparacion');
-- NOT VALID: se exige en todo alta o cambio; los equipos previos sin responsable lo reciben en su próximo
-- movimiento (la interfaz los muestra «sin responsable»).
ALTER TABLE tbl_activo ADD CONSTRAINT ck_activo_custodio
  CHECK (estado NOT IN ('disponible', 'en_resguardo', 'en_reparacion') OR custodio_id IS NOT NULL) NOT VALID;
CREATE INDEX idx_activo_custodio_id ON tbl_activo (custodio_id);

ALTER TABLE tbl_activo_movimiento ADD COLUMN custodio_anterior int;
ALTER TABLE tbl_activo_movimiento ADD COLUMN custodio_nuevo int;
ALTER TABLE tbl_activo_movimiento ADD CONSTRAINT fk_activo_movimiento_operador_anterior
  FOREIGN KEY (custodio_anterior) REFERENCES tbl_operador (id);
ALTER TABLE tbl_activo_movimiento ADD CONSTRAINT fk_activo_movimiento_operador_nuevo
  FOREIGN KEY (custodio_nuevo) REFERENCES tbl_operador (id);

-- NULL = 1 (la carga inicial de un ambiente nuevo inserta los tipos después de este cambio).
ALTER TABLE tbl_tipo_equipo ADD COLUMN max_por_usuario int;
ALTER TABLE tbl_tipo_equipo ADD CONSTRAINT ck_tipo_equipo_max_por_usuario
  CHECK (max_por_usuario IS NULL OR max_por_usuario >= 1);
UPDATE tbl_tipo_equipo SET max_por_usuario = 2 WHERE lower(nombre) = 'laptop';
