// PDFiller 2 - PDF.js Render Module
window.renderPdfPage = async (pageNum) => {
    if (!window.pdfInstance) return;

    console.log(`Renderizando página ${pageNum}...`);
    const canvas = document.getElementById('pdf-canvas');
    const overlay = document.getElementById('pdf-overlay');
    const workspace = document.getElementById('workspace-container');
    const ctx = canvas.getContext('2d');

    // Limpiar contenido previo de overlays
    overlay.innerHTML = '';

    // Cargar la página desde PDF.js
    const page = await window.pdfInstance.getPage(pageNum);

    // Calcular escala adaptable al tamaño de pantalla del móvil
    const workspaceWidth = workspace.clientWidth - 20; // 10px padding a cada lado
    const originalViewport = page.getViewport({ scale: 1.0 });
    
    // Auto-ajustar escala a móviles
    window.pdfScale = workspaceWidth / originalViewport.width;
    // Poner un límite para que no sea excesivamente grande, pero sí cubra la pantalla
    if (window.pdfScale > 1.5) window.pdfScale = 1.2;
    if (window.pdfScale < 0.5) window.pdfScale = 0.6;

    console.log(`Escala calculada para responsive: ${window.pdfScale}`);
    const viewport = page.getViewport({ scale: window.pdfScale });

    // Configurar dimensiones de canvas
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Configurar dimensiones de la caja contenedora
    const viewportEl = document.getElementById('pdf-viewport');
    viewportEl.style.width = `${viewport.width}px`;
    viewportEl.style.height = `${viewport.height}px`;

    // Renderizar página en canvas
    const renderContext = {
        canvasContext: ctx,
        viewport: viewport
    };

    await page.render(renderContext).promise;
    console.log('Página renderizada visualmente.');

    // Ejecutar el parser de texto para inyectar los campos editables
    if (window.parsePdfTextContent) {
        await window.parsePdfTextContent(page, viewport);
    }
};
