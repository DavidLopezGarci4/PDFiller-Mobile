/**
 * -------------------------------------------------------------
 * PDFiller Mobile PWA - Core JavaScript Logic
 * Redesigned for premium touch-first mobile experiences.
 * Supports S Pen Pressure Sensitivity via Pointer Events,
 * sliding bottom drawers, persistent signatures, session restore,
 * and high-fidelity client-side PDF-lib exports with web fonts.
 * -------------------------------------------------------------
 */

// Application State
// Application State
const state = {
  pdfDocument: null,
  pdfBytes: null,
  filename: '',
  pages: [], // holds { pageNum, width, height }
  annotations: [], // holds text, signature, corrector annotation elements
  signatures: [], // signature library: { id, imgData, aspectRatio }
  
  // Tool Config
  selectedTool: 'text', // 'text', 'signature', or 'corrector'
  activeSignatureId: null, // selected signature in gallery
  activeAnnotationId: null, // active element in viewer
  
  // Default Annotation Styles
  defaultTextSettings: {
    fontFamily: 'Calibri',
    fontSize: 14,
    color: '#000000'
  },
  
  // Undo/Redo Stacks
  history: [],
  historyIndex: -1,
  
  // Drag / Resize / Touch state
  lastFocusedTextValue: '',

  // Multi-Touch Gesture Zoom & Pan State
  zoom: 1.0,
  panX: 0,
  panY: 0
};

// DOM Cache
const dom = {
  // Shell & Layout
  appContainer: document.getElementById('app-container'),
  viewerContainer: document.getElementById('viewer-container'),
  zoomContentWrapper: document.getElementById('zoom-content-wrapper'),
  dropZone: document.getElementById('drop-zone'),
  fileInput: document.getElementById('file-input'),
  btnBrowseFile: document.getElementById('btn-browse-file'),
  btnLoadNew: document.getElementById('btn-load-new'),
  loadingOverlay: document.getElementById('loading-overlay'),
  loadingText: document.getElementById('loading-text'),
  btnSaveFinalQuick: document.getElementById('btn-save-final-quick'),

  // Mobile Bottom Navigation Bar Buttons
  navBtnDoc: document.getElementById('nav-btn-doc'),
  navBtnText: document.getElementById('nav-btn-text'),
  navBtnSignature: document.getElementById('nav-btn-signature'),
  navBtnCorrector: document.getElementById('nav-btn-corrector'),
  drawerOverlay: document.getElementById('drawer-overlay'),

  // Drawer: Document Management
  docFilename: document.getElementById('doc-filename'),
  docPageCount: document.getElementById('doc-page-count'),
  docElementCount: document.getElementById('doc-element-count'),
  btnUndo: document.getElementById('btn-undo'),
  btnRedo: document.getElementById('btn-redo'),
  btnClearAll: document.getElementById('btn-clear-all'),
  btnSaveCurrent: document.getElementById('btn-save-current'),
  btnSaveAs: document.getElementById('btn-save-as'),
  btnSaveFinal: document.getElementById('btn-save-final'),
  btnClearUserData: document.getElementById('btn-clear-user-data'),

  // Drawer: Text Settings
  fontFamilySelect: document.getElementById('font-family-select'),
  fontSizeRange: document.getElementById('font-size-range'),
  fontSizeVal: document.getElementById('font-size-val'),
  customColorPicker: document.getElementById('custom-color-picker'),

  // Drawer: Signatures
  btnCreateSig: document.getElementById('btn-create-sig'),
  sigLibraryEmpty: document.getElementById('sig-library-empty'),
  signatureGridList: document.getElementById('signature-grid-list'),

  // Session Restore Toast
  restoreToast: document.getElementById('restore-toast'),
  restoreFilename: document.getElementById('restore-filename'),
  btnRestoreCancel: document.getElementById('btn-restore-cancel'),
  btnRestoreConfirm: document.getElementById('btn-restore-confirm'),

  // Modal: Signature Pad
  sigModal: document.getElementById('sig-modal'),
  btnCloseSigModal: document.getElementById('btn-close-sig-modal'),
  btnCancelSig: document.getElementById('btn-cancel-sig'),
  btnSaveSig: document.getElementById('btn-save-sig'),
  brushThickness: document.getElementById('brush-thickness'),
  signaturePad: document.getElementById('signature-pad'),
  btnClearSigPad: document.getElementById('btn-clear-sig-pad'),
  imgSigInput: document.getElementById('img-sig-input'),
  btnBrowseImgSig: document.getElementById('btn-browse-img-sig'),
  imgSigPrompt: document.getElementById('img-sig-prompt'),
  imgSigDropzone: document.getElementById('img-sig-dropzone'),
  imgSigPreviewWrapper: document.getElementById('img-sig-preview-wrapper'),
  imgSigPreview: document.getElementById('img-sig-preview'),
  btnRemoveImgSig: document.getElementById('btn-remove-img-sig'),
  chkRemoveBg: document.getElementById('chk-remove-bg'),

  // Modal: Save As
  saveAsModal: document.getElementById('save-as-modal'),
  btnCloseSaveModal: document.getElementById('btn-close-save-modal'),
  saveFilenameInput: document.getElementById('save-filename-input'),
  btnCancelSave: document.getElementById('btn-cancel-save'),
  btnConfirmSave: document.getElementById('btn-confirm-save')
};

// -------------------------------------------------------------
// Initialization & PWA Features
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  initSignaturePad();
  loadSavedSignatures();
  checkSavedSession();
  syncNavActiveTool();
});

// Check for previously saved progress to recover
function checkSavedSession() {
  try {
    const saved = localStorage.getItem('pdf_filler_state');
    if (saved) {
      const savedState = JSON.parse(saved);
      if (savedState && savedState.originalPdfBytesB64 && savedState.originalFileName) {
        dom.restoreFilename.innerText = savedState.originalFileName;
        dom.restoreToast.classList.remove('hidden');
      }
    }
  } catch (err) {
    console.error('Failed to parse saved session progress', err);
  }
}

// -------------------------------------------------------------
// Interactive Navigation Menu & Sliding Drawer Actions
// -------------------------------------------------------------

function initEventListeners() {
  // Mobile Quick Action Upload events
  dom.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  dom.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      loadSelectedFile(e.dataTransfer.files[0]);
    }
  });

  dom.btnBrowseFile.addEventListener('click', () => dom.fileInput.click());
  dom.fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      loadSelectedFile(e.target.files[0]);
    }
  });

  // Mobile Bottom Drawer Open/Close Toggles
  dom.navBtnDoc.addEventListener('click', () => {
    toggleDrawer('drawer-doc', 'nav-btn-doc');
  });

  dom.navBtnText.addEventListener('click', () => {
    switchTool('text');
    toggleDrawer('drawer-text', 'nav-btn-text');
  });

  dom.navBtnSignature.addEventListener('click', () => {
    switchTool('signature');
    toggleDrawer('drawer-sig', 'nav-btn-signature');
  });

  dom.navBtnCorrector.addEventListener('click', () => {
    switchTool('corrector');
    toggleDrawer('drawer-corr', 'nav-btn-corrector');
  });

  // Close Drawers when clicking overlay
  dom.drawerOverlay.addEventListener('click', closeAllDrawers);

  // Close Drawers when clicking specific close buttons
  document.querySelectorAll('.drawer-close').forEach(btn => {
    btn.addEventListener('click', closeAllDrawers);
  });

  // Header quick actions
  dom.btnSaveFinalQuick.addEventListener('click', () => {
    if (state.pdfBytes) {
      saveFinalPdf();
    } else {
      alert('Primero abre un archivo PDF.');
    }
  });

  // Drawer Document Management Actions
  dom.btnLoadNew.addEventListener('click', () => {
    closeAllDrawers();
    dom.fileInput.click();
  });
  dom.btnSaveCurrent.addEventListener('click', () => {
    closeAllDrawers();
    saveCurrentProgress();
  });
  dom.btnSaveAs.addEventListener('click', () => {
    closeAllDrawers();
    openSaveAsModal();
  });
  dom.btnSaveFinal.addEventListener('click', () => {
    closeAllDrawers();
    saveFinalPdf();
  });

  // Undo / Redo & Clear All
  dom.btnUndo.addEventListener('click', undo);
  dom.btnRedo.addEventListener('click', redo);
  dom.btnClearAll.addEventListener('click', () => {
    closeAllDrawers();
    clearAllAnnotations();
  });

  // Text Settings Listeners
  dom.fontFamilySelect.addEventListener('change', (e) => {
    updateActiveOrPresetStyle('fontFamily', e.target.value);
  });

  dom.fontSizeRange.addEventListener('input', (e) => {
    const size = parseInt(e.target.value);
    dom.fontSizeVal.innerText = size;
    updateActiveOrPresetStyle('fontSize', size);

    // Sync size presets highlights
    document.querySelectorAll('.preset-btn').forEach(btn => {
      if (parseInt(btn.dataset.size) === size) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  });

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const size = parseInt(btn.dataset.size);
      dom.fontSizeRange.value = size;
      dom.fontSizeVal.innerText = size;
      updateActiveOrPresetStyle('fontSize', size);

      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Colors Settings Listeners
  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const color = swatch.dataset.color;
      dom.customColorPicker.value = color;
      updateActiveOrPresetStyle('color', color);
    });
  });

  dom.customColorPicker.addEventListener('input', (e) => {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    updateActiveOrPresetStyle('color', e.target.value);
  });

  // Signature Buttons
  dom.btnCreateSig.addEventListener('click', () => {
    closeAllDrawers();
    openSignatureModal();
  });
  dom.btnCloseSigModal.addEventListener('click', closeSignatureModal);
  dom.btnCancelSig.addEventListener('click', closeSignatureModal);
  dom.btnSaveSig.addEventListener('click', saveSignatureToLibrary);

  // Deselect annotations when clicking empty areas on pages viewer
  dom.viewerContainer.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.annotation-text-element') || 
        e.target.closest('.annotation-sig-element') || 
        e.target.closest('.annotation-corrector-element') ||
        e.target.closest('.bottom-drawer') ||
        e.target.closest('.bottom-nav') ||
        e.target.closest('.modal-overlay') ||
        e.target.closest('.toast')) {
      return;
    }
    setActiveAnnotation(null);
  });

  // Session Restore buttons
  dom.btnRestoreCancel.addEventListener('click', () => {
    localStorage.removeItem('pdf_filler_state');
    dom.restoreToast.classList.add('hidden');
  });
  dom.btnRestoreConfirm.addEventListener('click', restoreProgress);

  // Save As Modal
  dom.btnCloseSaveModal.addEventListener('click', closeSaveAsModal);
  dom.btnCancelSave.addEventListener('click', closeSaveAsModal);
  dom.btnConfirmSave.addEventListener('click', saveAsFinalPdf);

  // Privacy: Clear all data
  if (dom.btnClearUserData) {
    dom.btnClearUserData.addEventListener('click', clearUserDataAndReset);
  }

  // Multi-touch gestures
  initTouchGestures();

  // Swipe down to close bottom drawers
  initSwipeToCloseDrawers();
}

