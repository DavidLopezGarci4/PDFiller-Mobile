// PDFiller 2 - Unified Zoom & Mobile Gestures Engine
window.viewportZoom = 1.0;

// Definición global del motor de zoom con compensación de scrollbar
window.setViewportZoom = (zoomFactor) => {
    // Limitar zoom entre 0.5x (50%) y 3.0x (300%)
    const scale = Math.min(Math.max(zoomFactor, 0.5), 3.0);
    window.viewportZoom = scale;
    
    const viewport = document.getElementById('pdf-viewport');
    if (viewport) {
        viewport.style.transform = `scale(${scale})`;
        
        // Resetear minWidth para limpiar cualquier rastro previo y evitar el bucle acumulativo
        viewport.style.minWidth = '';
        
        // Leer dimensiones originales inalterables en px directo de los estilos inline
        const originalWidth = parseFloat(viewport.style.width) || 800;
        const originalHeight = parseFloat(viewport.style.height) || 1100;
        
        // Compensar el margen inferior del viewport para que el scroll vertical funcione perfectamente
        const extraBottomMargin = Math.max(140, 140 + originalHeight * (scale - 1));
        viewport.style.marginBottom = `${extraBottomMargin}px`;
        
        // Compensar el ancho para scrollbars horizontales sin interferir con el layout
        if (scale > 1.0) {
            const extraSideMargin = (originalWidth * (scale - 1)) / 2;
            viewport.style.marginLeft = `${Math.max(10, extraSideMargin)}px`;
            viewport.style.marginRight = `${Math.max(10, extraSideMargin)}px`;
        } else {
            viewport.style.marginLeft = 'auto';
            viewport.style.marginRight = 'auto';
        }
    }

    // Sincronizar UI de controles de zoom si existen
    const slider = document.getElementById('zoom-slider');
    const label = document.getElementById('zoom-percentage');
    const hudScale = document.getElementById('hud-scale');
    
    if (slider) slider.value = Math.round(scale * 100);
    if (label) label.textContent = `${Math.round(scale * 100)}%`;
    if (hudScale) hudScale.textContent = `${Math.round(scale * 100)}%`;
};

