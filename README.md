# DashTotal SK · Tolcayuca

Nueva estructura del dashboard interno, preparada en feat/dashtotal-sk. No fusionar a main sin revisión del usuario. Sin configuración de Netlify ni despliegue.

## Archivos propuestos
- index.html: nueva portada y contenedor de navegación accesible.
- assets/styles.css: diseño adaptable a escritorio y móvil.
- assets/app.js: portada, registro de módulos, navegación por URL y vistas OTIF.
- assets/sheets.js: adaptador CSV de Google Sheets y cálculos puros.
- verify.mjs y package.json: comprobaciones de lógica sin dependencias.

## Fuente existente revisada
El index.html original leía Diario (gid 0), Atrasos (1719704144) y Sig día (1156833206), del mismo Sheet configurado en assets/sheets.js. Se conservan el parser CSV, normalización de encabezados y asignación de columnas. No se usa Drive ni se escribe en Sheets.

## Reglas OTIF
Cada fila con Pedido representa una unidad del conteo, igual que en Trafico; no se deduplican IDs porque podrían representar partidas.
OTIF = Entrega completa o dentro de tolerancia, con F entrega <= Fecha lista.
Entrega vacía = pendiente; Detenido también cuenta como pendiente de salida.
Pendientes incluidos en el denominador del porcentaje. Atrasos abiertos = Entrega sin completar, independientemente del compromiso.
Semáforo: rojo <85%, amarillo >=85% y <95%, verde >=95%.
Peso usa la unidad original (toneladas) y solo valores no negativos.
Fechas ambiguas usan DD/MM. Día actual según America/Mexico_City.
Histórico y acumulado ponderados directamente desde Diario; excluyen fechas posteriores al corte.
Días desde fecha lista y días de reprogramación se muestran por separado.

## Diferencias intencionales
Sin datos devuelve Sin datos, no 0%. Pedidos OTIF reemplaza el título engañoso Entregas completadas.
Incompleta no se clasifica como completa. Fechas imposibles se rechazan.
Contenido de Sheets escapado al mostrarlo. HTML de login y encabezados desconocidos producen un error visible.
Se conservan datos anteriores si falla la actualización; fecha de última lectura visible.
Histórico y departamentos se presentan como tablas, sin dependencias externas de gráficas.
Otros módulos son espacios pendientes de integrar; no muestran KPIs inventados.

## Uso y validación
Servir esta carpeta por HTTP local y abrir index.html; los módulos JavaScript requieren un servidor.
Ejecutar npm test o node verify.mjs para comprobar CSV, reglas OTIF, ponderación, fechas y atrasos.
La lectura real requiere que el endpoint CSV ya sea accesible desde el navegador. No se han cambiado permisos ni publicado el Sheet.
Este frontend no añade autenticación: el nombre interno no constituye un control de acceso. El acceso seguro debe definirse antes de un despliegue futuro.

