// --- AUTH CHECK ---
const storedUser = localStorage.getItem('currentUser');
if (!storedUser && !window.location.pathname.endsWith('login.html')) {
    window.location.href = '/login.html';
}
window.currentUser = storedUser ? JSON.parse(storedUser) : null;

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = '/login.html';
}

function togglePasswordVisibility(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === 'password') {
        input.type = 'text';
        iconElement.classList.remove('fa-eye');
        iconElement.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        iconElement.classList.remove('fa-eye-slash');
        iconElement.classList.add('fa-eye');
    }
}

// --- THEME LOGIC ---
async function initTheme() {
    let savedTheme = localStorage.getItem('theme');
    
    // Si no hay guardado, preguntar al servidor (.env)
    if (!savedTheme) {
        try {
            const response = await fetch('/api/config/theme');
            if (response.ok) {
                const config = await response.json();
                savedTheme = config.defaultTheme || 'light';
            }
        } catch (e) {
            console.error('Error fetching theme from server:', e);
            savedTheme = 'light';
        }
    }
    
    applyTheme(savedTheme || 'light');
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark-mode');
    } else {
        document.documentElement.classList.remove('dark-mode');
    }
    localStorage.setItem('theme', theme);
    updateThemeToggleIcon(theme);
}

function updateThemeToggleIcon(theme) {
    const icon = document.getElementById('theme-toggle');
    if (icon) {
        if (theme === 'dark') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            icon.title = 'Cambiar a modo claro';
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            icon.title = 'Cambiar a modo oscuro';
        }
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark-mode');
    applyTheme(isDark ? 'light' : 'dark');
}

window.toggleTheme = toggleTheme;
// ------------------

// --- CUSTOM MODALS INFRASTRUCTURE ---
function injectCustomModals() {
    if (document.getElementById('custom-alert-modal')) return;

    const modalHTML = `
        <!-- Custom Alert Modal -->
        <div id="custom-alert-modal" class="custom-modal-overlay">
            <div class="custom-modal-box">
                <div id="custom-alert-icon" class="custom-modal-icon"></div>
                <div id="custom-alert-message" class="custom-modal-message"></div>
                <div class="custom-modal-actions">
                    <button id="custom-alert-ok" class="btn-modal btn-modal-primary">Aceptar</button>
                </div>
            </div>
        </div>

        <!-- Custom Confirm Modal -->
        <div id="custom-confirm-modal" class="custom-modal-overlay">
            <div class="custom-modal-box">
                <div class="custom-modal-icon warning"><i class="fas fa-question-circle"></i></div>
                <div id="custom-confirm-message" class="custom-modal-message"></div>
                <div class="custom-modal-actions">
                    <button id="custom-confirm-cancel" class="btn-modal btn-modal-secondary">Cancelar</button>
                    <button id="custom-confirm-ok" class="btn-modal btn-modal-danger">Aceptar</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function showAlert(message, type = 'info') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-alert-modal');
        const msgEl = document.getElementById('custom-alert-message');
        const iconEl = document.getElementById('custom-alert-icon');
        const btnOk = document.getElementById('custom-alert-ok');

        msgEl.textContent = message;
        
        let iconHtml = '';
        if (type === 'error') iconHtml = '<i class="fas fa-times-circle"></i>';
        else if (type === 'success') iconHtml = '<i class="fas fa-check-circle"></i>';
        else if (type === 'warning') iconHtml = '<i class="fas fa-exclamation-triangle"></i>';
        else iconHtml = '<i class="fas fa-info-circle"></i>';
        
        iconEl.innerHTML = iconHtml;
        iconEl.className = 'custom-modal-icon ' + type;

        modal.style.display = 'flex';
        // Trigger reflow for transition
        void modal.offsetWidth;
        modal.classList.add('show');

        const close = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
                resolve();
            }, 300);
            btnOk.removeEventListener('click', close);
        };

        btnOk.addEventListener('click', close);
        // Focus button for accessibility
        btnOk.focus();
    });
}

window.showAlert = showAlert; // Global scope

function showConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm-modal');
        const msgEl = document.getElementById('custom-confirm-message');
        const btnOk = document.getElementById('custom-confirm-ok');
        const btnCancel = document.getElementById('custom-confirm-cancel');

        msgEl.textContent = message;

        modal.style.display = 'flex';
        void modal.offsetWidth;
        modal.classList.add('show');

        const cleanup = () => {
             btnOk.replaceWith(btnOk.cloneNode(true));
             btnCancel.replaceWith(btnCancel.cloneNode(true));
        };

        const close = (result) => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
                resolve(result);
            }, 300);
            cleanup();
        };

        // Re-query buttons after replaceWith to ensure fresh listeners
        document.getElementById('custom-confirm-ok').addEventListener('click', () => close(true));
        document.getElementById('custom-confirm-cancel').addEventListener('click', () => close(false));
        
        document.getElementById('custom-confirm-ok').focus();
    });
}

window.showConfirm = showConfirm; // Global scope
// ------------------

let currentTable = '';
let currentData = [];

document.addEventListener('DOMContentLoaded', () => {
    initTheme(); // Initialize theme
    if (document.getElementById('current-date')) {
        updateDateTime();
        setInterval(updateDateTime, 1000);
    }
    if (document.getElementById('total-clientes')) loadStats();
    initAccordion();
    setupFormSubmit();
    setupModalClose();
    injectCustomModals(); // Inject modals on load

    // Routing Logic for Index SPA
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('table');
    if (tableParam) {
        loadData(tableParam);
    }
    
    setupBulkDelete();
    setupUserMenu();
    setupGlobalSearch();
    updateActiveSidebarItem();

    // --- AUTO-INJECT CUSTOM SELECT ASSETS ---
    if (!document.getElementById('custom-select-css')) {
        const link = document.createElement('link');
        link.id = 'custom-select-css';
        link.rel = 'stylesheet';
        link.href = 'css/custom-select.css';
        document.head.appendChild(link);
    }
    if (!document.getElementById('custom-select-js')) {
        const script = document.createElement('script');
        script.id = 'custom-select-js';
        script.src = 'js/custom-select.js';
        document.body.appendChild(script);
    }
});

function updateActiveSidebarItem() {
    const currentPath = window.location.pathname;
    const sidebarItems = document.querySelectorAll('.sidebar li');
    const headers = document.querySelectorAll('.accordion-header');
    const contents = document.querySelectorAll('.accordion-content');
    let matchedItem = null;

    sidebarItems.forEach(item => {
        const onclick = item.getAttribute('onclick');
        if (onclick && onclick.includes(currentPath)) {
            matchedItem = item;
        }
    });

    if (!matchedItem) return;

    sidebarItems.forEach(item => item.classList.remove('active'));
    headers.forEach(header => header.classList.remove('active'));
    contents.forEach(content => content.classList.remove('show'));
    matchedItem.classList.add('active');
    
    const section = matchedItem.closest('.menu-section');
    if (section) {
        const header = section.querySelector('.accordion-header');
        const content = section.querySelector('.accordion-content');
        if (header && content) {
            header.classList.add('active');
            content.classList.add('show');
            const arrow = header.querySelector('.arrow');
            if (arrow) {
                arrow.classList.remove('fa-chevron-right');
                arrow.classList.add('fa-chevron-down');
            }
        }
    }
}

function setupGlobalSearch() {
    const searchInput = document.querySelector('.search-box input');
    if (!searchInput) return;

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const searchTerm = searchInput.value.trim();
            if (searchTerm) {
                // If we are already on clientes.html, just filter. Otherwise redirect.
                if (window.location.pathname.includes('clientes.html')) {
                    const searchBox = document.getElementById('searchBox');
                    if (searchBox) {
                        searchBox.value = searchTerm;
                        // Trigger the existing filter logic in clientes.js
                        const event = new Event('keyup');
                        searchBox.dispatchEvent(event);
                    }
                } else {
                    window.location.href = `/clientes.html?search=${encodeURIComponent(searchTerm)}`;
                }
            }
        }
    });

    // Handle clicks on the search icon
    const searchIcon = document.querySelector('.search-box i');
    if (searchIcon) {
        searchIcon.style.cursor = 'pointer';
        searchIcon.addEventListener('click', () => {
            const event = new KeyboardEvent('keypress', { key: 'Enter' });
            searchInput.dispatchEvent(event);
        });
    }
}

function setupUserMenu() {
    const userIcon = document.querySelector('.fa-user-circle');
    if (!userIcon) return;
    
    // Inject Menu HTML and Overlay
    const menuHTML = `
        <div id="userDropdownOverlay" class="user-dropdown-overlay"></div>
        <div id="userDropdown" class="user-dropdown">
            <div class="dropdown-header">
                <div class="dropdown-username">${window.currentUser ? window.currentUser.Usuario : 'Usuario'}</div>
            </div>
            <div class="dropdown-item" onclick="showAlert('Información del usuario')">
                <i class="fas fa-info-circle"></i> Información
            </div>
            <div class="dropdown-item" onclick="showAlert('Configuración')">
                <i class="fas fa-cog"></i> Configuración
            </div>
            <div class="separator"></div>
            <div class="dropdown-item" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i> Cerrar sesión
            </div>
        </div>
    `;
    
    // Append to body (or specific container if needed, body is safest for absolute pos)
    document.body.insertAdjacentHTML('beforeend', menuHTML);
    
    const dropdown = document.getElementById('userDropdown');
    const overlay = document.getElementById('userDropdownOverlay');
    
    function toggleDropdown() {
        const isShow = dropdown.classList.toggle('show');
        overlay.classList.toggle('show', isShow);
    }

    function closeDropdown() {
        dropdown.classList.remove('show');
        overlay.classList.remove('show');
    }

    // Toggle click
    userIcon.parentElement.style.cursor = 'pointer';
    userIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown();
    });

    // Close on overlay click
    overlay.addEventListener('click', closeDropdown);
    
    // Close on click outside (fallback)
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== userIcon) {
            closeDropdown();
        }
    });
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('collapsed');
}

function openListadoModalGlobal() {
    // 1. Inyectar el modal si no existe (o si es una versión vieja sin el botón de previsualizar)
    const existing = document.getElementById('listadoModalGlobal');
    const hasPreview = existing ? existing.querySelector('button[onclick*="openPreviewListadoGlobal"]') : false;
    
    if (!existing || !hasPreview) {
        if (existing) existing.remove();
        injectListadoModal();
    }
    
    // 2. Mostrar modal
    const modal = document.getElementById('listadoModalGlobal');
    modal.classList.add('active');
    
    // 3. Hacerlo arrastrable (si no se hizo al inyectar o para asegurar)
    makeListadoModalDraggable();

    // 4. Centrarlo por defecto
    resetListadoModalPosition();
    
    // 5. Rellenar combos
    populateListadoDataGlobal();
}

/**
 * Inyecta dinámicamente el HTML del modal al final del body
 */
function injectListadoModal() {
    const html = `
    <div id="listadoModalGlobal" class="modal no-auto-drag">
        <div class="modal-content listado-content">
            <div class="modal-header-listado" id="listadoHeader">
                <div class="header-left">
                    <i class="fas fa-print"></i>
                    <h2>Listado de Aplicaciones por Clientes</h2>
                </div>
                <div class="header-actions">
                    <button class="restore-btn" onclick="resetListadoModalPosition()" title="Centrar ventana"><i class="fas fa-crosshairs"></i></button>
                    <button class="close-btn-red" onclick="closeListadoModalGlobal()">&times;</button>
                </div>
            </div>
            
            <div class="modal-body-listado">
                <div class="listado-grid-container">
                    <!-- Columna Izquierda: Tipos y Poblaciones -->
                    <div class="listado-col">
                        <div class="listado-section">
                            <h3>Tipo de cliente</h3>
                            <div class="listado-row">
                                <label>Desde</label>
                                <select id="globListTipoDesde">
                                    <option value="">(Seleccionar)</option>
                                </select>
                            </div>
                            <div class="listado-row">
                                <label>Hasta</label>
                                <select id="globListTipoHasta">
                                    <option value="">(Seleccionar)</option>
                                </select>
                            </div>
                        </div>

                        <div class="listado-section no-border">
                            <h3>Poblaciones</h3>
                            <div class="listado-row">
                                <label>Desde</label>
                                <select id="globListPobDesde">
                                    <option value="">(Seleccionar)</option>
                                </select>
                            </div>
                            <div class="listado-row">
                                <label>Hasta</label>
                                <select id="globListPobHasta">
                                    <option value="">(Seleccionar)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Columna Derecha: Aplicaciones y Opciones -->
                    <div class="listado-col">
                        <div class="listado-section">
                            <h3>Aplicaciones</h3>
                            <div class="listado-row">
                                <label>Aplicación</label>
                                <select id="globListAppApp">
                                    <option value="">(Todas)</option>
                                </select>
                            </div>
                            <div class="listado-row">
                                <label>Desarrollo</label>
                                <select id="globListAppDes">
                                    <option value="">(Todos)</option>
                                </select>
                            </div>
                            <div class="listado-row">
                                <label>Plataforma</label>
                                <select id="globListAppPlat">
                                    <option value="">(Todas)</option>
                                </select>
                            </div>
                        </div>

                        <div class="listado-section no-border">
                            <h3>Opciones</h3>
                            <div class="listado-row checkbox-row">
                                <input type="checkbox" id="globListOptContrato">
                                <label for="globListOptContrato">Solo con contrato</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal-footer-listado">
                <button class="btn-icon-large" title="Previsualizar" onclick="openPreviewListadoGlobal()"><i class="fas fa-id-card"></i></button>
                <button class="btn-icon-large" title="Imprimir" onclick="printClientListGlobal()"><i class="fas fa-print"></i></button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
    makeListadoModalDraggable();
}