function switchTool(toolType) {
  state.selectedTool = toolType;
  syncNavActiveTool();
  dom.viewerContainer.className = `viewer-container tool-${toolType}`;
  setActiveAnnotation(null);
}

function syncNavActiveTool() {
  dom.navBtnText.classList.toggle('active', state.selectedTool === 'text');
  dom.navBtnSignature.classList.toggle('active', state.selectedTool === 'signature');
  dom.navBtnCorrector.classList.toggle('active', state.selectedTool === 'corrector');
}

function toggleDrawer(drawerId, navBtnId) {
  const drawer = document.getElementById(drawerId);
  const isAlreadyActive = drawer.classList.contains('active');
  
  if (isAlreadyActive) {
    closeAllDrawers();
  } else {
    openDrawer(drawerId, navBtnId);
  }
}

function openDrawer(drawerId, navBtnId) {
  document.querySelectorAll('.bottom-drawer').forEach(d => d.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  const drawer = document.getElementById(drawerId);
  const navBtn = document.getElementById(navBtnId);
  
  if (drawer) {
    drawer.classList.add('active');
    dom.drawerOverlay.classList.add('active');
  }
  if (navBtn) {
    navBtn.classList.add('active');
  }
}

function closeAllDrawers() {
  document.querySelectorAll('.bottom-drawer').forEach(d => {
    d.classList.remove('active');
    d.style.transform = '';
    d.style.transition = '';
  });
  dom.drawerOverlay.classList.remove('active');
  syncNavActiveTool();
}

// -------------------------------------------------------------
// Document Reader & PDF Rendering (PDF.js Engine)
// -------------------------------------------------------------

function showLoading(text) {
  dom.loadingText.innerText = text;
  dom.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  dom.loadingOverlay.classList.add('hidden');
}

function loadSelectedFile(file) {
  if (file.type !== 'application/pdf') {
    alert('Selecciona un archivo PDF válido.');
    return;
  }
  
  showLoading('Abriendo PDF en tu dispositivo móvil...');
  state.filename = file.name;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    state.pdfBytes = e.target.result;
    state.annotations = [];
    state.history = [];
    state.historyIndex = -1;
    renderPdf();
  };
  reader.onerror = function() {
    hideLoading();
    alert('Fallo al abrir el archivo PDF.');
  };
  reader.readAsArrayBuffer(file);
}

async function renderPdf() {
  showLoading('Renderizando páginas del PDF...');
  
  // Reset zoom and pan on new PDF load
  state.zoom = 1.0;
  state.panX = 0;
  state.panY = 0;
  updateZoomTransform();
  
  dom.zoomContentWrapper.innerHTML = '';
  state.pages = [];
  
  try {
    const loadingTask = pdfjsLib.getDocument({ data: state.pdfBytes.slice(0) });
    state.pdfDocument = await loadingTask.promise;
    const pageCount = state.pdfDocument.numPages;
    
    dom.docFilename.innerText = state.filename;
    dom.docPageCount.innerText = pageCount;
    
    dom.dropZone.classList.add('hidden');
    dom.viewerContainer.classList.remove('hidden');
    
    // sequentially render PDF pages on high definition canvases
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await state.pdfDocument.getPage(pageNum);
      
      // Responsive viewport calculation (fit inside screen width)
      const containerWidth = dom.viewerContainer.clientWidth - 16; // 8px margins on sides
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const computedScale = containerWidth / unscaledViewport.width;
      
      // Render at a higher scale for dynamic rendering sharpness, style bounds keep physical layouts
      const renderScale = Math.max(1.5, computedScale * window.devicePixelRatio);
      const renderViewport = page.getViewport({ scale: renderScale });
      const styleViewport = page.getViewport({ scale: computedScale });
      
      const pageContainer = document.createElement('div');
      pageContainer.className = 'pdf-page-container';
      pageContainer.dataset.page = pageNum;
      pageContainer.style.width = styleViewport.width + 'px';
      pageContainer.style.height = styleViewport.height + 'px';
      
      const canvas = document.createElement('canvas');
      canvas.className = 'pdf-canvas';
      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;
      
      // Let standard CSS size it according to computedScale width bounds
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      
      const ctx = canvas.getContext('2d');
      pageContainer.appendChild(canvas);
      
      // HTML Interactivity Transparent Overlay
      const overlay = document.createElement('div');
      overlay.className = 'pdf-overlay';
      overlay.dataset.page = pageNum;
      
      // Bind Tap overlay to place annotators using standard mouse click for desktop / stylus fallback
      overlay.addEventListener('click', (e) => {
        // If it was a touch-triggered click, ignore it as touchend will handle it
        if (e.pointerType === 'touch' || (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents)) {
          return;
        }
        handlePageClick(e, pageNum, overlay);
      });
      
      // Gesture Guard touch detection for Mobile to prevent accidental placements during zoom/pan
      let touchStartX = 0;
      let touchStartY = 0;
      let touchHasMoved = false;
      let touchCount = 0;
      
      overlay.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchHasMoved = false;
        touchCount = e.touches.length;
      }, { passive: true });
      
      overlay.addEventListener('touchmove', (e) => {
        if (e.touches.length > 1) {
          touchHasMoved = true;
        }
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        if (Math.sqrt(dx*dx + dy*dy) > 8) {
          touchHasMoved = true;
        }
      }, { passive: true });
      
      overlay.addEventListener('touchend', (e) => {
        if (e.target.closest('.annotation-text-element') || 
            e.target.closest('.annotation-sig-element') || 
            e.target.closest('.annotation-corrector-element')) {
          return;
        }
        
        if (!touchHasMoved && touchCount === 1 && state.selectedTool !== 'select' && state.selectedTool !== 'corrector') {
          const touch = e.changedTouches[0];
          const rect = overlay.getBoundingClientRect();
          const xPercent = (touch.clientX - rect.left) / rect.width;
          const yPercent = (touch.clientY - rect.top) / rect.height;
          
          if (state.selectedTool === 'text') {
            addTextAnnotation(pageNum, xPercent, yPercent);
          } else if (state.selectedTool === 'signature') {
            if (!state.activeSignatureId) {
              openDrawer('drawer-sig', 'nav-btn-signature');
              alert('Selecciona una firma de tu galería o crea una nueva con tu S Pen.');
              return;
            }
            addSignatureAnnotation(pageNum, xPercent, yPercent);
          }
        }
      });

      // Unified Pointer Events for Corrector drawing (Touch / Stylus / Mouse)
      overlay.addEventListener('pointerdown', (e) => {
        if (state.selectedTool === 'corrector') {
          e.preventDefault(); // Stop scrolling viewport
          startCorrectorDraw(e, pageNum, overlay);
        }
      });
      
      pageContainer.appendChild(overlay);
      dom.zoomContentWrapper.appendChild(pageContainer);
      
      await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
      
      state.pages.push({
        pageNum: pageNum,
        width: styleViewport.width,
        height: styleViewport.height
      });
    }
    
    // Enable core action controls
    dom.btnClearAll.disabled = false;
    
    if (state.annotations.length > 0) {
      redrawAllAnnotations();
    } else {
      saveHistoryState();
    }
    
  } catch (err) {
    console.error('Error rendering PDF mobile:', err);
    alert('Fallo al cargar y renderizar el PDF: ' + err.message);
  } finally {
    hideLoading();
  }
}

// -------------------------------------------------------------
// Touch Interaction Placement & Drawing Patches
// -------------------------------------------------------------

