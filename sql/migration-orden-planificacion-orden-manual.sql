-- Agrega el campo que guarda el orden manual que Planeación arma arrastrando
-- las tarjetas del Pipeline. Antes ese orden solo vivía en el navegador y se
-- perdía al recargar; con esta columna sí se guarda y Producción lo respeta.
ALTER TABLE orden_planificacion
    ADD COLUMN IF NOT EXISTS orden_manual INTEGER;

COMMENT ON COLUMN orden_planificacion.orden_manual IS
    'Posición manual asignada por Planeación al arrastrar la tarjeta en el Pipeline. NULL = sin posición manual asignada.';
