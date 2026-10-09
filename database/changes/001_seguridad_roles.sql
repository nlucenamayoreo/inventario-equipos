-- Seguridad: permisos, roles configurables y operadores (personas con acceso a la aplicación).
-- El grupo de Cognito admin_ti sigue siendo superadministrador (arranque); el resto se gestiona aquí.

CREATE TABLE tbl_permiso (
  codigo      text NOT NULL,
  modulo      text NOT NULL,
  descripcion text NOT NULL,
  CONSTRAINT pk_permiso PRIMARY KEY (codigo)
);

CREATE TABLE tbl_rol (
  id          serial NOT NULL,
  nombre      text NOT NULL,
  descripcion text,
  es_sistema  boolean NOT NULL DEFAULT false,   -- superadmin: todos los permisos, no editable
  activo      boolean NOT NULL DEFAULT true,
  creado_en   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_rol PRIMARY KEY (id)
);
CREATE UNIQUE INDEX uidx_rol_nombre ON tbl_rol (lower(nombre));

CREATE TABLE tbl_rol_permiso (
  rol_id         int NOT NULL,
  permiso_codigo text NOT NULL,
  CONSTRAINT pk_rol_permiso PRIMARY KEY (rol_id, permiso_codigo),
  CONSTRAINT fk_rol_permiso_rol FOREIGN KEY (rol_id) REFERENCES tbl_rol (id) ON DELETE CASCADE,
  CONSTRAINT fk_rol_permiso_permiso FOREIGN KEY (permiso_codigo) REFERENCES tbl_permiso (codigo)
);

CREATE TABLE tbl_operador (
  id             serial NOT NULL,
  correo         text NOT NULL,
  nombre         text NOT NULL,
  rol_id         int NOT NULL,
  activo         boolean NOT NULL DEFAULT true,
  invitado_por   text,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_operador PRIMARY KEY (id),
  CONSTRAINT fk_operador_rol FOREIGN KEY (rol_id) REFERENCES tbl_rol (id)
);
CREATE UNIQUE INDEX uidx_operador_correo ON tbl_operador (lower(correo));
CREATE INDEX idx_operador_rol_id ON tbl_operador (rol_id);
COMMENT ON TABLE tbl_operador IS 'Personas con acceso a la aplicación (Cognito) y su rol; pueden custodiar equipos.';

INSERT INTO tbl_permiso (codigo, modulo, descripcion) VALUES
  ('catalogos.gestionar',      'Catálogos',      'Silos, departamentos, tipos de equipo y perfiles de dotación por cargo'),
  ('articulos.gestionar',      'Catálogos',      'Marcas, modelos, características y artículos'),
  ('usuarios.gestionar',       'Usuarios',       'Crear, editar, vacaciones, desactivar, eliminar y carga masiva de colaboradores'),
  ('activos.registrar',        'Activos',        'Registrar activos y carga masiva de activos'),
  ('activos.asignar',          'Activos',        'Asignar desde stock, liberar, recibir y cambiar estado de activos'),
  ('reasignaciones.solicitar', 'Reasignaciones', 'Solicitar la reasignación de un equipo a otra persona'),
  ('reasignaciones.aprobar',   'Reasignaciones', 'Aprobar o rechazar reasignaciones'),
  ('seguridad.gestionar',      'Seguridad',      'Roles, permisos y personas con acceso');

INSERT INTO tbl_rol (nombre, descripcion, es_sistema) VALUES
  ('Superadministrador', 'Ve y puede hacer todo', true),
  ('Administrador Intelix', 'Catálogos, artículos, activos, asignaciones y colaboradores', false),
  ('Analista Intelix', 'Carga y asigna dispositivos', false),
  ('Gerente de sistemas', 'Aprueba reasignaciones y gestiona colaboradores y catálogos', false),
  ('Visitante', 'Solo lectura', false);

INSERT INTO tbl_rol_permiso (rol_id, permiso_codigo)
SELECT r.id, p.codigo
FROM tbl_rol r
JOIN tbl_permiso p ON
  (r.nombre = 'Administrador Intelix' AND p.codigo IN ('catalogos.gestionar', 'articulos.gestionar', 'usuarios.gestionar',
                                                       'activos.registrar', 'activos.asignar', 'reasignaciones.solicitar'))
  OR (r.nombre = 'Analista Intelix' AND p.codigo IN ('activos.registrar', 'activos.asignar', 'reasignaciones.solicitar'))
  OR (r.nombre = 'Gerente de sistemas' AND p.codigo IN ('reasignaciones.aprobar', 'reasignaciones.solicitar',
                                                        'usuarios.gestionar', 'catalogos.gestionar'));
