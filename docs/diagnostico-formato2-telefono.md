# Diagnóstico — Formato 2 no aparece en el teléfono (2026-09-22)

## Síntoma
Desde el teléfono, cualquier navegador muestra la app móvil vieja
(`vendedores-mobile.html`) en lugar del Formato 2 nuevo
(`vendedores-mobile-v2.html`), incluso tras reiniciar el servidor y probar
navegadores recién instalados.

## Lo que YA está hecho y verificado (no repetir)

1. **`renderSellerMobileHtml()` en server.js (~línea 4755)** ahora devuelve
   `vendedores-mobile-v2.html`. Verificado.
2. **Rutas `/cotizaciones` y `/vendedores`** (server.js ~36128 y ~36150) sirven
   el Formato 2 cuando `shouldServeSellerMobile()` responde true.
   Verificado con curl y User-Agent de iPhone: entregan v2.
3. **Regla para `/vendedores-mobile.html`** agregada en server.js línea ~1899,
   ANTES de `express.static` (línea ~1903), para que pedir el archivo viejo
   directamente entregue el Formato 2. **Esta regla estaba declarada primero
   al final del archivo (después de static), donde nunca se ejecutaba — ese
   era casi con certeza el hueco por el que el teléfono veía la versión vieja.**
   Requiere **reiniciar el servidor** para activarse (verificado: el servidor
   actual arrancó 23:06:53 y todavía entrega el archivo viejo en esa ruta).
4. IP de la máquina en la red: `10.212.134.104:3000` entrega v2 (verificado
   con curl). También el puerto 3011 (segundo servidor de pruebas) entrega v2.
5. Caché: los HTML se sirven con `Cache-Control: no-cache`, los assets JS/CSS
   del Formato 2 llevan `?v=20260922-formato2c`. No hay service worker.
   El manifest.json apunta a `start_url: "/"`.
6. Permisos: el usuario `jesquiv` es "Implementadores" con acceso completo a
   vendedores; su entrada predeterminada es `dashboard` (no afecta).

## Siguiente paso pendiente (no ejecutado por falta de reinicio)

Reiniciar el servidor (proceso node del puerto 3000) y verificar:

```
curl -s http://localhost:3000/vendedores-mobile.html | grep -o "vendedores-mobile-v2.css"
```

Debe responder `vendedores-mobile-v2.css`. Antes del reinicio responde
`vendedores-mobile.css` (versión vieja) — así se confirma que la regla ya está activa.

Si después del reinicio el teléfono sigue viendo la vieja por la ruta directa,
revisar si el teléfono entra por otra máquina (producción) y no por esta.

## Copias de seguridad (en E:\Github\Adicionales\backups)
- server.js.backup.ruta-vieja-formato2.20260922-210000
- server.js.backup.ruta-vieja.20260922-230051
- vendedores-mobile-v2.*.backup.formato2-redesign.20260922-201829 (los 3 archivos originales del Formato 2)
