-- Marcas y modelos seleccionables; características por tipo de equipo con valores predefinidos.

CREATE TABLE tbl_marca (
  id     serial NOT NULL,
  nombre text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT pk_marca PRIMARY KEY (id)
);
CREATE UNIQUE INDEX uidx_marca_nombre ON tbl_marca (lower(nombre));

CREATE TABLE tbl_modelo (
  id       serial NOT NULL,
  marca_id int NOT NULL,
  tipo_id  int NOT NULL,
  nombre   text NOT NULL,
  activo   boolean NOT NULL DEFAULT true,
  CONSTRAINT pk_modelo PRIMARY KEY (id),
  CONSTRAINT fk_modelo_marca FOREIGN KEY (marca_id) REFERENCES tbl_marca (id),
  CONSTRAINT fk_modelo_tipo_equipo FOREIGN KEY (tipo_id) REFERENCES tbl_tipo_equipo (id)
);
CREATE UNIQUE INDEX uidx_modelo_marca_tipo_nombre ON tbl_modelo (marca_id, tipo_id, lower(nombre));

CREATE TABLE tbl_caracteristica (
  id      serial NOT NULL,
  tipo_id int NOT NULL,
  nombre  text NOT NULL,
  activo  boolean NOT NULL DEFAULT true,
  CONSTRAINT pk_caracteristica PRIMARY KEY (id),
  CONSTRAINT fk_caracteristica_tipo_equipo FOREIGN KEY (tipo_id) REFERENCES tbl_tipo_equipo (id)
);
CREATE UNIQUE INDEX uidx_caracteristica_tipo_nombre ON tbl_caracteristica (tipo_id, lower(nombre));

CREATE TABLE tbl_caracteristica_valor (
  id                serial NOT NULL,
  caracteristica_id int NOT NULL,
  valor             text NOT NULL,
  activo            boolean NOT NULL DEFAULT true,
  CONSTRAINT pk_caracteristica_valor PRIMARY KEY (id),
  CONSTRAINT fk_caracteristica_valor_caracteristica FOREIGN KEY (caracteristica_id) REFERENCES tbl_caracteristica (id)
);
CREATE UNIQUE INDEX uidx_caracteristica_valor ON tbl_caracteristica_valor (caracteristica_id, lower(valor));

ALTER TABLE tbl_articulo ADD COLUMN modelo_id int;
ALTER TABLE tbl_articulo ADD CONSTRAINT fk_articulo_modelo FOREIGN KEY (modelo_id) REFERENCES tbl_modelo (id);
CREATE INDEX idx_articulo_modelo_id ON tbl_articulo (modelo_id);

CREATE TABLE tbl_articulo_caracteristica (
  articulo_id       int NOT NULL,
  caracteristica_id int NOT NULL,
  valor_id          int NOT NULL,
  CONSTRAINT pk_articulo_caracteristica PRIMARY KEY (articulo_id, caracteristica_id),
  CONSTRAINT fk_articulo_caracteristica_articulo FOREIGN KEY (articulo_id) REFERENCES tbl_articulo (id) ON DELETE CASCADE,
  CONSTRAINT fk_articulo_caracteristica_caracteristica FOREIGN KEY (caracteristica_id) REFERENCES tbl_caracteristica (id),
  CONSTRAINT fk_articulo_caracteristica_valor FOREIGN KEY (valor_id) REFERENCES tbl_caracteristica_valor (id)
);

-- Artículos existentes: crear sus marcas y modelos y vincularlos.
INSERT INTO tbl_marca (nombre)
SELECT DISTINCT ON (lower(marca)) marca FROM tbl_articulo ORDER BY lower(marca), marca
ON CONFLICT DO NOTHING;
INSERT INTO tbl_modelo (marca_id, tipo_id, nombre)
SELECT DISTINCT ON (m.id, a.tipo_id, lower(a.modelo)) m.id, a.tipo_id, a.modelo
FROM tbl_articulo a JOIN tbl_marca m ON lower(m.nombre) = lower(a.marca)
ORDER BY m.id, a.tipo_id, lower(a.modelo)
ON CONFLICT DO NOTHING;
UPDATE tbl_articulo a SET modelo_id = mo.id
FROM tbl_modelo mo JOIN tbl_marca ma ON ma.id = mo.marca_id
WHERE a.modelo_id IS NULL AND mo.tipo_id = a.tipo_id
  AND lower(ma.nombre) = lower(a.marca) AND lower(mo.nombre) = lower(a.modelo);