function handlePageClick(e, pageNum, overlay) {
  // Stop placing if clicked inside existing active items
  if (e.target.closest('.annotation-text-element') || 
      e.target.closest('.annotation-sig-element') || 
      e.target.closest('.annotation-corrector-element')) {
    return;
  }
  
  if (state.selectedTool === 'corrector') return;
  
  const rect = overlay.getBoundingClientRect();
  const xPercent = (e.clientX - rect.left) / rect.width;
  const yPercent = (e.clientY - rect.top) / rect.height;
  
  if (state.selectedTool === 'text') {
    addTextAnnotation(pageNum, xPercent, yPercent);
  } else if (state.selectedTool === 'signature') {
    if (!state.activeSignatureId) {
      openDrawer('drawer-sig', 'nav-btn-signature');
      alert('Selecciona una firma de tu galería o crea una nueva con tu S Pen.');
      return;
    }
    addSignatureAnnotation(pageNum, xPercent, yPercent);
  }
}

// Add Text Annotation
function addTextAnnotation(pageNum, xPercent, yPercent, text = 'Texto...', customStyles = null) {
  const settings = customStyles || {
    fontFamily: state.defaultTextSettings.fontFamily,
    fontSize: state.defaultTextSettings.fontSize,
    color: state.defaultTextSettings.color
  };
  
  const page = state.pages.find(p => p.pageNum === pageNum);
  const pageHeight = page ? page.height : 600;
  const pageWidth = page ? page.width : 400;
  
  // Align click coordinates
  const fontSizePercent = settings.fontSize / pageHeight;
  const adjustedY = Math.max(0, yPercent - (fontSizePercent / 2));
  const adjustedX = Math.max(0, xPercent - (6 / pageWidth));
  
  const newAnno = {
    id: 'txt-' + Date.now() + Math.random().toString(36).substr(2, 5),
    type: 'text',
    page: pageNum,
    xPercent: adjustedX,
    yPercent: adjustedY,
    widthPercent: settings.widthPercent || 0.35, // Default 35% page width for horizontal resizing
    text: text,
    fontFamily: settings.fontFamily,
    fontSize: settings.fontSize,
    color: settings.color
  };
  
  state.annotations.push(newAnno);
  
  const overlay = document.querySelector(`.pdf-overlay[data-page="${pageNum}"]`);
  if (overlay) {
    const textEl = createTextDomElement(newAnno);
    overlay.appendChild(textEl);
    
    setActiveAnnotation(newAnno.id);
    
    // Auto-focus and open keypad
    setTimeout(() => {
      const contentEl = textEl.querySelector('.annotation-text-content');
      if (contentEl) {
        contentEl.focus();
        // Select all for instant typing overwrite
        const range = document.createRange();
        range.selectNodeContents(contentEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }, 100);
  }
  
  updateElementCount();
  saveHistoryState();
  switchTool('select');
  closeAllDrawers();
}

// Add Signature Annotation
function addSignatureAnnotation(pageNum, xPercent, yPercent) {
  const sig = state.signatures.find(s => s.id === state.activeSignatureId);
  if (!sig) return;
  
  const defaultWidthPercent = 0.28; // slightly larger on mobile screens
  const page = state.pages.find(p => p.pageNum === pageNum);
  const widthPx = page.width * defaultWidthPercent;
  const heightPx = widthPx / sig.aspectRatio;
  const heightPercent = heightPx / page.height;
  
  const newAnno = {
    id: 'sig-' + Date.now() + Math.random().toString(36).substr(2, 5),
    type: 'signature',
    page: pageNum,
    xPercent: Math.max(0, xPercent - (defaultWidthPercent / 2)),
    yPercent: Math.max(0, yPercent - (heightPercent / 2)),
    widthPercent: defaultWidthPercent,
    heightPercent: heightPercent,
    aspectRatio: sig.aspectRatio,
    imgData: sig.imgData
  };
  
  state.annotations.push(newAnno);
  
  const overlay = document.querySelector(`.pdf-overlay[data-page="${pageNum}"]`);
  if (overlay) {
    const sigEl = createSignatureDomElement(newAnno);
    overlay.appendChild(sigEl);
    setActiveAnnotation(newAnno.id);
  }
  
  updateElementCount();
  saveHistoryState();
  switchTool('select');
  closeAllDrawers();
}

// Dom rendering bindings for active annotations
function createTextDomElement(anno) {
  const el = document.createElement('div');
  el.className = 'annotation-text-element';
  el.id = `anno-${anno.id}`;
  el.style.left = (anno.xPercent * 100) + '%';
  el.style.top = (anno.yPercent * 100) + '%';
  el.style.width = anno.widthPercent ? (anno.widthPercent * 100) + '%' : 'auto';
  
  let cssFont = anno.fontFamily + ', sans-serif';
  if (anno.fontFamily === 'Times New Roman') cssFont = "'Times New Roman', Times, serif";
  if (anno.fontFamily === 'Courier New') cssFont = "'Courier New', Courier, monospace";
  if (anno.fontFamily === 'Quicksand') cssFont = "'Quicksand', sans-serif";
  if (anno.fontFamily === 'Helvetica') cssFont = "Helvetica, Arial, sans-serif";
  
  el.style.fontFamily = cssFont;
  el.style.fontSize = anno.fontSize + 'px';
  el.style.color = anno.color;
  
  const contentEl = document.createElement('div');
  contentEl.className = 'annotation-text-content';
  contentEl.contentEditable = true;
  contentEl.spellcheck = false;
  contentEl.innerText = anno.text;
  el.appendChild(contentEl);
  
  if (state.activeAnnotationId === anno.id) el.classList.add('active');
  
  // Trash button
  const delBtn = document.createElement('button');
  delBtn.className = 'anno-btn-delete';
  delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
  
  const deleteHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    deleteAnnotation(anno.id);
  };
  delBtn.addEventListener('mousedown', deleteHandler);
  delBtn.addEventListener('touchstart', deleteHandler);
  el.appendChild(delBtn);
  
  // Drag Resize corner handle
  const handle = document.createElement('div');
  handle.className = 'text-resize-handle';
  el.appendChild(handle);
  makeHorizontalResizable(el, handle, anno.id);
  
  // Input tracking
  contentEl.addEventListener('focus', () => {
    setActiveAnnotation(anno.id);
    state.lastFocusedTextValue = contentEl.innerText;
  });
  contentEl.addEventListener('input', () => {
    anno.text = contentEl.innerText;
  });
  contentEl.addEventListener('blur', () => {
    if (contentEl.innerText.trim() === '') {
      deleteAnnotation(anno.id);
    } else if (contentEl.innerText !== state.lastFocusedTextValue) {
      saveHistoryState();
    }
  });
  
  makeDraggable(el, anno.id, false);
  return el;
}

function createSignatureDomElement(anno) {
  const el = document.createElement('div');
  el.className = 'annotation-sig-element';
  el.id = `anno-${anno.id}`;
  el.style.left = (anno.xPercent * 100) + '%';
  el.style.top = (anno.yPercent * 100) + '%';
  el.style.width = (anno.widthPercent * 100) + '%';
  el.style.height = (anno.heightPercent * 100) + '%';
  
  if (state.activeAnnotationId === anno.id) el.classList.add('active');
  
  const img = document.createElement('img');
  img.src = anno.imgData;
  img.alt = 'Firma';
  el.appendChild(img);
  
  // Trash button
  const delBtn = document.createElement('button');
  delBtn.className = 'anno-btn-delete';
  delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
  const deleteHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    deleteAnnotation(anno.id);
  };
  delBtn.addEventListener('mousedown', deleteHandler);
  delBtn.addEventListener('touchstart', deleteHandler);
  el.appendChild(delBtn);
  
  // Drag Resize corner handle
  const handle = document.createElement('div');
  handle.className = 'sig-resize-handle';
  el.appendChild(handle);
  
  // selection toggle
  const selectHandler = (e) => {
    e.stopPropagation();
    setActiveAnnotation(anno.id);
  };
  el.addEventListener('mousedown', selectHandler);
  el.addEventListener('touchstart', selectHandler);
  
  makeDraggable(el, anno.id, true);
  makeResizable(el, handle, anno.id);
  return el;
}

function createCorrectorDomElement(anno) {
  const el = document.createElement('div');
  el.className = 'annotation-corrector-element';
  el.id = `anno-${anno.id}`;
  el.style.left = (anno.xPercent * 100) + '%';
  el.style.top = (anno.yPercent * 100) + '%';
  el.style.width = (anno.widthPercent * 100) + '%';
  el.style.height = (anno.heightPercent * 100) + '%';
  el.style.backgroundColor = anno.color;
  
  if (state.activeAnnotationId === anno.id) el.classList.add('active');
  
  // Trash button
  const delBtn = document.createElement('button');
  delBtn.className = 'anno-btn-delete';
  delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
  const deleteHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    deleteAnnotation(anno.id);
  };
  delBtn.addEventListener('mousedown', deleteHandler);
  delBtn.addEventListener('touchstart', deleteHandler);
  el.appendChild(delBtn);
  
  const selectHandler = (e) => {
    e.stopPropagation();
    setActiveAnnotation(anno.id);
  };
  el.addEventListener('mousedown', selectHandler);
  el.addEventListener('touchstart', selectHandler);
  
  makeDraggable(el, anno.id, false);
  
  // Resize corner handle for custom shapes resizing
  const handle = document.createElement('div');
  handle.className = 'sig-resize-handle';
  el.appendChild(handle);
  makeCorrectorResizable(el, handle, anno.id);
  
  return el;
}

// -------------------------------------------------------------
// Interactive Intelligent Corrector Draw
// -------------------------------------------------------------

