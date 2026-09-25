-- Migración: historial de envío/recepción/cambios del proceso de Aprobaciones (ex Visto Bueno).
-- Cada fila es un evento (enviado al cliente / recibido del cliente / cambios solicitados por
-- el cliente) — el estado actual de una orden (pendiente de enviar / pendiente de recibir /
-- recibida) se deriva del último evento, no se guarda como columna aparte.

CREATE TABLE IF NOT EXISTS vb_historial (
    id SERIAL PRIMARY KEY,
    order_code TEXT NOT NULL,
    quote_code TEXT,
    line_code TEXT,
    evento TEXT NOT NULL CHECK (evento IN ('enviado', 'recibido', 'cambios_cliente')),
    motivo TEXT,
    registrado_por TEXT,
    registrado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vb_historial_orden ON vb_historial(order_code, registrado_en DESC);

-- Categoría del cambio pedido por el cliente (color/forma/tamaño/diseño/texto/material/otro),
-- solo aplica a evento='cambios_cliente' — permite indexar y analizar qué se falla más seguido.
ALTER TABLE vb_historial ADD COLUMN IF NOT EXISTS categoria TEXT;