/**
 * Hace que el modal de listado sea arrastrable desde su cabecera
 */
function makeListadoModalDraggable() {
    const modal = document.getElementById('listadoModalGlobal');
    if (!modal) return;
    
    const header = modal.querySelector('.modal-header-listado');
    const content = modal.querySelector('.listado-content');
    if (!header || !content) return;

    let isDragging = false;
    let offsetX, offsetY;

    header.onmousedown = function(e) {
        if (e.target.closest('.close-btn-red')) return;
        
        isDragging = true;
        modal.style.backdropFilter = 'none';
        
        const rect = content.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        content.style.position = 'fixed';
        content.style.margin = '0';
        content.style.left = rect.left + 'px';
        content.style.top = rect.top + 'px';
        content.style.transform = 'none';

        document.onmousemove = function(e) {
            if (!isDragging) return;
            let left = e.clientX - offsetX;
            let top = e.clientY - offsetY;
            
            // Límites
            left = Math.max(0, Math.min(left, window.innerWidth - content.offsetWidth));
            top = Math.max(0, Math.min(top, window.innerHeight - content.offsetHeight));
            
            content.style.left = left + 'px';
            content.style.top = top + 'px';
        };

        document.onmouseup = function() {
            isDragging = false;
            modal.style.backdropFilter = '';
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };
}

function closeListadoModalGlobal() {
    const modal = document.getElementById('listadoModalGlobal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function populateListadoDataGlobal() {
    try {
        console.log('[DEBUG] Iniciando populateListadoDataGlobal...');
        
        // Pequeño retardo para asegurar que el DOM ha procesado la inyección
        await new Promise(resolve => setTimeout(resolve, 50));

        const endpoints = [
            { id: 'tipos', url: '/api/tiposclientes', sels: ['globListTipoDesde', 'globListTipoHasta'], label: '(Seleccionar)' },
            { id: 'poblaciones', url: '/api/poblaciones', sels: ['globListPobDesde', 'globListPobHasta'], label: '(Seleccionar)' },
            { id: 'aplicaciones', url: '/api/aplicaciones', sels: ['globListAppApp'], label: '(Todas)' },
            { id: 'desarrollos', url: '/api/desarrollos', sels: ['globListAppDes'], label: '(Todos)' },
            { id: 'plataformas', url: '/api/plataformas', sels: ['globListAppPlat'], label: '(Todas)' }
        ];

        for (const ep of endpoints) {
            try {
                console.log(`[DEBUG] Cargando ${ep.id} desde ${ep.url}...`);
                const res = await fetch(ep.url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                
                const data = await res.json();
                if (!Array.isArray(data)) {
                    console.warn(`[DEBUG] ${ep.id} no devolvió un array:`, data);
                    continue;
                }

                const sorted = data.sort((a,b) => (a.Nombre || '').localeCompare(b.Nombre || ''));
                console.log(`[DEBUG] ${ep.id} cargados: ${sorted.length} registros.`);

                ep.sels.forEach(id => {
                    const sel = document.getElementById(id);
                    if (sel) {
                        const currentVal = sel.value;
                        let optionsHtml = `<option value="">${ep.label}</option>`;
                        sorted.forEach(item => {
                            optionsHtml += `<option value="${item.ID}">${item.Nombre || '---'}</option>`;
                        });
                        sel.innerHTML = optionsHtml; // Batch update
                        if (currentVal) sel.value = currentVal;
                    } else {
                        console.error(`[DEBUG] No se encontró el elemento select con ID: ${id}`);
                    }
                });
            } catch (err) {
                console.error(`[DEBUG] Error cargando ${ep.id}:`, err);
            }
        }

        console.log('[DEBUG] populateListadoDataGlobal finalizado.');
    } catch (error) {
        console.error('[DEBUG] Error crítico en populateListadoDataGlobal:', error);
    }
}

/**
 * Resetea la posición del modal de listado al centro de la pantalla
 */
function resetListadoModalPosition() {
    const content = document.querySelector('#listadoModalGlobal .listado-content');
    if (content) {
        content.style.position = 'relative';
        content.style.left = '0';
        content.style.top = '0';
        content.style.margin = '0';
        content.style.transform = 'none';
    }
}

/**
 * Recopila filtros y abre la ventana de previsualización con datos reales
 */
async function openPreviewListadoGlobal() {
    console.log('[DEBUG] Botón Previsualizar pulsado.');
    
    // Validar que existen los elementos clave
    const requiredIds = ['globListTipoDesde', 'globListTipoHasta', 'globListPobDesde', 'globListPobHasta', 'globListAppApp', 'globListAppDes', 'globListAppPlat', 'globListOptContrato'];
    for (const id of requiredIds) {
        if (!document.getElementById(id)) {
            console.error(`[DEBUG] Elemento faltante: ${id}`);
            if (window.showAlert) showAlert(`Error interno: No se encuentra el campo ${id}. Intenta cerrar y abrir el listado.`, 'error');
            return;
        }
    }

    const filters = {
        tipoDesde: document.getElementById('globListTipoDesde').value,
        tipoHasta: document.getElementById('globListTipoHasta').value,
        pobDesde: document.getElementById('globListPobDesde').value,
        pobHasta: document.getElementById('globListPobHasta').value,
        appId: document.getElementById('globListAppApp').value,
        desId: document.getElementById('globListAppDes').value,
        platId: document.getElementById('globListAppPlat').value,
        soloContrato: document.getElementById('globListOptContrato').checked
    };

    const btn = document.querySelector('button[onclick="openPreviewListadoGlobal()"]');
    try {
        console.log('[DEBUG] Solicitando previsualización con:', filters);
        if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const res = await fetch('/api/clientes/filter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(filters)
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        // Inyectar y mostrar modal de previsualización
        injectPreviewListadoModal();
        renderPreviewItems(data);
        
        const modal = document.getElementById('listadoPreviewModal');
        modal.classList.add('active');
        
        // Forzar reflow para animación
        setTimeout(() => {
            modal.querySelector('.preview-listado-content').style.opacity = '1';
        }, 10);
        
    } catch (err) {
        console.error('[DEBUG] Error en previsualización:', err);
        if (window.showAlert) showAlert('Error al cargar la previsualización: ' + err.message, 'error');
    } finally {
        if (btn) btn.innerHTML = '<i class="fas fa-id-card"></i>';
    }
}
window.openPreviewListadoGlobal = openPreviewListadoGlobal;

function injectPreviewListadoModal() {
    if (document.getElementById('listadoPreviewModal')) return;

    const html = `
    <div id="listadoPreviewModal" class="modal no-auto-drag">
        <div class="modal-content preview-listado-content">
            <div class="modal-header-listado" id="previewHeader">
                <div class="header-left">
                    <i class="fas fa-id-card"></i>
                    <h2>Aplicaciones por Clientes</h2>
                </div>
                <div class="header-actions">
                    <button class="restore-btn" onclick="resetPreviewPosition()" title="Centrar ventana"><i class="fas fa-crosshairs"></i></button>
                    <button class="close-btn-red" onclick="closeListadoPreview()">&times;</button>
                </div>
            </div>
            
            <div class="modal-body-listado-preview">
                <div class="preview-search-bar" style="margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-search" style="color: var(--text-muted); font-size: 0.9rem;"></i>
                    <input type="text" id="previewSearchInput" placeholder="Buscar por cliente, aplicación, desarrollo, plataforma..." 
                           style="flex: 1; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); font-size: 0.9rem;"
                           oninput="window.filterPreviewTable(this.value)">
                </div>
                <div class="preview-table-container">
                    <table class="preview-data-table">
                        <thead>
                            <tr>
                                <th>Aplicación</th>
                                <th>Versión</th>
                                <th>Desarrollo</th>
                                <th>Plataforma</th>
                                <th style="text-align:center;">Licencias</th>
                                <th style="text-align:center;">Contrato</th>
                                <th>Teléfono</th>
                                <th>Móvil</th>
                                <th>Correo electrónico</th>
                            </tr>
                        </thead>
                        <tbody id="previewListadoBody">
                            <!-- Los datos se inyectarán aquí -->
                        </tbody>
                    </table>
                </div>
                <div id="previewEmptyMsg" style="display:none; text-align:center; padding: 20px; color: var(--text-muted);">
                    No se encontraron clientes con los filtros seleccionados.
                </div>
            </div>
            
            <div class="modal-footer-listado" style="justify-content: space-between;">
                <div class="preview-stats">
                    <span id="previewCount">0</span> clientes encontrados
                </div>
                <div class="preview-actions" style="display: flex; gap: 10px; align-items: center;">
                    <button class="btn-export btn-word" onclick="exportPreviewToWord()" title="Exportar a Word"><i class="fas fa-file-word"></i> Word</button>
                    <button class="btn-export btn-excel" onclick="exportPreviewToExcel()" title="Exportar a Excel"><i class="fas fa-file-excel"></i> Excel</button>
                    <button class="btn-export btn-pdf" onclick="exportPreviewToPdf()" title="Exportar a PDF"><i class="fas fa-file-pdf"></i> PDF</button>
                    <button class="btn-export btn-print" onclick="printPreviewList(false)" title="Imprimir"><i class="fas fa-print"></i> Imprimir</button>
                    <button class="btn btn-primary" onclick="closeListadoPreview()" style="min-width: 100px; height: 38px;">Cerrar</button>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    
    // Hacerlo arrastrable
    makePreviewDraggable();
}

function renderPreviewItems(data, isFiltered = false) {
    const body = document.getElementById('previewListadoBody');
    const emptyMsg = document.getElementById('previewEmptyMsg');
    const countSpan = document.getElementById('previewCount');
    
    if (!body) return;
    
    // Guardar datos originales si no es una llamada de filtro
    if (!isFiltered) {
        window.allPreviewData = data;
    }
    // Siempre actualizar los datos actuales visibles
    window.currentPreviewData = data;

    body.innerHTML = '';
    if (countSpan) countSpan.textContent = data.length;

    if (data.length === 0) {
        emptyMsg.style.display = 'block';
    } else {
        emptyMsg.style.display = 'none';
        let currentCliente = null;
        let clientIdx = 0;

        data.forEach(c => {
            // RUPTURA POR CLIENTE
            if (c.NombreComercial !== currentCliente) {
                currentCliente = c.NombreComercial;
                clientIdx++;
                const headerRow = `
                    <tr class="preview-group-header" onclick="toggleClientGroup(${clientIdx})" style="cursor: pointer;">
                        <td colspan="6">
                            <i class="fas fa-chevron-right toggle-icon-${clientIdx}" style="margin-right: 12px; color: var(--accent-color); font-size: 0.8rem; transition: transform 0.2s; transform: rotate(90deg);"></i>
                            <span style="font-weight: bold; font-style: italic;">${c.NombreComercial}</span>
                        </td>
                        <td>${c.Telefono1 || ''}</td>
                        <td>${c.Telefono2 || ''}</td>
                        <td style="font-size: 0.8rem;">${c.Email || ''}</td>
                    </tr>
                `;
                body.insertAdjacentHTML('beforeend', headerRow);
            }

            const contratoIcon = c.Contrato == 1 
                ? '<i class="fas fa-check" style="color: #2ecc71; font-size: 0.9rem;" title="Con contrato"></i>' 
                : '<i class="fas fa-times" style="color: #e74c3c; font-size: 0.9rem;" title="Sin contrato"></i>';
            
            const row = `
                <tr class="client-group-${clientIdx}">
                    <td>${c.AplicacionNombre || '---'}</td>
                    <td>${c.Version || ''}</td>
                    <td>${c.DesarrolloNombre || ''}</td>
                    <td>${c.PlataformaNombre || ''}</td>
                    <td style="text-align:center;">${c.Licencias || 0}</td>
                    <td style="text-align:center;">${contratoIcon}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            `;
            body.insertAdjacentHTML('beforeend', row);
        });

        // Actualizar leyenda con instrucción
        const statsContainer = document.querySelector('.preview-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `Mostrando <span>${data.length}</span> registros agrupados por cliente <small style="margin-left: 10px; opacity: 0.8; font-weight: normal;">(Haz clic en la fila para contraer/expandir)</small>`;
        }
    }
}

// Función global para colapsar/expandir grupos
window.toggleClientGroup = function(idx) {
    const rows = document.querySelectorAll(`.client-group-${idx}`);
    const icon = document.querySelector(`.toggle-icon-${idx}`);
    
    rows.forEach(row => {
        if (row.style.display === 'none') {
            row.style.display = '';
            if (icon) icon.style.transform = 'rotate(90deg)';
        } else {
            row.style.display = 'none';
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    });
};

/**
 * Filtra los datos locales de la previsualización
 */
window.filterPreviewTable = function(query) {
    if (!window.allPreviewData) return;
    
    const q = query.toLowerCase().trim();
    if (!q) {
        renderPreviewItems(window.allPreviewData, true);
        return;
    }

    // Filtrar: si coincide cualquier campo de la fila, incluirla
    const filtered = window.allPreviewData.filter(c => {
        const textToSearch = [
            c.NombreComercial,
            c.AplicacionNombre,
            c.DesarrolloNombre,
            c.PlataformaNombre,
            c.Telefono1,
            c.Telefono2,
            c.Email
        ].join(' ').toLowerCase();
        
        return textToSearch.includes(q);
    });

    renderPreviewItems(filtered, true);
};

// --- Funciones de Exportación ---

function exportPreviewToWord() {
    if (!window.currentPreviewData || window.currentPreviewData.length === 0) {
        if (window.showAlert) showAlert('No hay datos para exportar.', 'warning');
        return;
    }
    
    // Header XML para Word (Landscape)
    const xmlLandscape = `
        <xml>
            <w:WordDocument>
                <w:View>Print</w:View>
                <w:Zoom>90</w:Zoom>
                <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
        </xml>
    `;
    
    // CSS embebido para Word
    // margin: 1.5cm EXACTOS
    const cssStyles = `
        <style>
            @page {
                size: 29.7cm 21cm; /* A4 Landscape explicit */
                margin: 1.5cm;
                mso-page-orientation: landscape;
                mso-header-margin: 1.5cm;
                mso-footer-margin: 1.5cm;
            }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; }
            h2 { font-size: 16pt; margin-bottom: 5px; color: #000; border-bottom: 2px solid #000; padding-bottom: 5px; }
            .meta { margin-bottom: 20px; font-size: 9pt; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; border-spacing: 0; }
            th { text-align: left; border-bottom: 1px solid #000; padding: 4px; font-weight: bold; background: #eee; border: 1px solid #000; font-size: 10pt; }
            td { border-bottom: 1px solid #ccc; padding: 4px; vertical-align: middle; border: 1px solid #ccc; font-size: 10pt; }
            
            /* Group Header Styles */
            .group-header td { 
                background-color: #f0f0f0 !important; 
                border-top: 2px solid #999 !important; 
                border-bottom: 1px solid #999 !important;
                padding-top: 3px !important;
                padding-bottom: 3px !important;
            }
            .client-name { font-size: 12pt; font-weight: bold; margin-bottom: 2px; margin-top: 0; }
            .client-contact { font-size: 9pt; font-style: italic; color: #444; }

            .text-center { text-align: center; }
            .contract-ok { color: green; font-weight: bold; }
            .contract-no { color: red; font-weight: bold; }
            .spacer-row td { border: none !important; height: 20px; background-color: #fff !important; }
        </style>
    `;

    const now = new Date();
    const fechaStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let htmlContent = `
        <div style="width: 100%;">
            <h2>Listado de Aplicaciones por Clientes</h2>
            <div class="meta" style="border-bottom: 0px;">
                Fecha: ${fechaStr} ${horaStr} | 
                Total Registros: ${window.currentPreviewData.length}
            </div>
            <table border="1" style="width: 100%;">
                <thead>
                    <tr>
                        <th style="width: 30%;">Aplicación</th>
                        <th style="width: 10%;">Versión</th>
                        <th style="width: 20%;">Desarrollo</th>
                        <th style="width: 20%;">Plataforma</th>
                        <th class="text-center" style="width: 8%;">Lic.</th>
                        <th class="text-center" style="width: 12%;">Contrato</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let currentCliente = null;
    let isFirst = true;

    window.currentPreviewData.forEach(c => {
         if (c.NombreComercial !== currentCliente) {
            currentCliente = c.NombreComercial;
            
            if (!isFirst) {
                htmlContent += `<tr class="spacer-row"><td colspan="6" style="border:none; height:20px;"></td></tr>`;
            }
            isFirst = false;

            const contactParts = [];
            if (c.Telefono1) contactParts.push(`Tel: ${c.Telefono1}`);
            if (c.Telefono2) contactParts.push(`Alt: ${c.Telefono2}`);
            if (c.TelefonoMovil) contactParts.push(`Móvil: ${c.TelefonoMovil}`);
            if (c.Email) contactParts.push(`Email: ${c.Email}`);
            
            const contactString = contactParts.join(' | ');

            htmlContent += `
                <tr class="group-header">
                    <td colspan="6" style="background-color: #f0f0f0;">
                        <div class="client-name">${c.NombreComercial}</div>
                        <div class="client-contact">${contactString}</div>
                    </td>
                </tr>
            `;
        }

        const contractStatus = c.Contrato == 1 ? '<span class="contract-ok">Sí</span>' : '<span class="contract-no">No</span>';
        
        htmlContent += `
        <tr>
            <td>${c.AplicacionNombre || '-'}</td>
            <td>${c.Version || ''}</td>
            <td>${c.DesarrolloNombre || ''}</td>
            <td>${c.PlataformaNombre || ''}</td>
            <td class="text-center">${c.Licencias || 0}</td>
            <td class="text-center">${contractStatus}</td>
        </tr>`;
    });

    htmlContent += '</tbody></table></div>';

    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Listado</title>${xmlLandscape}${cssStyles}</head><body>`;
    const footer = `</body></html>`;
    const sourceHTML = header + htmlContent + footer;

    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = 'listado_clientes.doc';
    fileDownload.click();
    document.body.removeChild(fileDownload);
}

// Helper para cargar scripts dinámicamente
function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function exportPreviewToPdf() {
    if (!window.currentPreviewData || window.currentPreviewData.length === 0) {
        if (window.showAlert) showAlert('No hay datos para exportar.', 'warning');
        return;
    }

    const btn = document.querySelector('.btn-pdf');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

    try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js');

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm' });

        // Título con línea negra debajo
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("Listado de Aplicaciones por Clientes", 14, 15);
        doc.setLineWidth(0.5);
        doc.line(14, 16, 280, 16); // Línea horizontal larga
        
        const now = new Date();
        const fechaStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const horaStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Fecha: ${fechaStr} ${horaStr} | Total: ${window.currentPreviewData.length}`, 14, 22);

        const tableColumn = ["Aplicación", "Versión", "Desarrollo", "Plataforma", "Lic.", "Contrato"];
        const tableRows = [];

        let currentCliente = null;
        let isFirst = true;

        window.currentPreviewData.forEach(c => {
            if (c.NombreComercial !== currentCliente) {
                currentCliente = c.NombreComercial;
                
                // Spacer row
                if(!isFirst) {
                    tableRows.push([{ content: '', colSpan: 6, styles: { cellPadding: 1, fillColor: [255, 255, 255], lineColor: [255,255,255] } }]);
                }
                isFirst = false;

                const contactParts = [];
                if (c.Telefono1) contactParts.push(`Tel: ${c.Telefono1}`);
                if (c.Telefono2) contactParts.push(`Alt: ${c.Telefono2}`);
                if (c.TelefonoMovil) contactParts.push(`Móvil: ${c.TelefonoMovil}`);
                if (c.Email) contactParts.push(`Email: ${c.Email}`);
                const contactString = contactParts.join(' | ');
                
                // Fila de Grupo
                tableRows.push([{ 
                    content: `${c.NombreComercial}\n${contactString}`, 
                    colSpan: 6, 
                    styles: { 
                        fillColor: [240, 240, 240], 
                        fontStyle: 'bold', 
                        halign: 'left',
                        textColor: [0, 0, 0],
                        lineColor: [150, 150, 150],
                        lineWidth: { top: 0.1, bottom: 0.1 }
                    } 
                }]);
            }

            const contrato = c.Contrato == 1 ? 'Sí' : 'No';
            
            tableRows.push([
                c.AplicacionNombre || '-',
                c.Version || '',
                c.DesarrolloNombre || '',
                c.PlataformaNombre || '',
                c.Licencias || '0',
                c.Contrato == 1 ? 'Sí' : 'No'
            ]);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 25,
            theme: 'plain',
            styles: { 
                fontSize: 9, 
                cellPadding: 3, 
                overflow: 'linebreak',
                lineColor: [200, 200, 200],
                lineWidth: 0.1,
                valign: 'middle'
            },
            headStyles: { 
                fillColor: [245, 245, 245], 
                textColor: [0, 0, 0], 
                fontStyle: 'bold',
                lineColor: [0, 0, 0],
                lineWidth: { bottom: 0.5 }
            },
            columnStyles: {
                0: { cellWidth: 'auto' }, 
                1: { cellWidth: 20 },     
                4: { cellWidth: 12, halign: 'center' }, // Lic
                5: { cellWidth: 22, halign: 'center' }  // Contrato
            },
            didParseCell: function(data) {
                // Colorear contrato
                if (data.section === 'body' && data.column.index === 5) {
                    if (data.cell.raw === 'Sí') data.cell.styles.textColor = [0, 128, 0];
                    else data.cell.styles.textColor = [200, 0, 0];
                }
            }
        });

        doc.save('listado_clientes.pdf');

    } catch (err) {
        console.error("Error generando PDF:", err);
        if (window.showAlert) showAlert('Error generando PDF: ' + err.message, 'error');
    } finally {
        if (btn) btn.innerHTML = originalText;
    }
}

function exportPreviewToExcel() {
    if (!window.currentPreviewData || window.currentPreviewData.length === 0) {
        if (window.showAlert) showAlert('No hay datos para exportar.', 'warning');
        return;
    }

    // Header simple para Excel
    let tableHtml = `
        <table border="1">
            <thead>
                <tr>
                    <th style="background-color: #eee; font-weight: bold; border: 1px solid #000;">Aplicación</th>
                    <th style="background-color: #eee; font-weight: bold; border: 1px solid #000;">Versión</th>
                    <th style="background-color: #eee; font-weight: bold; border: 1px solid #000;">Desarrollo</th>
                    <th style="background-color: #eee; font-weight: bold; border: 1px solid #000;">Plataforma</th>
                    <th style="background-color: #eee; font-weight: bold; border: 1px solid #000;">Licencias</th>
                    <th style="background-color: #eee; font-weight: bold; border: 1px solid #000;">Contrato</th>
                </tr>
            </thead>
            <tbody>
    `;

    let currentCliente = null;
    let isFirst = true;

    window.currentPreviewData.forEach(c => {
        if (c.NombreComercial !== currentCliente) {
            currentCliente = c.NombreComercial;
            
            // Spacer row
            if (!isFirst) {
                tableHtml += `<tr><td colspan="6" style="height:20px; border:none;"></td></tr>`;
            }
            isFirst = false;

            const contactParts = [];
            if (c.Telefono1) contactParts.push(`Tel: ${c.Telefono1}`);
            if (c.Telefono2) contactParts.push(`Alt: ${c.Telefono2}`);
            if (c.TelefonoMovil) contactParts.push(`Móvil: ${c.TelefonoMovil}`);
            if (c.Email) contactParts.push(`Email: ${c.Email}`);
            const contact = contactParts.join(' | ');
            
            // Group Header Row
            tableHtml += `
                <tr>
                    <td colspan="6" style="background-color: #f0f0f0; font-weight: bold; border-top: 2px solid #999;border-bottom: 2px solid #999; vertical-align: middle;">
                        <span style="font-size: 11pt;">${c.NombreComercial}</span><br/>
                        <span style="font-weight: normal; color: #555; font-size: 9pt;">${contact}</span>
                    </td>
                </tr>
            `;
        }

        const contrato = c.Contrato == 1 ? 'Sí' : 'No';
        const colorContrato = c.Contrato == 1 ? 'green' : 'red';
        
        tableHtml += `
            <tr>
                <td style="border: 1px solid #ccc;">${c.AplicacionNombre || '-'}</td>
                <td style="border: 1px solid #ccc;">${c.Version || ''}</td>
                <td style="border: 1px solid #ccc;">${c.DesarrolloNombre || ''}</td>
                <td style="border: 1px solid #ccc;">${c.PlataformaNombre || ''}</td>
                <td style="border: 1px solid #ccc; text-align: center;">${c.Licencias || 0}</td>
                <td style="border: 1px solid #ccc; text-align: center; color: ${colorContrato}; font-weight: bold;">${contrato}</td>
            </tr>
        `;
    });

    tableHtml += '</tbody></table>';

    const downloadLink = document.createElement("a");
    const blob = new Blob(['\ufeff', tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    
    downloadLink.href = url;
    downloadLink.download = "listado_clientes.xls";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

function printPreviewList(isPdf) {
    if (!window.currentPreviewData || window.currentPreviewData.length === 0) {
        if (window.showAlert) showAlert('No hay datos para imprimir.', 'warning');
        return;
    }
    
    // Reutilizar lógica de diseño de printClientListGlobal pero con currentPreviewData
    const data = window.currentPreviewData;
    
    // Generar HTML (copia de la lógica de impresión existente)
    let printHtml = `
        <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Listado de Aplicaciones por Clientes</title>
                <style>
                    @page { 
                        size: portrait; 
                        margin: 15mm 10mm 15mm 10mm;
                        @bottom-center {
                            content: "Página " counter(page) " de " counter(pages);
                            font-family: 'Segoe UI', Arial, sans-serif;
                            font-size: 10px;
                        }
                    }
                    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; margin: 0; color: #000; }
                    h2 { margin-bottom: 5px; color: #000; border-bottom: 2px solid #000; padding-bottom: 5px; }
                    .meta { margin-bottom: 20px; font-size: 10px; color: #555; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { text-align: left; border-bottom: 1px solid #000; padding: 4px; font-weight: bold; background: #eee; }
                    td { border-bottom: 1px solid #ccc; padding: 4px; vertical-align: middle; }
                    .group-header { background-color: #f0f0f0; break-inside: avoid; border-top: 2px solid #999; }
                    .group-header td { font-weight: bold; font-style: italic; padding-top: 2px; padding-bottom: 4px; border-bottom: 1px solid #999; vertical-align: top; }
                    .text-center { text-align: center; }
                    .client-name { font-size: 13px; display: block; margin-bottom: 2px; }
                    .client-contact { font-size: 11px; font-weight: normal; color: #444; }
                    .contract-ok { color: green; font-weight: bold; }
                    .contract-no { color: red; font-weight: bold; }
                    .spacer-row td { border: none; height: 20px; }
                    @media print {
                        .group-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .spacer-row { height: 20px; }
                        body::after {
                            content: "";
                            display: block;
                            height: 20px;
                        }
                    }
                </style>
            </head>
            <body>
                <h2>Listado de Aplicaciones por Clientes</h2>
                <div class="meta">
                    Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} | 
                    Total Registros: ${data.length}
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Aplicación</th>
                            <th>Versión</th>
                            <th>Desarrollo</th>
                            <th>Plataforma</th>
                            <th class="text-center">Lic.</th>
                            <th class="text-center">Cont.</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    let currentCliente = null;
    let isFirst = true;

    data.forEach(c => {
         if (c.NombreComercial !== currentCliente) {
            currentCliente = c.NombreComercial;
            if (!isFirst) {
                printHtml += `<tr class="spacer-row"><td colspan="6"></td></tr>`;
            }
            isFirst = false;

            const contactParts = [];
            if (c.Telefono1) contactParts.push(`Tel: ${c.Telefono1}`);
            if (c.Telefono2) contactParts.push(`Alt: ${c.Telefono2}`);
            if (c.TelefonoMovil) contactParts.push(`Móvil: ${c.TelefonoMovil}`);
            if (c.Email) contactParts.push(`Email: ${c.Email}`);
            
            const contactString = contactParts.join(' | ');

            printHtml += `
                <tr class="group-header">
                    <td colspan="6">
                        <span class="client-name">${c.NombreComercial}</span>
                        <span class="client-contact">${contactString}</span>
                    </td>
                </tr>
            `;
        }

        const contractStatus = c.Contrato == 1 ? '<span class="contract-ok">✔</span>' : '<span class="contract-no">✖</span>';
        
        printHtml += `
        <tr>
            <td>${c.AplicacionNombre || '-'}</td>
            <td>${c.Version || ''}</td>
            <td>${c.DesarrolloNombre || ''}</td>
            <td>${c.PlataformaNombre || ''}</td>
            <td class="text-center">${c.Licencias || 0}</td>
            <td class="text-center">${contractStatus}</td>
        </tr>`;
    });

    printHtml += `
            </tbody>
        </table>
        <script>
            window.onload = function() { 
                ${isPdf ? "alert('Para guardar como PDF, selecciona \"Guardar como PDF\" en el destino de impresión.');" : ""}
                window.print(); 
                window.onafterprint = function() { window.close(); };
            }
        </script>
    </body>
    </html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(printHtml);
        printWindow.document.close();
    } else {
        if (window.showAlert) showAlert('El navegador bloqueó la ventana emergente.', 'warning');
    }
}

function closeListadoPreview() {
    const modal = document.getElementById('listadoPreviewModal');
    if (modal) modal.classList.remove('active');
}

/**
 * Genera y abre una ventana de impresión con el listado filtrado
 */
async function printClientListGlobal() {
    console.log('[DEBUG] Botón Imprimir pulsado.');
    
    // 1. Recopilar filtros (Misma lógica que Preview)
    const requiredIds = ['globListTipoDesde', 'globListTipoHasta', 'globListPobDesde', 'globListPobHasta', 'globListAppApp', 'globListAppDes', 'globListAppPlat', 'globListOptContrato'];
    for (const id of requiredIds) {
        if (!document.getElementById(id)) {
            if (window.showAlert) showAlert(`Error interno: No se encuentra el campo ${id}.`, 'error');
            return;
        }
    }

    const filters = {
        tipoDesde: document.getElementById('globListTipoDesde').value,
        tipoHasta: document.getElementById('globListTipoHasta').value,
        pobDesde: document.getElementById('globListPobDesde').value,
        pobHasta: document.getElementById('globListPobHasta').value,
        appId: document.getElementById('globListAppApp').value,
        desId: document.getElementById('globListAppDes').value,
        platId: document.getElementById('globListAppPlat').value,
        soloContrato: document.getElementById('globListOptContrato').checked
    };

    const btn = document.querySelector('button[onclick="printClientListGlobal()"]');
    
    try {
        if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        // 2. Obtener datos
        const res = await fetch('/api/clientes/filter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(filters)
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        if (data.length === 0) {
            if (window.showAlert) showAlert('No hay datos para imprimir con los filtros actuales.', 'info');
            return;
        }

        // 3. Generar HTML para imprimir
        let printHtml = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Listado de Aplicaciones por Clientes</title>
                <style>
                    @page { 
                        size: portrait; 
                        margin: 15mm 10mm 15mm 10mm; /* Increased bottom margin for footer */
                        @bottom-center {
                            content: "Página " counter(page) " de " counter(pages);
                            font-family: 'Segoe UI', Arial, sans-serif;
                            font-size: 10px;
                        }
                    }
                    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; margin: 0; color: #000; }
                    h2 { margin-bottom: 5px; color: #000; border-bottom: 2px solid #000; padding-bottom: 5px; }
                    .meta { margin-bottom: 20px; font-size: 10px; color: #555; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { text-align: left; border-bottom: 1px solid #000; padding: 4px; font-weight: bold; background: #eee; }
                    td { border-bottom: 1px solid #ccc; padding: 4px; vertical-align: middle; }
                    .group-header { background-color: #f0f0f0; break-inside: avoid; border-top: 2px solid #999; }
                    .group-header td { font-weight: bold; font-style: italic; padding-top: 2px; padding-bottom: 4px; border-bottom: 1px solid #999; vertical-align: top; }
                    .text-center { text-align: center; }
                    .client-name { font-size: 13px; display: block; margin-bottom: 2px; }
                    .client-contact { font-size: 11px; font-weight: normal; color: #444; }
                    .contract-ok { color: green; font-weight: bold; }
                    .contract-no { color: red; font-weight: bold; }
                    .spacer-row td { border: none; height: 20px; }
                    @media print {
                        .group-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .spacer-row { height: 20px; }
                        /* Fallback footer for browsers not supporting @page content */
                        body::after {
                            content: "";
                            display: block;
                            height: 20px;
                        }
                    }
                </style>
            </head>
            <body>
                <h2>Listado de Aplicaciones por Clientes</h2>
                <div class="meta">
                    Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} | 
                    Total Registros: ${data.length}
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Aplicación</th>
                            <th>Versión</th>
                            <th>Desarrollo</th>
                            <th>Plataforma</th>
                            <th class="text-center">Lic.</th>
                            <th class="text-center">Cont.</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        let currentCliente = null;
        let isFirst = true;
        
        data.forEach(c => {
            // Ruptura por Cliente
            if (c.NombreComercial !== currentCliente) {
                currentCliente = c.NombreComercial;
                
                // Spacer antes del grupo (salvo el primero)
                if (!isFirst) {
                    printHtml += `<tr class="spacer-row"><td colspan="6"></td></tr>`;
                }
                isFirst = false;

                // Construir string de contacto completo
                const contactParts = [];
                if (c.Telefono1) contactParts.push(`Tel: ${c.Telefono1}`);
                if (c.Telefono2) contactParts.push(`Alt: ${c.Telefono2}`);
                if (c.TelefonoMovil) contactParts.push(`Móvil: ${c.TelefonoMovil}`);
                if (c.Email) contactParts.push(`Email: ${c.Email}`);
                
                const contactString = contactParts.join(' | ');

                printHtml += `
                    <tr class="group-header">
                        <td colspan="6">
                            <span class="client-name">${c.NombreComercial}</span>
                            <span class="client-contact">
                                ${contactString}
                            </span>
                        </td>
                    </tr>
                `;
            }

            const contractStatus = c.Contrato == 1 ? '<span class="contract-ok">✔</span>' : '<span class="contract-no">✖</span>';
            
            printHtml += `
            <tr>
                <td>${c.AplicacionNombre || '-'}</td>
                <td>${c.Version || ''}</td>
                <td>${c.DesarrolloNombre || ''}</td>
                <td>${c.PlataformaNombre || ''}</td>
                <td class="text-center">${c.Licencias || 0}</td>
                <td class="text-center">${contractStatus}</td>
            </tr>`;
        });

        printHtml += `
                    </tbody>
                </table>
                <script>
                    window.onload = function() { 
                        window.print(); 
                        window.onafterprint = function() {
                            window.close();
                        };
                    }
                </script>
            </body>
            </html>
        `;

        // 4. Abrir ventana
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printHtml);
            printWindow.document.close(); // Necesario para que terminen de cargar los recursos
        } else {
            if (window.showAlert) showAlert('El navegador bloqueó la ventana emergente.', 'warning');
        }

    } catch (err) {
        console.error('[DEBUG] Error al imprimir:', err);
        if (window.showAlert) showAlert('Error generando impresión: ' + err.message, 'error');
    } finally {
        if (btn) btn.innerHTML = '<i class="fas fa-print"></i>';
    }
}

function resetPreviewPosition() {
    const content = document.querySelector('#listadoPreviewModal .preview-listado-content');
    if (content) {
        content.style.position = 'relative';
        content.style.left = '0';
        content.style.top = '0';
        content.style.margin = '0';
        content.style.transform = 'none';
    }
}

function makePreviewDraggable() {
    const modal = document.getElementById('listadoPreviewModal');
    const header = document.getElementById('previewHeader');
    const content = modal.querySelector('.preview-listado-content');
    
    if (!header || !content) return;

    let isDragging = false;
    let offsetX, offsetY;

    header.onmousedown = function(e) {
        if (e.target.closest('.header-actions')) return;
        
        isDragging = true;
        const rect = content.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        content.style.position = 'fixed';
        content.style.margin = '0';
        content.style.left = rect.left + 'px';
        content.style.top = rect.top + 'px';
        content.style.transform = 'none';

        document.onmousemove = function(e) {
            if (!isDragging) return;
            let left = e.clientX - offsetX;
            let top = e.clientY - offsetY;
            
            left = Math.max(0, Math.min(left, window.innerWidth - content.offsetWidth));
            top = Math.max(0, Math.min(top, window.innerHeight - content.offsetHeight));
            
            content.style.left = left + 'px';
            content.style.top = top + 'px';
        };

        document.onmouseup = function() {
            isDragging = false;
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };
}




function initAccordion() {
    const headers = document.querySelectorAll('.accordion-header');
    
    headers.forEach(header => {
        header.addEventListener('click', function(e) {
            const content = this.nextElementSibling;
            const arrow = this.querySelector('.arrow');
            
            if (!content) return;

            // Cerrar todas las otras secciones
            document.querySelectorAll('.accordion-content').forEach(item => {
                if (item !== content) {
                    item.classList.remove('show');
                    item.previousElementSibling.classList.remove('active');
                    const otherArrow = item.previousElementSibling.querySelector('.arrow');
                    if (otherArrow) {
                        otherArrow.classList.remove('fa-chevron-down');
                        otherArrow.classList.add('fa-chevron-right');
                    }
                }
            });
            
            // Toggle (alternar) la sección actual
            content.classList.toggle('show');
            this.classList.toggle('active');
            
            if (arrow) {
                if (content.classList.contains('show')) {
                    arrow.classList.remove('fa-chevron-right');
                    arrow.classList.add('fa-chevron-down');
                } else {
                    arrow.classList.remove('fa-chevron-down');
                    arrow.classList.add('fa-chevron-right');
                }
            }
        });
    });
}

/**
 * Formats a date string or object to dd/mm/yyyy
 * @param {string|Date} dateVal 
 * @returns {string} Formatted date
 */
function formatDate(dateVal) {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}/${month}/${year}`;
}

function updateDateTime() {
    const now = new Date();
    document.getElementById('current-date').textContent = formatDate(now);
    document.getElementById('current-time').textContent = now.toLocaleTimeString('es-ES');
}

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        // Update basic counts
        if (document.getElementById('total-clientes')) document.getElementById('total-clientes').textContent = data.totalClientes || 0;
        if (document.getElementById('count-soporte')) document.getElementById('count-soporte').textContent = data.ticketsAbiertos || 0;
        if (document.getElementById('count-plataformas')) document.getElementById('count-plataformas').textContent = data.plataformasOperativas || 0;
        
        // Update charts if they exist on page
        if (typeof Chart !== 'undefined' && document.getElementById('chartClientes')) {
            renderCharts(data);
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

let charts = {}; // Store chart instances to destroy them before re-rendering

function renderCharts(data) {
    const ctxClientes = document.getElementById('chartClientes').getContext('2d');
    const ctxSoporte = document.getElementById('chartSoporte').getContext('2d');
    const ctxPlataformas = document.getElementById('chartPlataformas').getContext('2d');

    // Destroy existing charts if any
    if (charts.clientes) charts.clientes.destroy();
    if (charts.soporte) charts.soporte.destroy();
    if (charts.plataformas) charts.plataformas.destroy();

    const chartConfig = (labels, values, colors) => ({
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 11 }
                    }
                }
            },
            cutout: '70%'
        }
    });

    // 1. Clientes por Tipo
    charts.clientes = new Chart(ctxClientes, chartConfig(
        data.clientesPorTipo.map(c => c.label || 'S/N'),
        data.clientesPorTipo.map(c => c.value),
        ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
    ));

    // 2. Soporte por Estado
    charts.soporte = new Chart(ctxSoporte, chartConfig(
        data.soportePorEstado.map(s => s.label),
        data.soportePorEstado.map(s => s.value),
        ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'] // Red for Abierto, Orange for Proceso, Green for Cerrado
    ));

    // 3. Aplicaciones por Plataforma
    charts.plataformas = new Chart(ctxPlataformas, chartConfig(
        data.aplicacionesPorPlataforma.map(p => p.label || 'Desconocida'),
        data.aplicacionesPorPlataforma.map(p => p.value),
        ['#9b86d9', '#f29c9c', '#81ecec', '#fab1a0', '#00cec9']
    ));
}

function refreshStats() {
    const icon = event.target;
    icon.style.animation = 'spin 1s linear';
    loadStats();
    setTimeout(() => {
        icon.style.animation = '';
    }, 1000);
}

async function loadData(table) {
    if (table === 'clientes') {
        loadClientesView();
        return;
    }
    
    currentTable = table;
    const dashboard = document.getElementById('dashboard');
    const dataView = document.getElementById('data-view');
    const tableContainer = document.getElementById('table-container');
    const viewTitle = document.getElementById('view-title');

    if (dashboard) dashboard.style.display = 'none';
    if (dataView) dataView.style.display = 'block';
    if (viewTitle) viewTitle.textContent = table.charAt(0).toUpperCase() + table.slice(1).toUpperCase();
    if (tableContainer) tableContainer.innerHTML = '<p>Cargando datos...</p>';

    try {
        const response = await fetch(`/api/${table}`);
        currentData = await response.json();

        if (currentData.length === 0) {
            tableContainer.innerHTML = '<p>No hay datos disponibles.</p>';
            return;
        }

        let html = '<table><thead><tr><th style="width: 50px;"><input type="checkbox" id="selectAll"></th>';
        const columns = Object.keys(currentData[0]);
        columns.forEach(key => {
            html += `<th>${key}</th>`;
        });
        html += '<th style="width: 120px; text-align: right;">Acciones</th></tr></thead><tbody>';

        currentData.forEach((row, index) => {
            const idValue = row.ID || row.IDAcceso || row.IDRemitentes || row.IDEquipos || row.IDDocumentacion || row.IDNotasUsuarios;
            html += `<tr data-id="${idValue}">`;
            html += '<td><input type="checkbox" class="row-checkbox" onchange="updateBulkDeleteButton()"></td>';
            columns.forEach(col => {
                let cellValue = row[col] === null ? '' : row[col];
                // Probabilistic date detection for generic tables (YYYY-MM-DD...)
                if (typeof cellValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(cellValue)) {
                    cellValue = formatDate(cellValue);
                }
                html += `<td>${cellValue}</td>`;
            });
            html += `<td class="table-actions">
                <i class="fas fa-edit btn-edit" onclick="editRecord(${index})" title="Editar"></i>
                <i class="fas fa-trash btn-delete" onclick="deleteRecord('${idValue}')" title="Eliminar"></i>
            </td></tr>`;
        });
        html += '</tbody></table>';
        tableContainer.innerHTML = html;
    } catch (error) {
        tableContainer.innerHTML = '<p style="color:red">Error al conectar con la base de datos.</p>';
        console.error('Error:', error);
    }
}

async function openModal(index = null) {
    // Redirect to specific modals if they exist
    if (currentTable === 'clientes') {
        openClientesModal(index);
        return;
    }

    const modal = document.getElementById('modal');
    const formFields = document.getElementById('form-fields');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('data-form');
    
    modal.style.display = 'block';
    formFields.innerHTML = '<p>Cargando formulario...</p>';
    form.reset();
    form.dataset.editId = '';

    let schema = [];
    try {
        const response = await fetch(`/api/schema/${currentTable}`);
        if (response.ok) {
            schema = await response.json();
        } else {
            console.error('Error fetching schema');
        }
    } catch (e) {
        console.error(e);
    }

    formFields.innerHTML = ''; // Clear loading message

    if (index !== null && currentData[index]) {
        const row = currentData[index];
        modalTitle.textContent = 'Editar Registro';
        form.dataset.editId = row.ID || row.IDAcceso;
        
        // Use schema to ensure we order fields correctly and handle types if needed, 
        // OR fall back to row keys if schema failed.
        const keys = schema.length > 0 ? schema.map(f => f.Field) : Object.keys(row);

        keys.forEach(key => {
            if (key === 'ID' || key === 'IDAcceso' || key === 'IDRemitentes' || key === 'IDEquipos' || key === 'IDDocumentacion' || key === 'IDNotasUsuarios') return; // Skip Primary Keys
            
            const val = row[key];
            const value = val === null ? '' : val;
            
            // Check type from schema
            const fieldDef = schema.find(f => f.Field === key);
            let inputType = 'text';
            if (fieldDef) {
                if (fieldDef.Type.includes('int') || fieldDef.Type.includes('decimal')) inputType = 'number';
                if (fieldDef.Type.includes('date')) inputType = 'date';
                if (fieldDef.Type.includes('text') || fieldDef.Type.includes('blob')) inputType = 'textarea';
            }

            if (inputType === 'textarea') {
                 formFields.innerHTML += `
                    <div class="form-group">
                        <label for="${key}">${key}</label>
                        <textarea id="${key}" name="${key}" rows="3">${value}</textarea>
                    </div>`;
            } else {
                formFields.innerHTML += `
                    <div class="form-group">
                        <label for="${key}">${key}</label>
                        <input type="${inputType}" id="${key}" name="${key}" value="${value}">
                    </div>`;
            }
        });
    } else {
        modalTitle.textContent = 'Añadir Nuevo Registro';
        
        if (schema.length > 0) {
            schema.forEach(field => {
                 const key = field.Field;
                 if (field.Key === 'PRI' || field.Extra === 'auto_increment') return; // Skip PKs

                 let inputType = 'text';
                 if (field.Type.includes('int') || field.Type.includes('decimal')) inputType = 'number';
                 if (field.Type.includes('date')) inputType = 'date';
                 if (field.Type.includes('text') || field.Type.includes('blob')) inputType = 'textarea';

                 if (inputType === 'textarea') {
                     formFields.innerHTML += `
                        <div class="form-group">
                            <label for="${key}">${key}</label>
                            <textarea id="${key}" name="${key}" rows="3"></textarea>
                        </div>`;
                } else {
                    formFields.innerHTML += `
                        <div class="form-group">
                            <label for="${key}">${key}</label>
                            <input type="${inputType}" id="${key}" name="${key}" value="">
                        </div>`;
                }
            });
        } else if (currentData.length > 0) {
             // Fallback to existing data if schema fails but data exists
            const sampleRow = currentData[0];
            Object.keys(sampleRow).forEach(key => {
                if (key === 'ID' || key === 'IDAcceso') return;
                formFields.innerHTML += `
                    <div class="form-group">
                        <label for="${key}">${key}</label>
                        <input type="text" id="${key}" name="${key}" value="">
                    </div>`;
            });
        } else {
            formFields.innerHTML = '<p>No se puede generar el formulario: Tabla vacía y sin esquema.</p>';
        }
    }
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function editRecord(index) {
    openModal(index);
}

async function deleteRecord(id) {
    if (!await showConfirm('¿Estás seguro de que deseas eliminar este registro?')) return;
    try {
        const response = await fetch(`/api/${currentTable}/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showAlert('Registro eliminado correctamente', 'success');
            loadData(currentTable);
        } else if (response.status === 409) {
            const data = await response.json();
            showAlert(data.error || 'No se puede eliminar porque el registro tiene relaciones activas.', 'warning');
        } else {
             showAlert('Error al eliminar', 'error');
        }
    } catch (error) {
        showAlert('Error al eliminar', 'error');
    }
}

function setupFormSubmit() {
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('data-form');
        if (form) {
            form.addEventListener('submit', submitForm);
        }
    });
    
    const form = document.getElementById('data-form');
    if (form) {
        form.addEventListener('submit', submitForm);
    }
}

async function submitForm(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const editId = form.dataset.editId;
    
    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `/api/${currentTable}/${editId}` : `/api/${currentTable}`;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            alert(editId ? 'Registro actualizado' : 'Registro creado');
            closeModal();
            loadData(currentTable);
        }
    } catch (error) {
        alert('Error al guardar: ' + error.message);
    }
}

function setupModalClose() {
    const modal = document.getElementById('modal');
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function showDashboard() {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) {
        window.location.href = '/dashboard.html';
        return;
    }
    dashboard.style.display = 'grid';
    if (document.getElementById('data-view')) document.getElementById('data-view').style.display = 'none';
    if (document.getElementById('clientes-view')) document.getElementById('clientes-view').style.display = 'none';
}

let dashboardClientesData = [];

async function loadClientesView() {
    const dashboard = document.getElementById('dashboard');
    const clientesView = document.getElementById('clientes-view');
    
    if (dashboard) dashboard.style.display = 'none';
    clientesView.style.display = 'block';
    
    try {
        const response = await fetch('/api/clientes');
        dashboardClientesData = await response.json();
        renderClientesTable(dashboardClientesData);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('clientes-table-container').innerHTML = '<p style="color:red">Error al cargar clientes</p>';
    }
}

function renderClientesTable(data) {
    const container = document.getElementById('clientes-table-container');
    
    if (data.length === 0) {
        container.innerHTML = '<p>No hay clientes registrados.</p>';
        return;
    }
    
    let html = `<table>
        <thead>
            <tr>
                <th style="width: 50px;"><input type="checkbox" id="selectAll"></th>
                <th>Código</th>
                <th>Nombre Comercial</th>
                <th>Nombre Fiscal</th>
                <th>Contacto</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th style="width: 120px; text-align: right;">Acciones</th>
            </tr>
        </thead>
        <tbody>`;
    
    data.forEach((cliente, index) => {
        html += `<tr data-id="${cliente.ID}">
            <td><input type="checkbox" class="row-checkbox" onchange="updateBulkDeleteButton()"></td>
            <td>${cliente.Codigo || ''}</td>
            <td>${cliente.NombreComercial || ''}</td>
            <td>${cliente.NombreFiscal || ''}</td>
            <td>${cliente.NombreContacto || ''}</td>
            <td>${cliente.Email || ''}</td>
            <td>${cliente.Telefono1 || ''}</td>
            <td class="table-actions">
                <i class="fas fa-edit btn-edit" onclick="editCliente(${index})" title="Editar"></i>
                <i class="fas fa-trash btn-delete" onclick="deleteCliente(${cliente.ID})" title="Eliminar"></i>
            </td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function filterClientes() {
    const search = document.getElementById('search-clientes').value.toLowerCase();
    const filtered = dashboardClientesData.filter(c => 
        (c.Codigo && c.Codigo.toLowerCase().includes(search)) ||
        (c.NombreComercial && c.NombreComercial.toLowerCase().includes(search)) ||
        (c.NIF && c.NIF.toLowerCase().includes(search))
    );
    renderClientesTable(filtered);
}

async function openClientesModal(index = null) {
    const modal = document.getElementById('modal');
    const formFields = document.getElementById('form-fields');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('data-form');
    
    modal.style.display = 'block';
    formFields.innerHTML = '<p>Cargando datos...</p>'; // Show loading state
    form.reset();
    form.dataset.editId = '';
    currentTable = 'clientes';

    // Fetch auxiliary data for dropdowns
    let poblaciones = [];
    let tiposClientes = [];
    try {
        const [pobRes, tipoRes] = await Promise.all([
            fetch('/api/poblaciones'),
            fetch('/api/tiposclientes')
        ]);
        if (pobRes.ok) {
            poblaciones = await pobRes.json();
            alert('DEBUG: Poblaciones descargadas: ' + poblaciones.length + '\\nEjemplo: ' + JSON.stringify(poblaciones[0])); 
        } else {
             alert('Error fetching poblaciones: ' + pobRes.status);
        }
        if (tipoRes.ok) {
            tiposClientes = await tipoRes.json();
        }
    } catch (error) {
        console.error('Error loading auxiliary data:', error);
    }
    
    // Clear loading message
    formFields.innerHTML = '';
    
    // Define fields (shared for edit/new to ensure consistency)
    const campos = [
        { name: 'Codigo', label: 'Código', type: 'text' },
        { name: 'NombreComercial', label: 'Nombre Comercial', type: 'text' },
        { name: 'NombreFiscal', label: 'Nombre Fiscal', type: 'text' },
        { name: 'TipoCliente', label: 'Tipo de Cliente', type: 'select', options: tiposClientes },
        { name: 'NIF', label: 'NIF', type: 'text' },
        { name: 'NombreContacto', label: 'Contacto', type: 'text' },
        { name: 'Email', label: 'Email', type: 'email' },
        { name: 'Telefono1', label: 'Teléfono 1', type: 'text' },
        { name: 'Telefono2', label: 'Teléfono 2', type: 'text' },
        { name: 'TelefonoMovil', label: 'Teléfono Móvil', type: 'text' },
        { name: 'Fax', label: 'Fax', type: 'text' },
        { name: 'Direccion', label: 'Dirección', type: 'text' },
        { name: 'CodigoPostal', label: 'Código Postal', type: 'text' },
        { name: 'Poblacion', label: 'Población', type: 'select', options: poblaciones },
        { name: 'Provincia', label: 'Provincia', type: 'text' },
        { name: 'Observaciones', label: 'Observaciones', type: 'textarea' }
    ];

    let cliente = {};
    if (index !== null && dashboardClientesData[index]) {
        cliente = dashboardClientesData[index];
        modalTitle.textContent = 'Editar Cliente';
        form.dataset.editId = cliente.ID;
    } else {
        modalTitle.textContent = 'Nuevo Cliente';
    }

    // Render Fields
    campos.forEach(campo => {
        const value = cliente[campo.name] === null || cliente[campo.name] === undefined ? '' : cliente[campo.name];
        
        let contextHTML = '';
        
        if (campo.type === 'textarea') {
            contextHTML = `
                <div class="form-group">
                    <label for="${campo.name}">${campo.label}</label>
                    <textarea id="${campo.name}" name="${campo.name}" rows="3">${value}</textarea>
                </div>`;
        } else if (campo.type === 'select') {
            let optionsHTML = `<option value="">Seleccionar...</option>`;
            if (campo.options && Array.isArray(campo.options)) {
                campo.options.forEach(opt => {
                    const selected = (opt.ID == value) ? 'selected' : ''; // Loose comparison for string/int IDs
                    optionsHTML += `<option value="${opt.ID}" ${selected}>${opt.Nombre}</option>`;
                });
            }
            contextHTML = `
                <div class="form-group">
                    <label for="${campo.name}">${campo.label}</label>
                    <select id="${campo.name}" name="${campo.name}">
                        ${optionsHTML}
                    </select>
                </div>`;
        } else {
            contextHTML = `
                <div class="form-group">
                    <label for="${campo.name}">${campo.label}</label>
                    <input type="${campo.type}" id="${campo.name}" name="${campo.name}" value="${value}">
                </div>`;
        }
        formFields.innerHTML += contextHTML;
    });
}

async function deleteCliente(id) {
    if (!await showConfirm('¿Estás seguro de que deseas eliminar este cliente?')) return;
    
    try {
        const response = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showAlert('Cliente eliminado correctamente', 'success');
            loadClientesView();
        } else if (response.status === 409) {
            const data = await response.json();
            showAlert(data.error || 'No se puede eliminar el cliente porque tiene relaciones activas.', 'warning');
        } else {
            showAlert('Error al eliminar', 'error');
        }
    } catch (error) {
        showAlert('Error al eliminar', 'error');
    }
}

function editCliente(index) {
    openClientesModal(index);
}

// --- GESTIÓN DE BORRADO MASIVO (GENÉRICO) ---

function setupBulkDelete() {
    const selectAll = document.getElementById('selectAll');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

    if (selectAll) {
        selectAll.addEventListener('change', () => {
            const checkboxes = document.querySelectorAll('.row-checkbox');
            checkboxes.forEach(cb => cb.checked = selectAll.checked);
            updateBulkDeleteButton();
        });
    }

    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', deleteSelected);
    }
}

function updateBulkDeleteButton() {
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (!bulkDeleteBtn) return;

    const selectedBoxes = document.querySelectorAll('.row-checkbox:checked');
    const selectedCount = selectedBoxes.length;
    
    bulkDeleteBtn.style.display = selectedCount > 0 ? 'inline-block' : 'none';
    bulkDeleteBtn.innerHTML = `<i class="fas fa-trash"></i> Eliminar (${selectedCount})`;

    // Actualizar estado del selectAll
    const selectAll = document.getElementById('selectAll');
    const totalCheckboxes = document.querySelectorAll('.row-checkbox').length;
    if (selectAll && totalCheckboxes > 0) {
        selectAll.checked = selectedCount === totalCheckboxes;
        selectAll.indeterminate = selectedCount > 0 && selectedCount < totalCheckboxes;
    }
}

async function deleteSelected() {
    if (!currentTable) return;
    
    const selectedBoxes = document.querySelectorAll('.row-checkbox:checked');
    const ids = Array.from(selectedBoxes).map(cb => cb.closest('tr').dataset.id);

    if (ids.length === 0) return;

    if (!await showConfirm(`¿Estás seguro de que deseas eliminar ${ids.length} registros permanentemente de la tabla ${currentTable}?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/${currentTable}/bulk-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });

        const data = await response.json();

        if (response.ok) {
            // Desmarcar selectAll y ocultar botón
            const selectAll = document.getElementById('selectAll');
            if (selectAll) selectAll.checked = false;
            updateBulkDeleteButton();
            
            showAlert(`Se han eliminado ${data.affectedRows} registros.`, 'success');
            
            // Recargar datos
            if (currentTable === 'clientes' && typeof loadClientesView === 'function') {
                loadClientesView();
            } else {
                loadData(currentTable);
            }
        } else if (response.status === 409) {
            showAlert(data.error || 'No se puede eliminar porque el registro tiene relaciones activas.', 'warning');
        } else {
            showAlert('Error al eliminar registros: ' + (data.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación de eliminación masiva', 'error');
    }
}

// --- GENERIC MODAL DRAG LOGIC ---
function makeElementDraggable(element, handle) {
    if (!element || !handle) return;
    
    let isDragging = false;
    let startX, startY;
    
    handle.style.cursor = 'grab';
    handle.style.userSelect = 'none'; 
    
    handle.addEventListener('mousedown', (e) => {
        if (e.target.closest('.close') || e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        
        isDragging = true;
        handle.style.cursor = 'grabbing';
        
        // Disable blur on parent modal for performance/visibility
        const modalParent = element.closest('.modal');
        if (modalParent) modalParent.style.backdropFilter = 'none';

        const rect = element.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        
        element.style.transform = 'none';
        element.style.margin = '0';
        element.style.left = rect.left + 'px';
        element.style.top = rect.top + 'px';
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
    
    function onMouseMove(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        let newLeft = parseFloat(element.style.left) + dx;
        let newTop = parseFloat(element.style.top) + dy;
        
        // Boundaries
        const header = document.querySelector('.top-bar') || document.querySelector('header');
        const headerHeight = header ? header.offsetHeight : 0;
        
        const maxLeft = window.innerWidth - element.offsetWidth;
        const maxTop = window.innerHeight - element.offsetHeight;
        
        // Constrain (Respect header height for top boundary)
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(headerHeight, Math.min(newTop, maxTop));
        
        element.style.left = newLeft + 'px';
        element.style.top = newTop + 'px';
        
        startX = e.clientX;
        startY = e.clientY;
    }
    
    function onMouseUp() {
        isDragging = false;
        handle.style.cursor = 'grab';
        
        // Restore blur
        const modalParent = element.closest('.modal');
        if (modalParent) modalParent.style.backdropFilter = '';

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const genericModals = document.querySelectorAll('.modal');
        genericModals.forEach(modal => {
            if (modal.classList.contains('modal-large') || modal.classList.contains('no-auto-drag')) return;
            const content = modal.querySelector('.modal-content');
            if (content) {
                const header = content.querySelector('h2') || content.querySelector('.modal-header');
                if (header) makeElementDraggable(content, header);
            }
        });
    }, 500);
});