function startCorrectorDraw(e, pageNum, overlay) {
  if (state.selectedTool !== 'corrector') return;
  if (e.target.closest('.annotation-text-element') || 
      e.target.closest('.annotation-sig-element') || 
      e.target.closest('.annotation-corrector-element')) {
    return;
  }
  
  const clientX = e.clientX;
  const clientY = e.clientY;
  
  const rect = overlay.getBoundingClientRect();
  const startXPercent = (clientX - rect.left) / rect.width;
  const startYPercent = (clientY - rect.top) / rect.height;
  
  const pageContainer = overlay.parentElement;
  const canvas = pageContainer.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  
  // Sample canvas pixel color underlying the starting tap point
  const canvasX = Math.floor(startXPercent * canvas.width);
  const canvasY = Math.floor(startYPercent * canvas.height);
  
  let hexColor = '#ffffff';
  try {
    const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data;
    hexColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
  } catch (err) {
    console.warn('Failed to sample background color:', err);
  }
  
  const tempBox = document.createElement('div');
  tempBox.className = 'corrector-draw-box';
  tempBox.style.backgroundColor = hexColor;
  tempBox.style.left = (startXPercent * 100) + '%';
  tempBox.style.top = (startYPercent * 100) + '%';
  tempBox.style.width = '0%';
  tempBox.style.height = '0%';
  overlay.appendChild(tempBox);
  
  function moveHandler(ev) {
    const curRect = overlay.getBoundingClientRect();
    const curXPercent = Math.max(0, Math.min(1, (ev.clientX - curRect.left) / curRect.width));
    const curYPercent = Math.max(0, Math.min(1, (ev.clientY - curRect.top) / curRect.height));
    
    const x = Math.min(startXPercent, curXPercent);
    const y = Math.min(startYPercent, curYPercent);
    const w = Math.abs(startXPercent - curXPercent);
    const h = Math.abs(startYPercent - curYPercent);
    
    tempBox.style.left = (x * 100) + '%';
    tempBox.style.top = (y * 100) + '%';
    tempBox.style.width = (w * 100) + '%';
    tempBox.style.height = (h * 100) + '%';
  }
  
  function upHandler(ev) {
    window.removeEventListener('pointermove', moveHandler);
    window.removeEventListener('pointerup', upHandler);
    window.removeEventListener('pointercancel', upHandler);
    
    const finalRect = overlay.getBoundingClientRect();
    const curXPercent = Math.max(0, Math.min(1, (ev.clientX - finalRect.left) / finalRect.width));
    const curYPercent = Math.max(0, Math.min(1, (ev.clientY - finalRect.top) / finalRect.height));
    
    let x = Math.min(startXPercent, curXPercent);
    let y = Math.min(startYPercent, curYPercent);
    let w = Math.abs(startXPercent - curXPercent);
    let h = Math.abs(startYPercent - curYPercent);
    
    tempBox.remove();
    
    // Tap instead of drag spawns default patch size
    if (w < 0.005 || h < 0.005) {
      w = 0.16;
      h = 0.04;
      x = Math.max(0, startXPercent - w / 2);
      y = Math.max(0, startYPercent - h / 2);
    }
    
    const newAnno = {
      id: 'corr-' + Date.now() + Math.random().toString(36).substr(2, 5),
      type: 'corrector',
      page: pageNum,
      xPercent: x,
      yPercent: y,
      widthPercent: w,
      heightPercent: h,
      color: hexColor
    };
    
    state.annotations.push(newAnno);
    updateElementCount();
    saveHistoryState();
    
    const corrEl = createCorrectorDomElement(newAnno);
    overlay.appendChild(corrEl);
    setActiveAnnotation(newAnno.id);
    switchTool('select');
    closeAllDrawers();
  }
  
  window.addEventListener('pointermove', moveHandler);
  window.addEventListener('pointerup', upHandler);
  window.addEventListener('pointercancel', upHandler);
}

function rgbToHex(r, g, b) {
  const toHex = (c) => {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

// -------------------------------------------------------------
// Interactive Element Customization Settings
// -------------------------------------------------------------

function setActiveAnnotation(id) {
  if (state.activeAnnotationId === id) return;
  
  if (state.activeAnnotationId) {
    const prevEl = document.getElementById(`anno-${state.activeAnnotationId}`);
    if (prevEl) prevEl.classList.remove('active');
  }
  
  state.activeAnnotationId = id;
  
  if (id) {
    const currentEl = document.getElementById(`anno-${id}`);
    if (currentEl) currentEl.classList.add('active');
    
    const anno = state.annotations.find(a => a.id === id);
    if (anno && anno.type === 'text') {
      // Sync bottom drawer UI selectors
      dom.fontFamilySelect.value = anno.fontFamily;
      dom.fontSizeRange.value = anno.fontSize;
      dom.fontSizeVal.innerText = anno.fontSize;
      dom.customColorPicker.value = anno.color;
      
      document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.toggle('active', swatch.dataset.color === anno.color);
      });
      
      document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.size) === anno.fontSize);
      });
    }
  }
}

function updateActiveOrPresetStyle(property, value) {
  if (state.activeAnnotationId) {
    const anno = state.annotations.find(a => a.id === state.activeAnnotationId);
    if (anno && anno.type === 'text') {
      anno[property] = value;
      const el = document.getElementById(`anno-${anno.id}`);
      if (el) {
        if (property === 'fontFamily') {
          let cssFont = value + ', sans-serif';
          if (value === 'Times New Roman') cssFont = "'Times New Roman', Times, serif";
          if (value === 'Courier New') cssFont = "'Courier New', Courier, monospace";
          if (value === 'Quicksand') cssFont = "'Quicksand', sans-serif";
          if (value === 'Helvetica') cssFont = "Helvetica, Arial, sans-serif";
          el.style.fontFamily = cssFont;
        } else if (property === 'fontSize') {
          el.style.fontSize = value + 'px';
        } else if (property === 'color') {
          el.style.color = value;
        }
      }
      saveHistoryState();
    }
  } else {
    state.defaultTextSettings[property] = value;
  }
}

function deleteAnnotation(id) {
  const index = state.annotations.findIndex(a => a.id === id);
  if (index !== -1) {
    state.annotations.splice(index, 1);
    const el = document.getElementById(`anno-${id}`);
    if (el) el.remove();
    
    if (state.activeAnnotationId === id) {
      state.activeAnnotationId = null;
    }
    
    updateElementCount();
    saveHistoryState();
  }
}

function clearAllAnnotations() {
  if (state.annotations.length === 0) return;
  if (confirm('¿Eliminar todas tus anotaciones del PDF actual?')) {
    state.annotations = [];
    document.querySelectorAll('.pdf-overlay').forEach(ov => ov.innerHTML = '');
    state.activeAnnotationId = null;
    updateElementCount();
    saveHistoryState();
  }
}

// -------------------------------------------------------------
// Unified Drag and Drop Touch Mechanic
// -------------------------------------------------------------

function makeDraggable(element, annotationId, isSignature) {
  let startX = 0, startY = 0;
  let startLeft = 0, startTop = 0;
  let isDragging = false;
  
  element.addEventListener('mousedown', dragStartMouse);
  element.addEventListener('touchstart', dragStartTouch, { passive: false });
  
  function dragStartMouse(e) {
    if (e.target.closest('.anno-btn-delete')) return;
    if (e.target.closest('.sig-resize-handle')) return;
    
    setActiveAnnotation(annotationId);
    if (isSignature) e.preventDefault();
    
    dragStart(e, false);
  }
  
  function dragStartTouch(e) {
    if (e.target.closest('.anno-btn-delete')) return;
    if (e.target.closest('.sig-resize-handle')) return;
    
    setActiveAnnotation(annotationId);
    if (isSignature) e.preventDefault();
    
    dragStart(e.touches[0], true);
  }
  
  function dragStart(coords, isTouch) {
    startX = coords.clientX;
    startY = coords.clientY;
    
    const parent = element.parentElement;
    const parentRect = parent.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    
    startLeft = (rect.left - parentRect.left) / parentRect.width;
    startTop = (rect.top - parentRect.top) / parentRect.height;
    
    isDragging = false;
    
    if (isTouch) {
      window.addEventListener('touchmove', dragMoveTouch, { passive: false });
      window.addEventListener('touchend', dragEndTouch);
    } else {
      window.addEventListener('mousemove', dragMoveMouse);
      window.addEventListener('mouseup', dragEndMouse);
    }
  }
  
  function dragMoveMouse(e) {
    dragMove(e);
  }
  
  function dragMoveTouch(e) {
    e.preventDefault(); // Stop mobile document shell bounce scrolling
    dragMove(e.touches[0]);
  }
  
  function dragMove(coords) {
    const parent = element.parentElement;
    const parentRect = parent.getBoundingClientRect();
    
    const dx = coords.clientX - startX;
    const dy = coords.clientY - startY;
    
    if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      isDragging = true;
      element.classList.add('dragging');
    }
    
    if (isDragging) {
      const leftPercent = startLeft + (dx / parentRect.width);
      const topPercent = startTop + (dy / parentRect.height);
      
      const clampedLeft = Math.max(0, Math.min(1 - (element.offsetWidth / parentRect.width), leftPercent));
      const clampedTop = Math.max(0, Math.min(1 - (element.offsetHeight / parentRect.height), topPercent));
      
      element.style.left = (clampedLeft * 100) + '%';
      element.style.top = (clampedTop * 100) + '%';
    }
  }
  
  function dragEndMouse() {
    window.removeEventListener('mousemove', dragMoveMouse);
    window.removeEventListener('mouseup', dragEndMouse);
    dragEnd();
  }
  
  function dragEndTouch() {
    window.removeEventListener('touchmove', dragMoveTouch);
    window.removeEventListener('touchend', dragEndTouch);
    dragEnd();
  }
  
  function dragEnd() {
    if (isDragging) {
      element.classList.remove('dragging');
      
      const parent = element.parentElement;
      const rect = element.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      
      const finalLeftPercent = (rect.left - parentRect.left) / parentRect.width;
      const finalTopPercent = (rect.top - parentRect.top) / parentRect.height;
      
      const anno = state.annotations.find(a => a.id === annotationId);
      if (anno) {
        anno.xPercent = finalLeftPercent;
        anno.yPercent = finalTopPercent;
        saveHistoryState();
      }
    }
  }
}

