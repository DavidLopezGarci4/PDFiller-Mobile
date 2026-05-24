# Prototipo Premium PDFiller 2 📱

¡Bienvenido al prototipo de desarrollo de **PDFiller 2**! Esta es una aplicación de edición de PDF completamente responsiva, optimizada para pantallas táctiles móviles, desarrollada enteramente en el lado del cliente (Client-Side) utilizando estándares web modernos (HTML5, Vanilla CSS3 y JavaScript ES6).

## 🚀 Características Premium Integradas

1. **Visor Responsive Adaptativo**: Carga y escala automáticamente cualquier documento PDF para que encaje de forma cómoda en pantallas móviles.
2. **Edición WYSIWYG en Caliente**: Toca cualquier campo de texto para editarlo directamente encima del documento. La tipografía, peso y tamaño de fuente se clonan dinámicamente de los metadatos del PDF.
3. **Detector Inteligente de Solapamiento y Colisiones 💡**:
   - Los campos de texto pueden expandirse libremente sin límites rígidos de longitud de caracteres.
   - Si un campo se solapa o pisa a otro al escribir o arrastrarse, aparece instantáneamente una **bombilla de alerta (`💡`)** en la esquina superior del elemento.
   - En el mismo momento del conflicto, un **banner dinámico rojo** aparece en la cabecera indicando los campos en colisión.
   - Al pulsar en "Guardar" o "Guardar como", un **banner modal restrictivo** te advertirá del conflicto de diseño antes de iniciar la compilación.
4. **Arrastre Táctil con Magnetismo (Autosnap)**: Arrastra campos, firmas o corrector con presionar y mantener, con guías de alineación inteligentes que facilitan un diseño limpio y profesional.
5. **Sección Rellenar (Texto Libre, Iconos y Corrector)**:
   - Estampa textos nuevos en cualquier punto.
   - Coloca iconos de verificación y marcas (Ticks, Cruces, Estrellas, etc.).
   - Utiliza el **Corrector (Whiteout)** de blanqueo digital, el cual genera cajas blancas redimensionables para cubrir partes no deseadas de la factura.
6. **Sección Firmas**:
   - Lienzo táctil para capturar tu firma a mano alzada.
   - Guarda tus firmas localmente de forma privada en el almacenamiento del navegador (`localStorage`).
   - Toca y arrastra tus firmas guardadas para estamparlas y escalarlas donde desees en el documento.
7. **Pinch-to-Zoom & Dual-Finger Pan**: Soporte táctil completo para ampliar con pellizcos de dos dedos y desplazarse cómodamente en pantallas pequeñas.
8. **Compilación de PDF Nativa**: Utiliza `pdf-lib` en cliente para fusionar todas tus firmas, textos nuevos y correctores directamente de vuelta en las coordenadas binarias del archivo original, generando un PDF real descargable en un clic.

---

## 📂 Arquitectura del Proyecto

El proyecto está diseñado bajo una arquitectura limpia y modular de frontend:
```
pdfiller2_prototype/
├── index.html            # Interfaz responsive base, panels deslizantes y diálogos
├── index.css             #tokens de diseño oscuro profundo, animaciones y glassmorphism
├── README.md             # Este manual de instrucciones
├── assets/
│   ├── sample_invoice.pdf# PDF de prueba profesional de Factura autogenerada
│   └── generate_sample_pdf.py # Script de Python que generó la factura muestra
├── js/
│   ├── app.js            # Controlador e inicializador global del sistema
│   ├── core/
│   │   ├── pdf_render.js # Renderizado responsivo de páginas en Lienzo Canvas
│   │   └── text_parser.js# Extracción de coordenadas e indexado de dropdown agrupado
│   ├── modules/
│   │   ├── editor.js     # WYSIWYG contenteditable, AABB colisiones y bombilla 💡
│   │   ├── fill_tools.js # Rellenar textos libres, selector de iconos y Corrector blanco
│   │   ├── signatures.js # Signature Pad en Canvas, localStorage y stamping
│   │   └── export.js     # Fusión de bytes finales con pdf-lib y descargas
│   └── utils/
│       └── gestures.js   # Captura multitáctil de pellizcos zoom e inercia
```

---

## 🛠️ Cómo Ejecutar el Prototipo en tu Ordenador

La aplicación funciona enteramente en el navegador. Debido a que utiliza llamadas asíncronas para cargar el PDF (`fetch`), los navegadores modernos requieren que el proyecto se ejecute sobre un servidor web local (en lugar de hacer doble clic directo sobre el archivo HTML local, para evitar restricciones de seguridad CORS).

Tienes dos formas sumamente fáciles de iniciarlo en segundos:

### Opción A: Usando la terminal (¡Súper Rápido!)
Si tienes instalado Node.js en tu ordenador, puedes iniciar un servidor web local en la carpeta del prototipo ejecutando un solo comando en tu consola de comandos (dentro de la carpeta `pdfiller2_prototype`):

```bash
npx live-server
```
*Esto abrirá la aplicación en tu navegador web de inmediato (usualmente en `http://127.0.0.1:8080`).*

### Opción B: Usando la extensión Live Server de VS Code
1. Abre la carpeta `pdfiller2_prototype` en tu IDE o editor de texto favorito (como Visual Studio Code).
2. Si tienes instalada la popular extensión **Live Server** (de Ritwick Dey), haz clic derecho sobre `index.html` y selecciona **Open with Live Server**.
3. ¡Listo! Se iniciará el servidor de forma transparente.

---

## 📱 Recomendación de Prueba Táctil Responsive

Para simular una pantalla móvil táctil y probar todas las interacciones responsivas cómodamente en tu ordenador:
1. Abre la aplicación en tu navegador Chrome o Edge.
2. Presiona `F12` para abrir las Herramientas del Desarrollador (DevTools).
3. Haz clic en el icono de **Simulador de Dispositivo Móvil** (arriba a la izquierda de las DevTools, que parece una tablet y un teléfono).
4. Elige un modelo móvil premium de la lista superior (ej. *iPhone 14 Pro* o *Samsung Galaxy S23*) y ajusta el zoom de simulación al 100%.
5. **¡Listo!** El ratón se convertirá en un cursor táctil circular simulando pulsaciones reales. Toca en "Editar", arrastra las cajas con arrastre largo y edita textos libremente.
