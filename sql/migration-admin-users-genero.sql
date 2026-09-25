-- Género del usuario, para elegir el ícono de vendedor correspondiente
-- (Configuración → Diseño → Iconos: orderVendedorHombre / orderVendedorMujer).
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS genero TEXT NOT NULL DEFAULT '';
