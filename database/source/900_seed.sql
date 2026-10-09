-- Catálogo base: tipos de equipo (sin datos de personas)
INSERT INTO tipo_equipo (nombre) VALUES
  ('Laptop'), ('Monitor'), ('Teclado'), ('Mouse'), ('Headset'), ('Base laptop')
ON CONFLICT DO NOTHING;
