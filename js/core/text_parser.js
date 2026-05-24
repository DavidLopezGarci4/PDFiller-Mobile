// PDFiller 2 - Text Parsing and Coordinate Clustering Module
window.parsePdfTextContent = async (page, viewport) => {
    const pageNum = page.pageNumber || window.pdfPageNum || 1;
    console.log(`Iniciando extracción y parseo de campos para página ${pageNum}...`);
    const textContent = await page.getTextContent();
    const dropdown = document.getElementById('fields-dropdown');
    
    // Resetear dropdown (guardando la opción por defecto)
    dropdown.innerHTML = '<option value="" disabled selected>Selecciona un campo para editar...</option>';

    // Array interno para almacenar los campos editables
    const fields = [];

    // Agrupación en secciones lógicas basadas en la posición vertical Y (porcentajes de la página)
    const sections = {
        cabecera: { name: '📌 Cabecera e Información General', items: [] },
        datos: { name: '👤 Datos de Cliente y Facturación', items: [] },
        tabla: { name: '📊 Tabla de Conceptos', items: [] },
        totales: { name: '💰 Totales e Impuestos', items: [] },
        pie: { name: '🖋️ Notas y Firmas', items: [] }
    };

    // Procesar cada bloque de texto devuelto por PDF.js
    textContent.items.forEach((item, index) => {
        const str = item.str.trim();
        if (!str || str.length < 2) return; // Omitir espacios vacíos y caracteres aislados

        // Determinar alto de fuente de forma ultra-segura (PDF.js height o transform scale)
        let fontHeight = item.height;
        if (!fontHeight && item.transform && item.transform[3]) {
            fontHeight = Math.abs(item.transform[3]);
        }
        if (!fontHeight || isNaN(fontHeight)) {
            fontHeight = 12; // Fallback razonable
        }

        // Determinar ancho de fuente de forma ultra-segura (PDF.js width o estimación según caracteres)
        let textWidth = item.width;
        if (!textWidth || isNaN(textWidth)) {
            textWidth = str.length * fontHeight * 0.55; 
        }

        // PDF.js devuelve la matriz de transformación: [scaleX, skewY, skewX, scaleY, transX, transY]
        // Convertimos a coordenadas de pantalla (píxeles con escala adaptada)
        const tx = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
        
        // Coordenadas corregidas (Y en PDF empieza abajo, en HTML empieza arriba)
        const x = tx[0];
        const y = tx[1] - (fontHeight * window.pdfScale); // Desplazamiento para alinear base
        const width = textWidth * window.pdfScale;
        const height = fontHeight * window.pdfScale;

        // Determinar estilo de tipografía (PDF.js provee metadatos del font)
        const fontName = item.fontName || 'Helvetica';
        const fontSizePx = Math.round(fontHeight * window.pdfScale);
        
        // Determinar sección según porcentaje de altura del PDF
        const yPercent = (y / viewport.height) * 100;
        let sectionKey = 'cabecera';

        if (yPercent < 22) {
            sectionKey = 'cabecera';
        } else if (yPercent >= 22 && yPercent < 36) {
            sectionKey = 'datos';
        } else if (yPercent >= 36 && yPercent < 56) {
            sectionKey = 'tabla';
        } else if (yPercent >= 56 && yPercent < 72) {
            sectionKey = 'totales';
        } else {
            sectionKey = 'pie';
        }

        const fieldId = `field_${index}`;
        const fieldData = {
            id: fieldId,
            text: str,
            originalText: str, // NUEVO: Guardar el texto original de la factura para detectar modificaciones
            x: x,
            y: y,
            startX: x, // Coordenadas de inicio de vista originales (para el parche corrector)
            startY: y,
            width: width + 20, // Agregar padding extra para editar cómodamente
            height: height + 6,
            fontSize: fontSizePx,
            fontName: fontName,
            yPercent: yPercent,
            sectionKey: sectionKey, // Guardar la sección a la que pertenece
            originalX: item.transform[4], // Coordenadas PDF originales para exportación
            originalY: item.transform[5],
            originalFontSize: fontHeight,
            pageNum: pageNum // Guardar número de página!
        };

        if (index < 5) {
            console.log(`[TextParser] Campo parseado #${index}: "${str}" en [X:${Math.round(x)}, Y:${Math.round(y)}] - Alto: ${Math.round(height)}px`);
        }

        fields.push(fieldData);
        sections[sectionKey].items.push(fieldData);
    });

    // Rellenar el dropdown agrupado
    Object.keys(sections).forEach(key => {
        const sec = sections[key];
        if (sec.items.length === 0) return;

        const optGroup = document.createElement('optgroup');
        optGroup.label = sec.name;

        sec.items.forEach(field => {
            const opt = document.createElement('option');
            opt.value = field.id;
            // Mostrar texto truncado si es demasiado largo
            const previewText = field.text.length > 25 ? field.text.substring(0, 25) + '...' : field.text;
            opt.textContent = `${previewText} [Font: ${field.fontSize}px]`;
            optGroup.appendChild(opt);
        });

        dropdown.appendChild(optGroup);
    });

    // Guardar lista en variable global (preservando campos de otras páginas y estampas de esta página)
    window.pdfFields = (window.pdfFields || []).filter(f => f.pageNum !== pageNum || f.isStamp);
    window.pdfFields = [...window.pdfFields, ...fields];

    // Actualizar HUD de diagnóstico
    const hudScale = document.getElementById('hud-scale');
    const hudFields = document.getElementById('hud-fields');
    if (hudScale) hudScale.textContent = window.pdfScale.toFixed(2);
    if (hudFields) hudFields.textContent = window.pdfFields.length;
    
    if (window.editorModule && window.editorModule.initFieldsOverlay) {
        window.editorModule.initFieldsOverlay(window.pdfFields);
    }
};