// -------------------------------------------------------------
// Resize Engine touch optimized
// -------------------------------------------------------------

function makeResizable(element, handle, annotationId) {
  let startX = 0;
  let startWidthPercent = 0;
  let startHeightPercent = 0;
  let isResizing = false;
  
  handle.addEventListener('mousedown', resizeStartMouse);
  handle.addEventListener('touchstart', resizeStartTouch, { passive: false });
  
  function resizeStartMouse(e) {
    e.preventDefault();
    e.stopPropagation();
    resizeStart(e, false);
  }
  
  function resizeStartTouch(e) {
    e.preventDefault();
    e.stopPropagation();
    resizeStart(e.touches[0], true);
  }
  
  function resizeStart(coords, isTouch) {
    startX = coords.clientX;
    
    const parent = element.parentElement;
    const parentRect = parent.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    
    startWidthPercent = rect.width / parentRect.width;
    startHeightPercent = rect.height / parentRect.height;
    
    isResizing = true;
    
    if (isTouch) {
      window.addEventListener('touchmove', resizeMoveTouch, { passive: false });
      window.addEventListener('touchend', resizeEndTouch);
    } else {
      window.addEventListener('mousemove', resizeMoveMouse);
      window.addEventListener('mouseup', resizeEndMouse);
    }
  }
  
  function resizeMoveMouse(e) {
    resizeMove(e);
  }
  
  function resizeMoveTouch(e) {
    e.preventDefault();
    resizeMove(e.touches[0]);
  }
  
  function resizeMove(coords) {
    if (!isResizing) return;
    
    const parent = element.parentElement;
    const parentRect = parent.getBoundingClientRect();
    
    const dx = coords.clientX - startX;
    const widthChange = dx / parentRect.width;
    
    let newWidthPercent = startWidthPercent + widthChange;
    newWidthPercent = Math.max(0.06, Math.min(0.9, newWidthPercent));
    
    const anno = state.annotations.find(a => a.id === annotationId);
    if (!anno) return;
    
    const newHeightPercent = newWidthPercent * (parentRect.width / parentRect.height) / anno.aspectRatio;
    
    if (anno.xPercent + newWidthPercent <= 1 && anno.yPercent + newHeightPercent <= 1) {
      element.style.width = (newWidthPercent * 100) + '%';
      element.style.height = (newHeightPercent * 100) + '%';
    }
  }
  
  function resizeEndMouse() {
    window.removeEventListener('mousemove', resizeMoveMouse);
    window.removeEventListener('mouseup', resizeEndMouse);
    resizeEnd();
  }
  
  function resizeEndTouch() {
    window.removeEventListener('touchmove', resizeMoveTouch);
    window.removeEventListener('touchend', resizeEndTouch);
    resizeEnd();
  }
  
  function resizeEnd() {
    if (isResizing) {
      isResizing = false;
      
      const parent = element.parentElement;
      const rect = element.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      
      const finalWidthPercent = rect.width / parentRect.width;
      const finalHeightPercent = rect.height / parentRect.height;
      
      const anno = state.annotations.find(a => a.id === annotationId);
      if (anno) {
        anno.widthPercent = finalWidthPercent;
        anno.heightPercent = finalHeightPercent;
        saveHistoryState();
      }
    }
  }
}

function makeCorrectorResizable(element, handle, annotationId) {
  let startX = 0, startY = 0;
  let startWidthPercent = 0, startHeightPercent = 0;
  let isResizing = false;
  
  handle.addEventListener('mousedown', resizeStartMouse);
  handle.addEventListener('touchstart', resizeStartTouch, { passive: false });
  
  function resizeStartMouse(e) {
    e.preventDefault();
    e.stopPropagation();
    resizeStart(e, false);
  }
  
  function resizeStartTouch(e) {
    e.preventDefault();
    e.stopPropagation();
    resizeStart(e.touches[0], true);
  }
  
  function resizeStart(coords, isTouch) {
    startX = coords.clientX;
    startY = coords.clientY;
    
    const parent = element.parentElement;
    const parentRect = parent.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    
    startWidthPercent = rect.width / parentRect.width;
    startHeightPercent = rect.height / parentRect.height;
    
    isResizing = true;
    
    if (isTouch) {
      window.addEventListener('touchmove', resizeMoveTouch, { passive: false });
      window.addEventListener('touchend', resizeEndTouch);
    } else {
      window.addEventListener('mousemove', resizeMoveMouse);
      window.addEventListener('mouseup', resizeEndMouse);
    }
  }
  
  function resizeMoveMouse(e) {
    resizeMove(e);
  }
  
  function resizeMoveTouch(e) {
    e.preventDefault();
    resizeMove(e.touches[0]);
  }
  
  // Freeform unconstrained sizing for whiteout rectangles
  function resizeMove(coords) {
    if (!isResizing) return;
    
    const parent = element.parentElement;
    const parentRect = parent.getBoundingClientRect();
    
    const dx = coords.clientX - startX;
    const dy = coords.clientY - startY;
    
    let newWidthPercent = startWidthPercent + (dx / parentRect.width);
    let newHeightPercent = startHeightPercent + (dy / parentRect.height);
    
    newWidthPercent = Math.max(0.01, newWidthPercent);
    newHeightPercent = Math.max(0.01, newHeightPercent);
    
    const anno = state.annotations.find(a => a.id === annotationId);
    if (!anno) return;
    
    if (anno.xPercent + newWidthPercent <= 1) {
      element.style.width = (newWidthPercent * 100) + '%';
    }
    if (anno.yPercent + newHeightPercent <= 1) {
      element.style.height = (newHeightPercent * 100) + '%';
    }
  }
  
  function resizeEndMouse() {
    window.removeEventListener('mousemove', resizeMoveMouse);
    window.removeEventListener('mouseup', resizeEndMouse);
    resizeEnd();
  }
  
  function resizeEndTouch() {
    window.removeEventListener('touchmove', resizeMoveTouch);
    window.removeEventListener('touchend', resizeEndTouch);
    resizeEnd();
  }
  
  function resizeEnd() {
    if (isResizing) {
      isResizing = false;
      
      const parent = element.parentElement;
      const rect = element.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      
      const finalWidthPercent = rect.width / parentRect.width;
      const finalHeightPercent = rect.height / parentRect.height;
      
      const anno = state.annotations.find(a => a.id === annotationId);
      if (anno) {
        anno.widthPercent = finalWidthPercent;
        anno.heightPercent = finalHeightPercent;
        saveHistoryState();
      }
    }
  }
}

// Redraws overlay elements
function redrawAllAnnotations() {
  document.querySelectorAll('.pdf-overlay').forEach(ov => ov.innerHTML = '');
  
  state.annotations.forEach(anno => {
    const overlay = document.querySelector(`.pdf-overlay[data-page="${anno.page}"]`);
    if (overlay) {
      if (anno.type === 'text') {
        overlay.appendChild(createTextDomElement(anno));
      } else if (anno.type === 'signature') {
        overlay.appendChild(createSignatureDomElement(anno));
      } else if (anno.type === 'corrector') {
        overlay.appendChild(createCorrectorDomElement(anno));
      }
    }
  });
  
  updateElementCount();
}

// -------------------------------------------------------------
// History Stacking (Undo & Redo Action Registry)
// -------------------------------------------------------------

function saveHistoryState() {
  state.history = state.history.slice(0, state.historyIndex + 1);
  const snapshot = JSON.parse(JSON.stringify(state.annotations));
  state.history.push(snapshot);
  state.historyIndex++;
  
  updateUndoRedoButtons();
}

function undo() {
  if (state.historyIndex > 0) {
    state.historyIndex--;
    state.annotations = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
    state.activeAnnotationId = null;
    redrawAllAnnotations();
    updateUndoRedoButtons();
  }
}

function redo() {
  if (state.historyIndex < state.history.length - 1) {
    state.historyIndex++;
    state.annotations = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
    state.activeAnnotationId = null;
    redrawAllAnnotations();
    updateUndoRedoButtons();
  }
}

function updateUndoRedoButtons() {
  dom.btnUndo.disabled = state.historyIndex <= 0;
  dom.btnRedo.disabled = state.historyIndex >= state.history.length - 1;
}

function updateElementCount() {
  const count = state.annotations.length;
  dom.docElementCount.innerText = count;
}

// -------------------------------------------------------------
// S Pen & Stylus Precision Brush Drawing Canvas Pad Engine
// -------------------------------------------------------------

let sigPadCtx = null;
let isSigDrawing = false;
let sigHasDrawn = false;
let sigModalTab = 'tab-draw';
let drawColor = '#000000';
let uploadImageBase64 = null;
let drawingPoints = [];

