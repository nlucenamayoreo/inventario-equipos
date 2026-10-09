-- Reasignaciones (pasar un equipo de una persona a otra): quedan pendientes hasta que el gerente aprueba.

CREATE TYPE estado_reasignacion AS ENUM ('pendiente', 'aprobada', 'rechazada', 'cancelada');

CREATE TABLE tbl_reasignacion (
  id              serial NOT NULL,
  activo_id       int NOT NULL,
  usuario_origen  int NOT NULL,
  usuario_destino int NOT NULL,
  motivo          text NOT NULL,
  estado          estado_reasignacion NOT NULL DEFAULT 'pendiente',
  solicitado_por  int NOT NULL,
  solicitado_en   timestamptz NOT NULL DEFAULT now(),
  resuelto_por    int,
  resuelto_en     timestamptz,
  comentario      text,
  CONSTRAINT pk_reasignacion PRIMARY KEY (id),
  CONSTRAINT fk_reasignacion_activo FOREIGN KEY (activo_id) REFERENCES tbl_activo (id),
  CONSTRAINT fk_reasignacion_usuario_origen FOREIGN KEY (usuario_origen) REFERENCES tbl_usuario (id),
  CONSTRAINT fk_reasignacion_usuario_destino FOREIGN KEY (usuario_destino) REFERENCES tbl_usuario (id),
  CONSTRAINT fk_reasignacion_operador_solicita FOREIGN KEY (solicitado_por) REFERENCES tbl_operador (id),
  CONSTRAINT fk_reasignacion_operador_resuelve FOREIGN KEY (resuelto_por) REFERENCES tbl_operador (id),
  CONSTRAINT ck_reasignacion_destino CHECK (usuario_destino <> usuario_origen),
  CONSTRAINT ck_reasignacion_resuelta CHECK ((estado = 'pendiente') = (resuelto_en IS NULL))
);
CREATE UNIQUE INDEX uidx_reasignacion_pendiente ON tbl_reasignacion (activo_id) WHERE estado = 'pendiente';
CREATE INDEX idx_reasignacion_estado ON tbl_reasignacion (estado, solicitado_en DESC);
COMMENT ON TABLE tbl_reasignacion IS 'Solicitudes de reasignación de equipos entre personas y su aprobación.';
