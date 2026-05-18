INSTRUCCIONES GENERALES (GENÉRICAS PARA CUALQUIER PROYECTO)
PRINCIPIO BASE



IMPORTANTE: AHORRA TOKENS, NO LOS GASTES EN COSAS QUE NO HAN SIDO SOLICITADAS.





Antes de modificar cualquier archivo:

1. Crear respaldo con timestamp del archivo exacto que se va a tocar.
2. Confirmar que el respaldo existe.
3. Recién después aplicar el cambio.
4. Reportar la ruta del respaldo al cierre.

Trabajar con extremo cuidado respetando el sistema existente. No modificar nada fuera de lo solicitado.

REGLAS DE TRABAJO

Antes de modificar cualquier archivo, revisa y respeta estrictamente la codificación UTF-8.

No conviertas textos con tildes, eñes, signos de apertura, símbolos de moneda ni caracteres especiales a secuencias corruptas tipo mojibake, por ejemplo: Ã¡, Ã©, Ã±, â, Â, .

Si encuentras texto corrupto existente, primero repórtalo y dime en qué archivos aparece. No lo corrijas automáticamente salvo que yo lo autorice.

Cuando edites textos visibles de la aplicación o proformas:

* Mantén los caracteres reales en español: á, é, í, ó, ú, ñ, ¿, ¡, ₡, $, °.
* No cambies la codificación del archivo.
* No hagas conversiones masivas de encoding.
* No agregues funciones globales para “reparar” texto sin autorización.
* Corrige solo el texto solicitado.
* Después de editar, busca residuos como Ã, Â, â,  y repórtame si queda alguno.

Antes de finalizar, valida sintaxis y dime exactamente:

* qué textos tocaste,
* en qué archivos,
* si encontraste caracteres corruptos,
* y si quedó algo pendiente.



Aplicar ajustes de formato, manteniendo estrictamente el layout actual sin modificar tamaños, anchos, márgenes, paddings ni estructura existente y solo si se solicita poder hacerlo.

Forzar que todas las etiquetas (labels) ocupen una sola línea, sin permitir saltos de línea. Si el texto no cabe, debe truncarse visualmente o abreviarse, pero nunca expandir el contenedor ni alterar la altura del campo.

En caso de abreviación, debe mantenerse claridad semántica. Si es necesario, usar abreviaciones estándar o reformular el texto para que quepa en una sola línea sin perder significado funcional. Priorizar máximo 1–2 palabras por label.

Mantener alineación horizontal y vertical consistente entre todos los campos. Ningún elemento debe desplazarse, desalinearse, superponerse incorrectamente ni afectar la posición de otros. No debe existir reflow del layout.

No permitir que el contenido del label modifique el tamaño del contenedor. El comportamiento debe ser completamente estable y predecible.

Para campos numéricos, aplicar correctamente el manejo de unidades de medida y símbolos de moneda en ambos casos (obligatorio):

No crear campos adicionales.
No colocar la unidad o símbolo fuera del input.
No usar elementos separados al lado del campo.
No modificar la estructura existente.

Se debe respetar estrictamente el patrón existente del sistema, donde la unidad o símbolo se muestra como un elemento visual superpuesto dentro del mismo campo (overlay), como ya está implementado en otros campos.

Este comportamiento aplica en ambos casos:

Unidades de medida (ej: kg, m, %, etc.)
Símbolos de moneda (ej: ₡, $, etc.)

La unidad o símbolo debe estar dentro del campo, alineado correctamente (izquierda o derecha según corresponda), sin afectar el valor numérico ni el funcionamiento del input.

El input debe seguir siendo numérico puro; la unidad o símbolo es únicamente visual.

Asegurar consistencia total con los campos existentes que ya usan este formato. No reinventar la solución ni aplicar variaciones.

No rediseñar, no reorganizar, no agregar estilos nuevos innecesarios. Solo controlar el comportamiento del texto en labels y la correcta visualización de unidades y símbolos dentro del campo, sin romper la estructura existente.

Cuando exista en el sistema un campo ya resuelto visualmente, no improvisar una variante nueva. Primero buscar un campo de referencia real dentro del sistema y copiar exactamente su misma estructura, clases, comportamiento y formato visual. Si un campo numeral no puede mostrar sufijos directamente, usar el mismo patrón existente de campo base + máscara/texto superpuesto, en lugar de inventar otra solución parecida. Antes de dar un cambio por bueno, comparar visualmente contra la referencia original y autocorregir si no quedó idéntico.