function initSignaturePad() {
  sigPadCtx = dom.signaturePad.getContext('2d');
  
  // High density scaling ratios for drawing precision
  const ratio = window.devicePixelRatio || 1;
  dom.signaturePad.width = 340 * ratio;
  dom.signaturePad.height = 242 * ratio;
  sigPadCtx.scale(ratio, ratio);
  
  sigPadCtx.lineCap = 'round';
  sigPadCtx.lineJoin = 'round';
  sigPadCtx.strokeStyle = drawColor;
  sigPadCtx.lineWidth = parseInt(dom.brushThickness.value) || 3;
  
  // Use unified Pointer Events for physical Stylus / S Pen sensing
  dom.signaturePad.addEventListener('pointerdown', startSigDrawing);
  dom.signaturePad.addEventListener('pointermove', drawSig);
  window.addEventListener('pointerup', stopSigDrawing);
  
  // Clear pad
  dom.btnClearSigPad.addEventListener('click', clearSigPad);
  
  // Brush styling colors toggles
  document.querySelectorAll('.brush-color').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.brush-color').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      drawColor = btn.dataset.color;
      sigPadCtx.strokeStyle = drawColor;
    });
  });
  
  dom.brushThickness.addEventListener('input', (e) => {
    sigPadCtx.lineWidth = parseInt(e.target.value) || 3;
  });
  
  // Modal tabs switches
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const target = btn.dataset.tab;
      sigModalTab = target;
      
      document.getElementById('tab-draw').classList.toggle('active', target === 'tab-draw');
      document.getElementById('tab-upload').classList.toggle('active', target === 'tab-upload');
      
      updateSigModalSaveButton();
    });
  });
  
  // Upload triggers
  dom.btnBrowseImgSig.addEventListener('click', () => dom.imgSigInput.click());
  dom.imgSigInput.addEventListener('change', handleImgSigUpload);
  
  dom.imgSigDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  dom.imgSigDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImgSigFile(e.dataTransfer.files[0]);
    }
  });
  
  dom.btnRemoveImgSig.addEventListener('click', removeImgSigPreview);
}

let smoothedPressure = 0.5;

function startSigDrawing(e) {
  e.preventDefault();
  isSigDrawing = true;
  
  const rect = dom.signaturePad.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (340 / rect.width);
  const y = (e.clientY - rect.top) * (242 / rect.height);
  
  // Initialize smoothed pressure to pointer start
  smoothedPressure = 0.5;
  const pressure = getPointerPressure(e);
  
  drawingPoints = [{ x, y, pressure }];
  
  const w = getDynamicStrokeWidth(pressure);
  sigPadCtx.beginPath();
  sigPadCtx.arc(x, y, w / 2, 0, Math.PI * 2);
  sigPadCtx.fillStyle = drawColor;
  sigPadCtx.fill();
}

function drawSig(e) {
  if (!isSigDrawing) return;
  e.preventDefault();
  
  const rect = dom.signaturePad.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (340 / rect.width);
  const y = (e.clientY - rect.top) * (242 / rect.height);
  const pressure = getPointerPressure(e);
  
  drawingPoints.push({ x, y, pressure });
  
  // Bezier curve interpolation with high-density tintero smoothing
  if (drawingPoints.length > 2) {
    const p0 = drawingPoints[drawingPoints.length - 3];
    const p1 = drawingPoints[drawingPoints.length - 2];
    
    // Midpoints for smooth Bezier transitions
    const xcStart = (p0.x + p1.x) / 2;
    const ycStart = (p0.y + p1.y) / 2;
    
    const p2 = drawingPoints[drawingPoints.length - 1];
    const xcEnd = (p1.x + p2.x) / 2;
    const ycEnd = (p1.y + p2.y) / 2;
    
    // We draw from xcStart to xcEnd using p1 as the Bezier control point
    const w0 = getDynamicStrokeWidth(p1.pressure);
    const w2 = getDynamicStrokeWidth((p1.pressure + p2.pressure) / 2);
    
    const dx = xcEnd - xcStart;
    const dy = ycEnd - ycStart;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Draw micro-circles every 0.3px to guarantee a continuous fluid line
    const steps = Math.max(15, Math.floor(dist / 0.3));
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Quadratic Bezier interpolation formula
      const cx = (1 - t) * (1 - t) * xcStart + 2 * (1 - t) * t * p1.x + t * t * xcEnd;
      const cy = (1 - t) * (1 - t) * ycStart + 2 * (1 - t) * t * p1.y + t * t * ycEnd;
      const cw = w0 + (w2 - w0) * t;
      
      sigPadCtx.beginPath();
      sigPadCtx.arc(cx, cy, cw / 2, 0, Math.PI * 2);
      sigPadCtx.fillStyle = drawColor;
      sigPadCtx.fill();
    }
  }
  
  if (!sigHasDrawn) {
    sigHasDrawn = true;
    updateSigModalSaveButton();
  }
}

function stopSigDrawing() {
  isSigDrawing = false;
}

function clearSigPad() {
  sigPadCtx.clearRect(0, 0, 340, 242);
  sigHasDrawn = false;
  drawingPoints = [];
  updateSigModalSaveButton();
}

function getPointerPressure(e) {
  let pressure = 0.5;
  // physical S Pen stylus reports pressure values between 0.0 and 1.0
  if (e.pointerType === 'pen') {
    pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;
  } else if (e.pressure > 0 && e.pressure !== 0.5) {
    pressure = e.pressure;
  }
  
  // Exponential Moving Average filter (Low pass) for absolute stroke smoothness
  smoothedPressure = (smoothedPressure * 0.75) + (pressure * 0.25);
  return smoothedPressure;
}

function getDynamicStrokeWidth(pressure) {
  const baseThickness = parseInt(dom.brushThickness.value) || 3;
  // Map pressure to scale brush width dynamically between 0.4x and 2.4x for stylish drawings
  const factor = 0.4 + pressure * 2.0;
  return baseThickness * factor;
}

// Image Signature Upload
function handleImgSigUpload(e) {
  if (e.target.files && e.target.files.length > 0) {
    handleImgSigFile(e.target.files[0]);
  }
}

function handleImgSigFile(file) {
  if (!file.type.match('image.*')) {
    alert('Sube una imagen de firma válida.');
    return;
  }
  
  // Pre-rendering welcome loader
  const reader = new FileReader();
  reader.onload = function(e) {
    uploadImageBase64 = e.target.result;
    dom.imgSigPreview.src = uploadImageBase64;
    dom.imgSigPrompt.classList.add('hidden');
    dom.imgSigPreviewWrapper.classList.remove('hidden');
    
    updateSigModalSaveButton();
  };
  reader.readAsDataURL(file);
}

function removeImgSigPreview(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  uploadImageBase64 = null;
  dom.imgSigPreview.src = '';
  dom.imgSigPreviewWrapper.classList.add('hidden');
  dom.imgSigPrompt.classList.remove('hidden');
  dom.imgSigInput.value = '';
  updateSigModalSaveButton();
}

function openSignatureModal() {
  dom.sigModal.classList.remove('hidden');
  clearSigPad();
  removeImgSigPreview();
}

function closeSignatureModal() {
  dom.sigModal.classList.add('hidden');
}

function updateSigModalSaveButton() {
  if (sigModalTab === 'tab-draw') {
    dom.btnSaveSig.disabled = !sigHasDrawn;
  } else {
    dom.btnSaveSig.disabled = !uploadImageBase64;
  }
}

// Bounding box cropping algorithm
function trimCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  
  let minX = w, minY = h, maxX = 0, maxY = 0;
  let hasPixels = false;
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 5) {
        hasPixels = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  
  if (!hasPixels) {
    return {
      imgData: canvas.toDataURL('image/png'),
      aspectRatio: w / h
    };
  }
  
  // Padding around cropped strokes
  const pad = 6;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w, maxX + pad);
  maxY = Math.min(h, maxY + pad);
  
  const cropW = maxX - minX;
  const cropH = maxY - minY;
  
  const trimCanv = document.createElement('canvas');
  trimCanv.width = cropW;
  trimCanv.height = cropH;
  const trimCtx = trimCanv.getContext('2d');
  trimCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
  
  return {
    imgData: trimCanv.toDataURL('image/png'),
    aspectRatio: cropW / cropH
  };
}