window.initializeGestures = () => {
    console.log('Inicializando motor de zoom y gestos táctiles...');
    const scroller = document.getElementById('pdf-scroller');
    const viewport = document.getElementById('pdf-viewport');

    let startDistance = 0;
    let initialScale = 1.0;
    let touchCount = 0;

    // --- 1. CONFIGURAR GESTOS TÁCTILES MÓVILES (PEllIZCO / PINCH TO ZOOM) ---
    scroller.addEventListener('touchstart', (e) => {
        touchCount = e.touches.length;

        if (touchCount === 2) {
            // Pellizco de Zoom (Pinch) iniciado con dos dedos
            e.preventDefault();
            startDistance = getDistanceBetweenTouches(e.touches);
            initialScale = window.viewportZoom;
            
            // Establecer el origen del zoom en el punto medio de los dos dedos
            const center = getCenterOfTouches(e.touches);
            const rect = viewport.getBoundingClientRect();
            const originX = ((center.x - rect.left) / rect.width) * 100;
            const originY = ((center.y - rect.top) / rect.height) * 100;
            
            viewport.style.transformOrigin = `${originX}% ${originY}%`;
        }
    }, { passive: false });

    scroller.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && touchCount === 2) {
            e.preventDefault();
            
            // Calcular nueva distancia y aplicar factor de zoom global
            const currentDistance = getDistanceBetweenTouches(e.touches);
            const factor = currentDistance / startDistance;
            
            window.setViewportZoom(initialScale * factor);
        }
    }, { passive: false });

    scroller.addEventListener('touchend', (e) => {
        touchCount = e.touches.length;
    });

    // Auxiliar: Calcular distancia Euclidiana de dos puntos
    const getDistanceBetweenTouches = (touches) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.hypot(dx, dy);
    };

    // Auxiliar: Calcular centro medio de dos dedos
    const getCenterOfTouches = (touches) => {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2
        };
    };

    // --- 2. CONFIGURAR CONTROLES DE ZOOM DE ESCRITORIO ---
    const slider = document.getElementById('zoom-slider');
    const btnIn = document.getElementById('btn-zoom-in');
    const btnOut = document.getElementById('btn-zoom-out');

    if (slider) {
        slider.addEventListener('input', (e) => {
            window.setViewportZoom(parseFloat(e.target.value) / 100);
        });
    }

    if (btnIn) {
        btnIn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.setViewportZoom(window.viewportZoom + 0.15);
        });
    }

    if (btnOut) {
        btnOut.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.setViewportZoom(window.viewportZoom - 0.15);
        });
    }

    // --- 3. GESTO DE PULSACIÓN CONTINUA (LONG PRESS) PARA CAMBIO DE PÁGINA ---
    let longPressTimeout = null;
    let isLongPressActive = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    
    const overlay = document.getElementById('pdf-overlay');
    
    // Crear el div overlay del gesto de cambio de página
    const gestureIndicator = document.createElement('div');
    const pageSidebar = document.getElementById('page-sidebar'); // leer referencia si existe
    gestureIndicator.id = 'page-gesture-indicator';
    gestureIndicator.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(15, 23, 42, 0.45);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
        z-index: 9999;
        border-radius: 4px;
    `;
    gestureIndicator.innerHTML = `
        <div class="gesture-card" style="
            background: rgba(30, 41, 59, 0.9);
            border: 2px solid var(--accent);
            padding: 24px 36px;
            border-radius: 20px;
            box-shadow: var(--shadow-premium);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        ">
            <i id="gesture-icon" class="fa-solid fa-chevron-right" style="font-size: 40px; color: var(--accent); animation: bounceX 1s infinite alternate;"></i>
            <span id="gesture-text" style="font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; color: white;">Siguiente Página</span>
            <span style="font-size: 11px; color: var(--text-secondary);">Suelte para cambiar de hoja</span>
        </div>
    `;
    
    if (viewport) {
        viewport.appendChild(gestureIndicator);
    }
    
    // Estilos de animación en caliente
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        @keyframes popIn {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        @keyframes bounceX {
            0% { transform: translateX(-5px); }
            100% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(styleSheet);

    overlay.addEventListener('pointerdown', (e) => {
        // Solo actuar si está en modo "edit" o "none" y no se está interactuando con un campo
        if (e.target !== overlay) return;
        
        startX = e.clientX;
        startY = e.clientY;
        currentX = e.clientX;
        currentY = e.clientY;
        isLongPressActive = false;
        
        // Detener temporizador previo
        if (longPressTimeout) clearTimeout(longPressTimeout);
        
        longPressTimeout = setTimeout(() => {
            // Verificar que no se ha movido más de 12 píxeles
            const dist = Math.hypot(currentX - startX, currentY - startY);
            if (dist < 12) {
                isLongPressActive = true;
                
                // Determinar si es izquierda (anterior) o derecha (siguiente)
                const rect = overlay.getBoundingClientRect();
                const relativeX = startX - rect.left;
                const isRightHalf = relativeX > rect.width / 2;
                
                const icon = document.getElementById('gesture-icon');
                const text = document.getElementById('gesture-text');
                
                if (isRightHalf) {
                    if (window.pdfPageNum < (window.pdfInstance?.numPages || 1)) {
                        icon.className = 'fa-solid fa-chevron-right';
                        text.textContent = `Siguiente Página (${window.pdfPageNum + 1})`;
                        gestureIndicator.style.opacity = '1';
                    } else {
                        isLongPressActive = false;
                    }
                } else {
                    if (window.pdfPageNum > 1) {
                        icon.className = 'fa-solid fa-chevron-left';
                        text.textContent = `Página Anterior (${window.pdfPageNum - 1})`;
                        gestureIndicator.style.opacity = '1';
                    } else {
                        isLongPressActive = false;
                    }
                }
            }
        }, 600); // 600ms de pulsación continua
    });
    
    overlay.addEventListener('pointermove', (e) => {
        currentX = e.clientX;
        currentY = e.clientY;
        
        if (!isLongPressActive) {
            const dist = Math.hypot(currentX - startX, currentY - startY);
            if (dist >= 12) {
                if (longPressTimeout) {
                    clearTimeout(longPressTimeout);
                    longPressTimeout = null;
                }
            }
        }
    });
    
    overlay.addEventListener('pointerup', async () => {
        if (longPressTimeout) {
            clearTimeout(longPressTimeout);
            longPressTimeout = null;
        }
        
        if (isLongPressActive) {
            isLongPressActive = false;
            gestureIndicator.style.opacity = '0';
            
            // Determinar si es izquierda o derecha
            const rect = overlay.getBoundingClientRect();
            const relativeX = startX - rect.left;
            const isRightHalf = relativeX > rect.width / 2;
            
            if (isRightHalf) {
                if (window.pdfPageNum < (window.pdfInstance?.numPages || 1)) {
                    await window.changePdfPage(window.pdfPageNum + 1);
                }
            } else {
                if (window.pdfPageNum > 1) {
                    await window.changePdfPage(window.pdfPageNum - 1);
                }
            }
        }
    });
    
    overlay.addEventListener('pointercancel', () => {
        if (longPressTimeout) clearTimeout(longPressTimeout);
        isLongPressActive = false;
        gestureIndicator.style.opacity = '0';
    });

    console.log('¡Motor de zoom y gestos unificados activado con éxito! Límite de Zoom: 0.5x - 3.0x.');
};