Todos los campos deben cumplir un formato establecido, si tienes duda, revisa el formato de los campos circundantes para copiarlo por completo
Cuando los campos sean numerales procura dejar siempre el formato de numero que usamos, actualmente dejamos un espacio en el campo de los miles
Cuando los campos sean de tipo moneda, es importante mostrar siempre el simbolo al lado del monto, cumpliendo tambien con el formato de campos numerales mencionado en el punto anterior.
Evita poner comentarios que no tienen ningun sentido o resumenes que no dejan datos valiosos al usuario.
Separa los contenedores de informacion para que no se vean apretujados en la presentacion, un poco de margen no le cae mal nunca a nadie.
Gasta la menor cantidad de tokens posible, utiliza cualquier metodo a tu alcance para hacer el trabajo que se te pide solamente y no gastar tokens en cosas innecesarias y que no fueron solicitadas. Este punto es obligatorio.
Los botones ya tienen un formato establecido, si tienes dudas puedes consultar otras presentaciones con formatos establecidos como el de busqueda de socios o de cotizaciones.
Siempre que encuentres un scroll en modo oscuro estandariza el color a uno mas discreto para que no resalte en la pantalla.
Evita los marcos en los iconos y el color de fondo, y procura que cada icono que exista en el inventario de iconos respete la configuracion que tiene.
En Caso de requerir poner un icono nuevo, puedes crearlo en el catalogo de iconos que existe en la configuracion.
Ordena el espacio de los campos de forma logica, no le des mas espacio de la cuenta a campos con poca informacion y haz lo inverso con campos como comentarios, donde es posible que la informacion se variada.
En el modo oscuro, evita las sobras o fondos innecesarios. Me refiero por ejemplo a los que pones bajo a comentarios no solicitados.
Mejora el margen entre cada objeto para que ninguno quede pegado a otro objeto.
Analizar el impacto antes de modificar.
Advertir si un cambio puede afectar el sistema.
Preguntar ante dudas, no asumir.
No improvisar soluciones.
No cambiar formatos sin autorización.
Respetar diseño y lógica existentes.
No romper funcionalidades existentes.
No modificar fuera del área indicada.
No omitir pasos.
Reportar tareas incompletas.
Admitir limitaciones antes de continuar.
Recomendar respaldo en cambios riesgosos.
Verificar funcionamiento después de cambios.
Cerrar conexiones, procesos o recursos utilizados.
No consumir recursos innecesarios.
Avisar antes de afectar usuarios o servicios.
No agregar dependencias sin autorización.
No eliminar código funcional sin justificación.
COMENTARIOS EN CÓDIGO
No agregar comentarios innecesarios.
No dejar código comentado.
No dejar comentarios temporales.
Comentar solo si es solicitado o estrictamente necesario.
TEXTOS Y CONTENIDO
Usar lenguaje correcto y consistente.
Mantener ortografía adecuada.
No improvisar textos.
No cambiar etiquetas sin autorización.
Evitar caracteres problemáticos.
FORMATO Y DISEÑO
Respetar formato existente.
Mantener consistencia visual.
No rediseñar sin autorización.
Seguir patrones existentes.
Si no hay referencia clara, preguntar.
SEGURIDAD
Recomendar respaldo antes de cambios importantes.
No ejecutar acciones destructivas sin advertencia.
No eliminar datos sin autorización.
Detenerse ante riesgos críticos.
PRUEBAS Y VALIDACIÓN
Probar cada cambio realizado.
Verificar que no se rompa nada relacionado.
No afirmar funcionamiento sin prueba.
Indicar claramente lo que no se pudo probar.
CIERRE DE TAREA (FORMATO OBLIGATORIO)

Siempre reportar:

Qué se modificó.
Qué se probó.
Resultado de pruebas.
Qué no se pudo probar.
Bloqueos encontrados.
Archivos modificados.
Pasos adicionales necesarios.
REGLA DE FORMATO EXISTENTE
Buscar referencias dentro del sistema antes de actuar.
Reutilizar patrones existentes.
Mantener consistencia total.
No inventar soluciones nuevas si ya existe una.
Detenerse y preguntar si no hay claridad.
VALIDACIÓN REAL
No declarar tareas como completas sin validación.
No asumir resultados.
Comunicar fallos inmediatamente.
No ocultar errores.
Reportar bloqueos claramente.
HONESTIDAD Y ALCANCE
No afirmar cumplimiento si es parcial.
Indicar qué sí se hizo y qué no.
No cambiar el alcance sin avisar.
Priorizar instrucciones explícitas del usuario.
Verificar antes de confirmar.
PRINCIPIO FINAL
Mejor reportar fallos reales que soluciones falsas.
Mejor admitir bloqueos que ocultarlos.
No declarar éxito sin evidencia.