function processImageSignatureAndRemoveBg(base64Str, callback) {
  const img = new Image();
  img.onload = function() {
    const canvas = document.createElement('canvas');
    
    // Scale high resolution signatures to avoid mobile performance freezes
    const MAX_DIM = 800;
    let w = img.width;
    let h = img.height;
    if (w > MAX_DIM || h > MAX_DIM) {
      if (w > h) {
        h = Math.round((h * MAX_DIM) / w);
        w = MAX_DIM;
      } else {
        w = Math.round((w * MAX_DIM) / h);
        h = MAX_DIM;
      }
    }
    
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    
    // Background extraction filter
    if (dom.chkRemoveBg.checked) {
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const avg = (r + g + b) / 3;
        if (avg > 200) {
          data[i+3] = Math.max(0, (255 - avg) * 2);
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
    
    const trimmed = trimCanvas(canvas);
    callback(trimmed);
  };
  img.src = base64Str;
}

function saveSignatureToLibrary() {
  if (sigModalTab === 'tab-draw') {
    // Process drawn signature path
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 340;
    tempCanvas.height = 242;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(dom.signaturePad, 0, 0, dom.signaturePad.width, dom.signaturePad.height, 0, 0, 340, 242);
    
    const trimmed = trimCanvas(tempCanvas);
    addSignatureToGallery(trimmed.imgData, trimmed.aspectRatio);
    closeSignatureModal();
  } else {
    // Process uploaded image signature
    showLoading('Procesando firma...');
    processImageSignatureAndRemoveBg(uploadImageBase64, (trimmed) => {
      hideLoading();
      addSignatureToGallery(trimmed.imgData, trimmed.aspectRatio);
      closeSignatureModal();
    });
  }
}

function addSignatureToGallery(imgData, aspectRatio, saveToStorage = true) {
  const newSigId = 'sig-lib-' + Date.now() + Math.random().toString(36).substr(2, 5);
  const signatureObj = {
    id: newSigId,
    imgData: imgData,
    aspectRatio: aspectRatio
  };
  
  state.signatures.push(signatureObj);
  dom.sigLibraryEmpty.classList.add('hidden');
  
  const card = document.createElement('div');
  card.className = 'sig-thumbnail-card';
  card.id = `sig-card-${newSigId}`;
  card.dataset.id = newSigId;
  
  const img = document.createElement('img');
  img.src = imgData;
  img.alt = 'Miniatura';
  card.appendChild(img);
  
  const delBtn = document.createElement('button');
  delBtn.className = 'sig-thumbnail-delete';
  delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteSignatureFromGallery(newSigId);
  });
  card.appendChild(delBtn);
  
  card.addEventListener('click', () => {
    selectSignatureFromGallery(newSigId);
  });
  
  dom.signatureGridList.appendChild(card);
  selectSignatureFromGallery(newSigId);
  
  if (saveToStorage) {
    saveSignaturesToStorage();
  }
}

function saveSignaturesToStorage() {
  try {
    localStorage.setItem('pdf_filler_signatures', JSON.stringify(state.signatures));
  } catch (err) {
    console.error('Failed to save signatures to localStorage', err);
  }
}

function loadSavedSignatures() {
  try {
    const saved = localStorage.getItem('pdf_filler_signatures');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        state.signatures = [];
        dom.signatureGridList.innerHTML = '';
        dom.sigLibraryEmpty.classList.add('hidden');
        parsed.forEach(sig => {
          addSignatureToGallery(sig.imgData, sig.aspectRatio, false);
        });
      }
    }
  } catch (err) {
    console.error('Failed to load saved signatures', err);
  }
}

function selectSignatureFromGallery(id) {
  document.querySelectorAll('.sig-thumbnail-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById(`sig-card-${id}`);
  if (card) {
    card.classList.add('selected');
    state.activeSignatureId = id;
    switchTool('signature');
  } else {
    state.activeSignatureId = null;
  }
}

function deleteSignatureFromGallery(id) {
  const index = state.signatures.findIndex(s => s.id === id);
  if (index !== -1) {
    state.signatures.splice(index, 1);
    const card = document.getElementById(`sig-card-${id}`);
    if (card) card.remove();
    
    if (state.activeSignatureId === id) {
      state.activeSignatureId = null;
      if (state.signatures.length > 0) {
        selectSignatureFromGallery(state.signatures[0].id);
      } else {
        dom.sigLibraryEmpty.classList.remove('hidden');
      }
    }
    
    saveSignaturesToStorage();
  }
}

// -------------------------------------------------------------
// Offline PWA State Backup
// -------------------------------------------------------------

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function saveCurrentProgress() {
  if (!state.pdfBytes) {
    alert('Primero carga un archivo PDF.');
    return;
  }
  
  showLoading('Guardando sesión en tu móvil...');
  
  setTimeout(() => {
    try {
      const stateToSave = {
        originalFileName: state.filename,
        originalPdfBytesB64: arrayBufferToBase64(state.pdfBytes),
        annotations: state.annotations,
        signatures: state.signatures
      };
      
      localStorage.setItem('pdf_filler_state', JSON.stringify(stateToSave));
      hideLoading();
      
      alert('¡Sesión guardada en el navegador! Podrás recuperarla al abrir de nuevo la aplicación.');
    } catch (err) {
      hideLoading();
      console.error(err);
      alert('Fallo al guardar: el tamaño del PDF posiblemente excede el límite de almacenamiento del navegador móvil.');
    }
  }, 100);
}

function restoreProgress() {
  dom.restoreToast.classList.add('hidden');
  
  try {
    const saved = localStorage.getItem('pdf_filler_state');
    if (!saved) return;
    
    const savedState = JSON.parse(saved);
    
    showLoading('Restaurando tu progreso anterior...');
    state.filename = savedState.originalFileName;
    state.pdfBytes = base64ToArrayBuffer(savedState.originalPdfBytesB64);
    state.annotations = savedState.annotations;
    
    if (savedState.signatures && savedState.signatures.length > 0) {
      savedState.signatures.forEach(sig => {
        const exists = state.signatures.some(s => s.imgData === sig.imgData);
        if (!exists) {
          addSignatureToGallery(sig.imgData, sig.aspectRatio, true);
        }
      });
    }
    
    renderPdf();
  } catch (err) {
    hideLoading();
    console.error('Failed to restore progress session:', err);
    alert('Error al restaurar sesión anterior: ' + err.message);
  }
}

// -------------------------------------------------------------
// PDF Compilation Engine (PDF-lib integration)
// -------------------------------------------------------------

function hexToPdfColor(hexString) {
  const cleanHex = hexString.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return PDFLib.rgb(r, g, b);
}

function downloadBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function openSaveAsModal() {
  if (!state.pdfBytes) {
    alert('Carga un PDF para exportar.');
    return;
  }
  const base = state.filename.substring(0, state.filename.lastIndexOf('.')) || state.filename;
  dom.saveFilenameInput.value = base + '_firmado_movil';
  dom.saveAsModal.classList.remove('hidden');
}

function closeSaveAsModal() {
  dom.saveAsModal.classList.add('hidden');
}

function saveAsFinalPdf() {
  let name = dom.saveFilenameInput.value.trim();
  if (!name) name = 'documento_firmado';
  if (!name.endsWith('.pdf')) name += '.pdf';
  
  closeSaveAsModal();
  generateAndExportPdf(name);
}

function saveFinalPdf() {
  if (!state.pdfBytes) {
    alert('Carga un PDF para exportar.');
    return;
  }
  const base = state.filename.substring(0, state.filename.lastIndexOf('.')) || state.filename;
  generateAndExportPdf(base + '_firmado_movil.pdf');
}

async function generateAndExportPdf(downloadFileName) {
  showLoading('Compilando PDF firmado con PDF-lib...');
  
  try {
    const pdfDoc = await PDFLib.PDFDocument.load(state.pdfBytes.slice(0));
    pdfDoc.registerFontkit(window.fontkit);
    
    let calibriFont = null;
    let verdanaFont = null;
    let quicksandFont = null;
    
    showLoading('Cargando fuentes estilizadas (Calibri/Verdana/Quicksand)...');
    
    // Embed custom fonts dynamically
    try {
      const res = await fetch('https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/carlito/Carlito-Regular.ttf');
      if (res.ok) {
        const calBytes = await res.arrayBuffer();
        calibriFont = await pdfDoc.embedFont(calBytes);
      } else {
        throw new Error();
      }
    } catch (e) {
      console.warn('Calibri fallback to Helvetica.');
      calibriFont = await pdfDoc.embedStandardFont(PDFLib.StandardFonts.Helvetica);
    }
    
    try {
      const res = await fetch('https://cdn.jsdelivr.net/gh/dejavu-fonts/dejavu-fonts@version_2_37/resources/ttf/DejaVuSans.ttf');
      if (res.ok) {
        const verBytes = await res.arrayBuffer();
        verdanaFont = await pdfDoc.embedFont(verBytes);
      } else {
        throw new Error();
      }
    } catch (e) {
      console.warn('Verdana fallback to Helvetica.');
      verdanaFont = await pdfDoc.embedStandardFont(PDFLib.StandardFonts.Helvetica);
    }
    
    try {
      const res = await fetch('https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/quicksand/Quicksand-Regular.ttf');
      if (res.ok) {
        const qBytes = await res.arrayBuffer();
        quicksandFont = await pdfDoc.embedFont(qBytes);
      } else {
        throw new Error();
      }
    } catch (e) {
      console.warn('Quicksand fallback to Helvetica.');
      quicksandFont = await pdfDoc.embedStandardFont(PDFLib.StandardFonts.Helvetica);
    }
    
    const helveticaFont = await pdfDoc.embedStandardFont(PDFLib.StandardFonts.Helvetica);
    const timesRomanFont = await pdfDoc.embedStandardFont(PDFLib.StandardFonts.TimesRoman);
    const courierFont = await pdfDoc.embedStandardFont(PDFLib.StandardFonts.Courier);
    
    const pages = pdfDoc.getPages();
    
    showLoading('Escribiendo anotaciones y firmas...');
    
    for (const anno of state.annotations) {
      const index = anno.page - 1;
      if (index >= pages.length) continue;
      
      const page = pages[index];
      const { width, height } = page.getSize();
      
      if (anno.type === 'text') {
        let activeFont = helveticaFont;
        if (anno.fontFamily === 'Calibri') activeFont = calibriFont;
        if (anno.fontFamily === 'Verdana') activeFont = verdanaFont;
        if (anno.fontFamily === 'Times New Roman') activeFont = timesRomanFont;
        if (anno.fontFamily === 'Courier New') activeFont = courierFont;
        if (anno.fontFamily === 'Quicksand') activeFont = quicksandFont;
        
        // Calculate dynamic scale factor comparing the PDF page width and screen editor page width
        const pageState = state.pages.find(p => p.pageNum === anno.page) || state.pages[index];
        const scaleFactor = pageState ? (width / pageState.width) : 1.0;
        const scaledFontSize = anno.fontSize * scaleFactor;

        const pdfX = anno.xPercent * width;
        const offset = scaledFontSize * 0.82;
        const pdfY = height - (anno.yPercent * height) - offset;
        
        page.drawText(anno.text, {
          x: pdfX,
          y: pdfY,
          size: scaledFontSize,
          font: activeFont,
          color: hexToPdfColor(anno.color),
          maxWidth: anno.widthPercent ? anno.widthPercent * width : undefined,
          lineHeight: scaledFontSize * 1.2
        });
      } else if (anno.type === 'signature') {
        const base64Str = anno.imgData.split(',')[1];
        const imgBytes = new Uint8Array(
          atob(base64Str)
            .split('')
            .map(char => char.charCodeAt(0))
        );
        
        let embeddedImg;
        const isJpg = anno.imgData.includes('image/jpeg') || anno.imgData.includes('image/jpg');
        
        try {
          if (isJpg) {
            embeddedImg = await pdfDoc.embedJpg(imgBytes);
          } else {
            embeddedImg = await pdfDoc.embedPng(imgBytes);
          }
        } catch (err) {
          console.warn("Attempting mobile signature embedding fallback due to error:", err);
          try {
            if (isJpg) {
              embeddedImg = await pdfDoc.embedPng(imgBytes);
            } else {
              embeddedImg = await pdfDoc.embedJpg(imgBytes);
            }
          } catch (fallbackErr) {
            console.error("Mobile signature embedding failed entirely:", fallbackErr);
            throw fallbackErr;
          }
        }
        
        const pdfX = anno.xPercent * width;
        const pdfY = height - (anno.yPercent * height) - (anno.heightPercent * height);
        const pdfW = anno.widthPercent * width;
        const pdfH = anno.heightPercent * height;
        
        page.drawImage(embeddedImg, {
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH
        });
      } else if (anno.type === 'corrector') {
        const pdfX = anno.xPercent * width;
        const pdfY = height - (anno.yPercent * height) - (anno.heightPercent * height);
        const pdfW = anno.widthPercent * width;
        const pdfH = anno.heightPercent * height;
        
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
          color: hexToPdfColor(anno.color),
          borderColor: hexToPdfColor(anno.color),
          borderWidth: 0
        });
      }
    }
    
    showLoading('Guardando PDF final...');
    const compiledBytes = await pdfDoc.save();
    
    downloadBytes(compiledBytes, downloadFileName);
    
  } catch (err) {
    console.error('Error generating PDF mobile:', err);
    alert('Fallo al exportar PDF: ' + err.message);
  } finally {
    hideLoading();
  }
}

