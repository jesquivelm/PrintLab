-- Configuración de la programación de producción (Gantt / Reprogramar Producción).
--
-- Cuándo usarlo: después de restaurar la base de datos desde un respaldo anterior a
-- esta configuración. ANTES, arranca una vez el servidor con el código nuevo: al
-- arrancar crea solo las tablas y columnas nuevas (ensureProgramacionSchema, etc.).
--
-- Es seguro correrlo más de una vez: solo completa lo que falta, no borra nada.
-- Revisa los resultados de las consultas del final.

BEGIN;

-- 1) Horario de producción: lunes a sábado de 6:00 a 14:00 (domingo sin turno).
DO $$
DECLARE cal UUID;
BEGIN
    SELECT id INTO cal FROM resource_calendars WHERE calendar_name = 'Producción L-S 6:00-14:00' LIMIT 1;
    IF cal IS NULL THEN
        INSERT INTO resource_calendars (calendar_name, description, resource_type, resource_name, timezone)
        VALUES ('Producción L-S 6:00-14:00', 'Turno de planta de lunes a sábado', 'process', 'Producción', 'America/Costa_Rica')
        RETURNING id INTO cal;
        INSERT INTO resource_shifts (calendar_id, shift_name, day_of_week, start_hour, end_hour, valid_from, created_by)
        SELECT cal, 'Turno', d, 6, 14, DATE '2020-01-01', 'configurar-programacion.sql'
          FROM generate_series(1, 6) AS d;
    END IF;
END $$;

-- 2) Procesos del Gantt (Costos → Procesos del Cálculo → "Activo en Gantt"):
--    Impresión → Rebobinado → Empaque. Si el proceso no tiene horario, se le asigna el
--    de producción. Impresión debe terminar dentro del turno.
UPDATE costo_proceso_defaults
   SET gantt_habilitado = TRUE,
       activo = TRUE,
       calendario_id = COALESCE(calendario_id, (SELECT id FROM resource_calendars WHERE calendar_name = 'Producción L-S 6:00-14:00' LIMIT 1))
 WHERE proceso_key IN ('impresion', 'rebobinado', 'empaque');

UPDATE costo_proceso_defaults SET terminar_en_turno = TRUE WHERE proceso_key = 'impresion';

-- Los demás procesos no se muestran en el Gantt (Diseño, Preprensa, Aprobaciones… se
-- manejan en Seguimiento). Si quieres alguno en el Gantt, márcalo en Costos.
UPDATE costo_proceso_defaults SET gantt_habilitado = FALSE
 WHERE proceso_key NOT IN ('impresion', 'rebobinado', 'empaque') AND gantt_habilitado = TRUE;

-- 3) Máquinas ligadas a su proceso: Gallus → Impresión, BROTECH → Rebobinado.
--    (Empaque es una estación sin máquina: usa el horario del proceso.)
INSERT INTO proceso_maquina (maquina_id, proceso_key)
SELECT m.id, v.proceso_key
  FROM (VALUES ('%gallus%', 'impresion'), ('%brotech%', 'rebobinado')) AS v(patron, proceso_key)
  JOIN maquina m ON m.nombre ILIKE v.patron
 WHERE NOT EXISTS (SELECT 1 FROM proceso_maquina pm WHERE pm.maquina_id = m.id AND pm.proceso_key = v.proceso_key);

COMMIT;

-- 4) Revisión: así quedó.
SELECT proceso_key, etiqueta, orden, gantt_habilitado, terminar_en_turno,
       (SELECT calendar_name FROM resource_calendars c WHERE c.id = d.calendario_id) AS horario
  FROM costo_proceso_defaults d
 WHERE gantt_habilitado
 ORDER BY orden;

SELECT m.nombre AS maquina, pm.proceso_key,
       (SELECT calendar_name FROM resource_calendars c WHERE c.id = pm.calendario_id) AS horario_propio
  FROM proceso_maquina pm JOIN maquina m ON m.id = pm.maquina_id
 ORDER BY pm.proceso_key, m.nombre;

SELECT c.calendar_name, s.day_of_week, s.start_hour, s.end_hour
  FROM resource_calendars c JOIN resource_shifts s ON s.calendar_id = c.id AND s.is_active
 ORDER BY c.calendar_name, s.day_of_week;
