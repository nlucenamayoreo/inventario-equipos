# Prototipo de referencia

Archivos en formato Design Component (`.dc.html`) exportados del lienzo de diseño. No corren por sí solos
(dependen de un runtime del editor); léelos como especificación de pantallas y comportamiento:

- Plantilla HTML dentro de `<x-dc>`: estructura, textos y estilos de cada pantalla
  (`<sc-if>` = condicional, `<sc-for>` = repetición, `{{campo}}` = dato calculado en `renderVals()`).
- Clase `Component` en el `<script type="text/x-dc">`: estado, reglas de negocio y cálculos.
- `Usuarios.dc.html`, `Activos.dc.html`, `Catalogos.dc.html` solo abren `Main` en otra pestaña.

Lienzo original: https://claude.ai/artifact/QAwvtEXcri9NnpGMh9cufq