// -------------------------------------------------------------
// Interactive Mobile Helpers & Gestures Integration
// -------------------------------------------------------------

let gestureStartZoom = 1.0;
let gestureStartDistance = 0;
let gestureStartPanX = 0;
let gestureStartPanY = 0;
let gestureStartMidpoint = { x: 0, y: 0 };
let isPinching = false;

function initTouchGestures() {
  const viewer = dom.viewerContainer;
  if (!viewer) return;
  
  viewer.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      isPinching = true;
      gestureStartZoom = state.zoom;
      gestureStartDistance = getTouchDistance(e.touches[0], e.touches[1]);
      gestureStartPanX = state.panX;
      gestureStartPanY = state.panY;
      gestureStartMidpoint = getTouchMidpoint(e.touches[0], e.touches[1]);
    }
  }, { passive: true });
  
  viewer.addEventListener('touchmove', (e) => {
    if (isPinching && e.touches.length === 2) {
      e.preventDefault(); // prevent native browser scrolling / zooming
      
      const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
      if (gestureStartDistance > 0) {
        const factor = currentDistance / gestureStartDistance;
        state.zoom = Math.max(1.0, Math.min(4.0, gestureStartZoom * factor));
      }
      
      const currentMidpoint = getTouchMidpoint(e.touches[0], e.touches[1]);
      const dx = currentMidpoint.x - gestureStartMidpoint.x;
      const dy = currentMidpoint.y - gestureStartMidpoint.y;
      
      state.panX = gestureStartPanX + dx;
      state.panY = gestureStartPanY + dy;
      
      updateZoomTransform();
    }
  }, { passive: false });
  
  viewer.addEventListener('touchend', (e) => {
    if (isPinching && e.touches.length < 2) {
      isPinching = false;
      // If close to baseline scale, snap back to standard sizing
      if (state.zoom <= 1.05) {
        state.zoom = 1.0;
        state.panX = 0;
        state.panY = 0;
        updateZoomTransform();
      }
    }
  });
}

function getTouchDistance(t1, t2) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchMidpoint(t1, t2) {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2
  };
}

function updateZoomTransform() {
  if (dom.zoomContentWrapper) {
    dom.zoomContentWrapper.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  }
}

function makeHorizontalResizable(element, handle, annotationId) {
  let startX = 0;
  let startWidthPercent = 0;
  let isResizing = false;
  
  handle.addEventListener('mousedown', resizeStartMouse);
  handle.addEventListener('touchstart', resizeStartTouch, { passive: false });
  
  function resizeStartMouse(e) {
    e.preventDefault();
    e.stopPropagation();
    resizeStart(e, false);
  }
  
  // Mobile finger triggers
  function resizeStartTouch(e) {
    e.preventDefault();
    e.stopPropagation();
    resizeStart(e.touches[0], true);
  }
  
  function resizeStart(coords, isTouch) {
    startX = coords.clientX;
    
    const parent = element.parentElement;
    const parentRect = parent.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    
    startWidthPercent = rect.width / parentRect.width;
    isResizing = true;
    
    if (isTouch) {
      window.addEventListener('touchmove', resizeMoveTouch, { passive: false });
      window.addEventListener('touchend', resizeEndTouch);
    } else {
      window.addEventListener('mousemove', resizeMoveMouse);
      window.addEventListener('mouseup', resizeEndMouse);
    }
  }
  
  function resizeMoveMouse(e) {
    resizeMove(e);
  }
  
  function resizeMoveTouch(e) {
    e.preventDefault();
    resizeMove(e.touches[0]);
  }
  
  function resizeMove(coords) {
    if (!isResizing) return;
    
    const parent = element.parentElement;
    const parentRect = parent.getBoundingClientRect();
    
    const dx = coords.clientX - startX;
    const widthChange = dx / parentRect.width;
    
    let newWidthPercent = startWidthPercent + widthChange;
    // Keep width inside reasonable bounds on screen (10% to 95% of container width)
    newWidthPercent = Math.max(0.1, Math.min(0.95, newWidthPercent));
    
    const anno = state.annotations.find(a => a.id === annotationId);
    if (!anno) return;
    
    if (anno.xPercent + newWidthPercent <= 1) {
      element.style.width = (newWidthPercent * 100) + '%';
      anno.widthPercent = newWidthPercent; // update on the fly so text wraps dynamically
    }
  }
  
  function resizeEndMouse() {
    window.removeEventListener('mousemove', resizeMoveMouse);
    window.removeEventListener('mouseup', resizeEndMouse);
    resizeEnd();
  }
  
  function resizeEndTouch() {
    window.removeEventListener('touchmove', resizeMoveTouch);
    window.removeEventListener('touchend', resizeEndTouch);
    resizeEnd();
  }
  
  function resizeEnd() {
    if (isResizing) {
      isResizing = false;
      
      const parent = element.parentElement;
      const rect = element.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      
      const finalWidthPercent = rect.width / parentRect.width;
      
      const anno = state.annotations.find(a => a.id === annotationId);
      if (anno) {
        anno.widthPercent = finalWidthPercent;
        saveHistoryState();
      }
    }
  }
}

function clearUserDataAndReset() {
  if (confirm('¿Estás seguro de que quieres cerrar la sesión y limpiar todos tus datos locales de este navegador? Esto eliminará de forma permanente tus firmas guardadas y el progreso actual.')) {
    try {
      localStorage.removeItem('pdf_filler_state');
      localStorage.removeItem('pdf_filler_signatures');
      alert('¡Datos eliminados correctamente!');
      window.location.reload();
    } catch (err) {
      console.error('Error cleaning user data:', err);
      alert('Fallo al limpiar los datos de usuario.');
    }
  }
}

// Swipe down to close bottom drawers smoothly
function initSwipeToCloseDrawers() {
  document.querySelectorAll('.bottom-drawer').forEach(drawer => {
    const header = drawer.querySelector('.drawer-header');
    if (!header) return;
    
    let startY = 0;
    let currentY = 0;
    let dy = 0;
    let isDragging = false;
    
    header.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      startY = e.touches[0].clientY;
      isDragging = true;
      drawer.style.transition = 'none';
    }, { passive: true });
    
    header.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      dy = currentY - startY;
      
      if (dy > 0) {
        drawer.style.transform = `translateY(${dy}px)`;
        if (e.cancelable) e.preventDefault();
      } else {
        drawer.style.transform = 'translateY(0px)';
      }
    }, { passive: false });
    
    const endHandler = () => {
      if (!isDragging) return;
      isDragging = false;
      drawer.style.transition = '';
      
      if (dy > 80) {
        closeAllDrawers();
      } else {
        drawer.style.transform = '';
      }
      dy = 0;
    };
    
    header.addEventListener('touchend', endHandler);
    header.addEventListener('touchcancel', endHandler);
  });
}
