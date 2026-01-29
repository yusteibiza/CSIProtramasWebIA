// Gestión de Clientes - Página Independiente
let clientesData = [];
let currentVisibleData = []; // To track filtered data for exports
let editingClienteId = null;
let isModalEditing = false;
let tiposClientesOptions = [];
let poblacionesOptions = [];
let aplicacionesOptions = [];
let plataformasOptions = [];
let desarrollosOptions = [];
let clientApplications = []; // Current client's apps
let tiposConexionesOptions = [];
let clientConnections = []; // Current client's connections
let allClientApps = []; // Global map for filtering


// Inicializar la página
// Inicializar la página
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar datos maestros críticos PRIMERO
    await Promise.all([
        loadTiposClientes(),
        loadPoblaciones(),
        loadExtraMasterData() // Also load these early just in case
    ]);

    // 2. Cargar clientes (renderizará la tabla usando los datos maestros ya cargados)
    await loadClientesData();

    setupEventListeners();
    initColumnToggle();
    initContextMenu();
    initModalTabs();
    initModalToolbar();
    makeModalDraggable();
    initFilters();

    
    document.getElementById('addProgramRowBtn').addEventListener('click', addProgramRow);
    document.getElementById('addConnectionRowBtn').addEventListener('click', addConnectionRow);
    document.getElementById('addEquipoBtn').addEventListener('click', addEquipoCard);
    
    // Documentación
    document.getElementById('docFileInput').addEventListener('change', uploadDocument);
    document.getElementById('uploadDocBtn').addEventListener('click', () => {
        if (!editingClienteId) {
             showAlert('Debe guardar el cliente antes de subir documentación.', 'warning');
             return;
        }
        document.getElementById('docFileInput').click();
    });

});


// Índice del cliente actual en el modal (para navegación)
// Índice del cliente actual en el modal (para navegación)
let currentModalIndex = -1;
let lastViewedIndex = -1; // Para recordar dónde estábamos al crear nuevo

function initModalTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(target).classList.add('active');
            
            refreshActiveTabData();
        });
    });
}

function initModalToolbar() {
    // Navegación
    document.getElementById('modalFirstBtn').addEventListener('click', () => navigateModal(0));
    document.getElementById('modalLastBtn').addEventListener('click', () => navigateModal(clientesData.length - 1));
    document.getElementById('modalPrevBtn').addEventListener('click', () => navigateModal(currentModalIndex - 1));
    document.getElementById('modalNextBtn').addEventListener('click', () => navigateModal(currentModalIndex + 1));

    // Acciones
    document.getElementById('modalAddBtn').addEventListener('click', openClienteModal);
    document.getElementById('modalEditBtn').addEventListener('click', () => setModalReadOnly(false));
    document.getElementById('modalDeleteBtn').addEventListener('click', () => {
        if (currentModalIndex !== -1) deleteCliente(currentModalIndex);
    });
    document.getElementById('modalSaveBtn').addEventListener('click', () => {
        document.getElementById('clienteForm').requestSubmit();
    });
    document.getElementById('modalCancelBtn').addEventListener('click', () => {
        if (editingClienteId) {
            // Editing existing client: Revert changes
            populateForm(clientesData[currentModalIndex]);
            setModalReadOnly(true);
        } else {
            // Cancelar creación: Volver a donde estábamos
            if (lastViewedIndex !== -1 && clientesData[lastViewedIndex]) {
                navigateModal(lastViewedIndex);
            } else {
                closeModal();
            }
        }
    });
}

function navigateModal(newIndex) {
    if (newIndex < 0 || newIndex >= clientesData.length) return;
    currentModalIndex = newIndex;
    const cliente = clientesData[newIndex];
    editingClienteId = cliente.ID;
    
    // Update header name
    document.getElementById('modalClientName').textContent = `${cliente.Codigo || ''} - ${cliente.NombreComercial || ''}`;
    
    populateForm(cliente);
    setModalReadOnly(true);
    
    // Refresh the data of the currently active tab
    refreshActiveTabData();
    
    updateModalNavigationState();
}

function updateModalNavigationState() {
    const total = clientesData.length;
    const index = currentModalIndex;
    
    document.getElementById('modalFirstBtn').disabled = index <= 0;
    document.getElementById('modalPrevBtn').disabled = index <= 0;
    document.getElementById('modalNextBtn').disabled = index >= total - 1;
    document.getElementById('modalLastBtn').disabled = index >= total - 1;
}

function refreshActiveTabData() {
    if (!editingClienteId) return;
    
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    
    switch (activeTab) {
        case 'tab-programas':
            loadClientApplications(editingClienteId);
            break;
        case 'tab-conexiones':
            loadClientConnections(editingClienteId);
            break;
        case 'tab-equipos':
            loadClientEquipos(editingClienteId);
            break;
        case 'tab-documentacion':
            loadClientDocs(editingClienteId);
            break;
    }
}

function makeModalDraggable() {
    const modal = document.getElementById('clienteModal');
    const header = modal.querySelector('.modal-header-new');
    const content = modal.querySelector('.modal-content-wrapper');

    // Listener for Resize (since resize handle is part of content)
    content.addEventListener('mouseup', () => {
        // We call saveModalLayout() to catch resizing end
        setTimeout(saveModalLayout, 100); 
    });

    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener('mousedown', (e) => {
        // Only drag if left mouse button is pressed and not on close button
        if (e.button !== 0 || e.target.closest('.close-btn-red')) return;

        isDragging = true;
        
        // Remove backdrop blur during drag
        modal.style.backdropFilter = 'none';
        
        // Get initial mouse position relative to the modal
        const rect = content.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        content.style.position = 'absolute';
        content.style.margin = '0'; // Remove auto margin to allow absolute positioning
        
        // Initial positioning
        content.style.left = rect.left + 'px';
        content.style.top = rect.top + 'px';
        content.style.transform = 'none'; // Disable CSS centering transform to prevent jump

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        header.style.cursor = 'grabbing';
    });

    function onMouseMove(e) {
        if (!isDragging) return;

        let left = e.clientX - offsetX;
        let top = e.clientY - offsetY;

        // Keep modal within viewport (optional but recommended)
        const rect = content.getBoundingClientRect();
        const minLeft = 0;
        const maxLeft = window.innerWidth - rect.width;
        const minTop = 0;
        const maxTop = window.innerHeight - rect.height;

        left = Math.max(minLeft, Math.min(left, maxLeft));
        top = Math.max(minTop, Math.min(top, maxTop));

        content.style.left = left + 'px';
        content.style.top = top + 'px';
    }

    function onMouseUp() {
        isDragging = false;
        // Restore backdrop blur
        modal.style.backdropFilter = '';
        
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        header.style.cursor = 'grab';
        
        // Save new layout
        saveModalLayout();
    }
}

// Save modal layout to backend
async function saveModalLayout() {
    // Use specific selector matching applyPersistentModalLayout
    const content = document.querySelector('#clienteModal .modal-content-wrapper');
    if (!content) return;

    // Use getBoundingClientRect to always get the current computed pixel position,
    // regardless of whether it was set via inline styles (drag) or CSS class (initial center).
    const rect = content.getBoundingClientRect();

    // CRITICAL FIX: If modal is hidden (e.g. closed), rect will be 0. Do NOT save zeros.
    if (rect.width === 0 && rect.height === 0) return;
    
    // We must subtract any body styling if needed, but usually absolute within body is clientRect + scroll
    // If the modal is fixed, clientRect is fine. If absolute, we need scroll.
    // The CSS says .modal-large { position: fixed ... } ? No, checking CSS...
    // The previous code set style.position = 'absolute'.
    // If it's absolute, we should add window.scrollX/Y to rect.left/top if we want page-relative.
    // However, if the parent (.modal-large) is fixed (overlay), then absolute content is relative to viewport?
    // Let's assume viewport relative for now as rect.left/top are viewport relative.
    
    const layout = {
        left: rect.left + 'px',
        top: rect.top + 'px',
        width: rect.width + 'px',
        height: rect.height + 'px'
    };
    
    try {
        await fetch('/api/config/modal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(layout)
        });
    } catch (e) {
        console.error("Error saving layout:", e);
    }
}

// Restore default layout
async function restoreModalLayout() {
    try {
        await fetch('/api/config/modal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(null) // Send null to delete
        });
        
        // Apply default styles immediately
        const content = document.querySelector('.modal-large .modal-content-wrapper');
        if (content) {
            content.style.position = 'absolute';
            content.style.top = '50%';
            content.style.left = '50%';
            content.style.transform = 'translate(-50%, -50%)';
            content.style.width = '95%';
            content.style.height = '90vh'; // Match current default
            content.style.margin = '0';
        }
    } catch (e) {
        console.error("Error restoring layout:", e);
    }
}


// Cargar maestros adicionales
async function loadExtraMasterData() {
    try {
        const [apps, plats, desas, tcons] = await Promise.all([
            fetch('/api/aplicaciones').then(r => r.json()),
            fetch('/api/plataformas').then(r => r.json()),
            fetch('/api/desarrollos').then(r => r.json()),
            fetch('/api/tiposconexiones').then(r => r.json())
        ]);
        aplicacionesOptions = apps;
        plataformasOptions = plats;
        desarrollosOptions = desas;
        tiposConexionesOptions = tcons;
    } catch (error) {
        console.error('Error cargando maestros:', error);
    }
}

// Cargar aplicaciones de un cliente
async function loadClientApplications(clientId) {
    try {
        const response = await fetch(`/api/aplicacioncliente/cliente/${clientId}`);
        clientApplications = await response.json();
        renderProgramsTable();
    } catch (error) {
        console.error('Error al cargar aplicaciones del cliente:', error);
    }
}

function renderProgramsTable() {
    const tbody = document.getElementById('programasTableBody');
    tbody.innerHTML = '';
    
    clientApplications.forEach((app, index) => {
        const row = document.createElement('tr');
        // Helper to safely check boolean-ish values stored as varchar
        const isTrue = (val) => val == 1 || val == '1' || val === true || val === 'true';

        row.innerHTML = `
            <td>${getOptionName(aplicacionesOptions, app.IDAplicacion)}</td>
            <td>${getOptionName(plataformasOptions, app.IDPlataforma)}</td>
            <td>${app.Licencias || 0}</td>
            <td>${app.Version || ''}</td>
            <td class="checkbox-center"><input type="checkbox" ${isTrue(app.VersionEspecial) ? 'checked' : ''} disabled></td>
            <td>${getOptionName(desarrollosOptions, app.IDDesarrollo)}</td>
            <td class="checkbox-center"><input type="checkbox" ${isTrue(app.Contrato) ? 'checked' : ''} disabled></td>
            <td title="${app.Notas || ''}">${app.Notas || ''}</td>
            <td>
                <button type="button" class="btn-icon btn-edit" onclick="editClientProgram(${index})" title="Editar"><i class="fas fa-edit"></i></button>
                <button type="button" class="btn-icon btn-delete" onclick="deleteClientProgram(${app.ID})" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getOptionName(options, id) {
    const obj = options.find(o => o.ID === id);
    return obj ? obj.Nombre : '';
}

function addProgramRow() {
    if (!editingClienteId) {
        showAlert('Guarde el cliente antes de añadir programas.', 'warning');
        return;
    }
    
    const tbody = document.getElementById('programasTableBody');
    const row = document.createElement('tr');
    row.classList.add('editing-row');
    
    row.innerHTML = `
        <td>
            <select class="p-app-select">
                <option value="">Seleccionar...</option>
                ${aplicacionesOptions.map(a => `<option value="${a.ID}">${a.Nombre}</option>`).join('')}
            </select>
        </td>
        <td>
            <select class="p-plat-select">
                <option value="">Seleccionar...</option>
                ${plataformasOptions.map(p => `<option value="${p.ID}">${p.Nombre}</option>`).join('')}
            </select>
        </td>
        <td><input type="number" class="p-lic-input" value="1" style="width: 60px;"></td>
        <td><input type="text" class="p-ver-input" placeholder="Versión"></td>
        <td class="checkbox-center"><input type="checkbox" class="p-ve-input"></td>
        <td>
            <select class="p-des-select">
                <option value="">Seleccionar...</option>
                ${desarrollosOptions.map(d => `<option value="${d.ID}">${d.Nombre}</option>`).join('')}
            </select>
        </td>
        <td class="checkbox-center"><input type="checkbox" class="p-con-input"></td>
        <td><input type="text" class="p-not-input" placeholder="Notas"></td>
        <td>
            <button type="button" class="btn-icon btn-save" onclick="saveNewProgram(this)" title="Guardar"><i class="fas fa-save"></i></button>
            <button type="button" class="btn-icon btn-cancel" onclick="renderProgramsTable()" title="Cancelar"><i class="fas fa-times"></i></button>
        </td>
    `;
    tbody.insertBefore(row, tbody.firstChild);
}

async function saveNewProgram(btn) {
    const row = btn.closest('tr');
    const appID = row.querySelector('.p-app-select').value;
    
    if (!appID) {
        showAlert('Debe seleccionar una aplicación.', 'warning');
        return;
    }
    
    // Validar duplicados (solo para nuevos)
    // Cuando editamos, el duplicado somos nosotros mismos, así que esta validación solo aplica a INSERT
    // Pero esta función es saveNewProgram, así que asumimos INSERT
    const isDuplicate = clientApplications.some(a => a.IDAplicacion == appID);
    if (isDuplicate) {
        showAlert('Este cliente ya tiene asignada esta aplicación.', 'warning');
        return;
    }
    
    const programData = {
        IDCliente: editingClienteId,
        IDAplicacion: appID,
        IDPlataforma: row.querySelector('.p-plat-select').value || null,
        Licencias: row.querySelector('.p-lic-input').value || 1,
        Licencias: row.querySelector('.p-lic-input').value || 1,
        Version: row.querySelector('.p-ver-input').value || '',
        VersionEspecial: row.querySelector('.p-ve-input').checked ? 1 : 0,
        IDDesarrollo: row.querySelector('.p-des-select').value || null,
        Contrato: row.querySelector('.p-con-input').checked ? 1 : 0,
        Notas: row.querySelector('.p-not-input').value || ''
    };
    
    try {
        const response = await fetch('/api/aplicacioncliente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(programData)
        });
        
        if (response.ok) {
            loadClientApplications(editingClienteId);
        } else {
            const err = await response.json();
            showAlert('Error al guardar programa: ' + (err.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al guardar programa:', error);
    }
}

function editClientProgram(index) {
    const app = clientApplications[index];
    const tbody = document.getElementById('programasTableBody');
    const row = tbody.children[index]; // Assuming 1:1 mapping if not filtered/sorted otherwise
    
    if (!row) return;

    // Helper safely check boolean-ish
    const isTrue = (val) => val == 1 || val == '1' || val === true || val === 'true';

    row.classList.add('editing-row');
    row.innerHTML = `
        <td>
            <select class="p-app-select" disabled>
                <option value="${app.IDAplicacion}">${getOptionName(aplicacionesOptions, app.IDAplicacion)}</option>
            </select>
        </td>
        <td>
            <select class="p-plat-select">
                <option value="">Seleccionar...</option>
                ${plataformasOptions.map(p => `<option value="${p.ID}" ${p.ID === app.IDPlataforma ? 'selected' : ''}>${p.Nombre}</option>`).join('')}
            </select>
        </td>
        <td><input type="number" class="p-lic-input" value="${app.Licencias || 1}" style="width: 60px;"></td>
        <td><input type="text" class="p-ver-input" value="${app.Version || ''}" placeholder="Versión"></td>
        <td class="checkbox-center"><input type="checkbox" class="p-ve-input" ${isTrue(app.VersionEspecial) ? 'checked' : ''}></td>
        <td>
            <select class="p-des-select">
                <option value="">Seleccionar...</option>
                ${desarrollosOptions.map(d => `<option value="${d.ID}" ${d.ID === app.IDDesarrollo ? 'selected' : ''}>${d.Nombre}</option>`).join('')}
            </select>
        </td>
        <td class="checkbox-center"><input type="checkbox" class="p-con-input" ${isTrue(app.Contrato) ? 'checked' : ''}></td>
        <td><input type="text" class="p-not-input" value="${app.Notas || ''}" placeholder="Notas"></td>
        <td>
            <button type="button" class="btn-icon btn-save" onclick="updateClientProgram(this, ${app.ID})" title="Actualizar"><i class="fas fa-save"></i></button>
            <button type="button" class="btn-icon btn-cancel" onclick="renderProgramsTable()" title="Cancelar"><i class="fas fa-times"></i></button>
        </td>
    `;
}

async function updateClientProgram(btn, id) {
    const row = btn.closest('tr');
    
    const programData = {
        // Obviamos IDCliente e IDAplicacion porque no se cambian al editar (generalmente)
        IDPlataforma: row.querySelector('.p-plat-select').value || null,
        Licencias: row.querySelector('.p-lic-input').value || 1,
        Version: row.querySelector('.p-ver-input').value || '',
        VersionEspecial: row.querySelector('.p-ve-input').checked ? 1 : 0,
        IDDesarrollo: row.querySelector('.p-des-select').value || null,
        Contrato: row.querySelector('.p-con-input').checked ? 1 : 0,
        Notas: row.querySelector('.p-not-input').value || ''
    };
    
    try {
        const response = await fetch(`/api/aplicacioncliente/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(programData)
        });
        
        if (response.ok) {
            showAlert('Programa actualizado', 'success');
            loadClientApplications(editingClienteId);
        } else {
            const err = await response.json();
            showAlert('Error al actualizar: ' + (err.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al actualizar programa:', error);
        showAlert('Error de conexión', 'error');
    }
}

async function deleteClientProgram(id) {
    if (!await showConfirm('¿Seguro que desea eliminar esta aplicación del cliente?')) return;
    
    try {
        const response = await fetch(`/api/aplicacioncliente/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadClientApplications(editingClienteId);
        } else {
            const err = await response.json().catch(() => ({}));
            showAlert(err.error || 'Error al eliminar.', 'error');
        }
    } catch (error) {
        console.error('Error al eliminar programa:', error);
    }
}

// --- CONEXIONES REMOTAS ---

async function loadClientConnections(clientId) {
    try {
        const response = await fetch(`/api/conexioncliente/cliente/${clientId}`);
        clientConnections = await response.json();
        renderConnectionsTable();
    } catch (error) {
        console.error('Error al cargar conexiones del cliente:', error);
    }
}

function renderConnectionsTable() {
    const tbody = document.getElementById('conexionesTableBody');
    tbody.innerHTML = '';
    
    clientConnections.forEach((con, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${getOptionName(tiposConexionesOptions, con.IDTipoConexion)}</td>
            <td>${con.Nombre || ''}</td>
            <td>${con.DireccionIP || ''}</td>
            <td>${con.Puerto || ''}</td>
            <td>${con.Usuario || ''}</td>
            <td>${con.Password || ''}</td>
            <td class="checkbox-center"><input type="checkbox" ${con.Activo ? 'checked' : ''} disabled></td>
            <td title="${con.Notas || ''}">${con.Notas || ''}</td>
            <td>
                <button type="button" class="btn-icon btn-edit" onclick="editClientConnection(${index})" title="Editar"><i class="fas fa-edit"></i></button>
                <button type="button" class="btn-icon btn-delete" onclick="deleteClientConnection(${con.ID})" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function addConnectionRow() {
    if (!editingClienteId) {
        showAlert('Guarde el cliente antes de añadir conexiones.', 'warning');
        return;
    }
    
    const tbody = document.getElementById('conexionesTableBody');
    const row = document.createElement('tr');
    row.classList.add('editing-row');
    
    row.innerHTML = `
        <td>
            <select class="c-tipo-select">
                <option value="">Seleccionar...</option>
                ${tiposConexionesOptions.map(t => `<option value="${t.ID}">${t.Nombre}</option>`).join('')}
            </select>
        </td>
        <td><input type="text" class="c-nom-input" placeholder="Nombre"></td>
        <td><input type="text" class="c-ip-input" placeholder="IP/Dirección"></td>
        <td><input type="number" class="c-pue-input" placeholder="Puerto"></td>
        <td><input type="text" class="c-usu-input" placeholder="Usuario"></td>
        <td><input type="text" class="c-pass-input" placeholder="Password"></td>
        <td class="checkbox-center"><input type="checkbox" class="c-act-input" checked></td>
        <td><input type="text" class="c-not-input" placeholder="Notas"></td>
        <td>
            <button type="button" class="btn-icon btn-save" onclick="saveNewConnection(this)" title="Guardar"><i class="fas fa-save"></i></button>
            <button type="button" class="btn-icon btn-cancel" onclick="renderConnectionsTable()" title="Cancelar"><i class="fas fa-times"></i></button>
        </td>
    `;
    tbody.insertBefore(row, tbody.firstChild);
}

async function saveNewConnection(btn) {
    const row = btn.closest('tr');
    
    const connectionData = {
        IDCliente: editingClienteId,
        IDTipoConexion: row.querySelector('.c-tipo-select').value || null,
        Nombre: row.querySelector('.c-nom-input').value || '',
        DireccionIP: row.querySelector('.c-ip-input').value || '',
        Puerto: row.querySelector('.c-pue-input').value || null,
        Usuario: row.querySelector('.c-usu-input').value || '',
        Password: row.querySelector('.c-pass-input').value || '',
        Activo: row.querySelector('.c-act-input').checked ? 1 : 0,
        Notas: row.querySelector('.c-not-input').value || ''
    };
    
    try {
        const response = await fetch('/api/conexioncliente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(connectionData)
        });
        
        if (response.ok) {
            loadClientConnections(editingClienteId);
        } else {
            const err = await response.json();
            showAlert('Error al guardar conexión: ' + (err.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al guardar conexión:', error);
    }
}

async function deleteClientConnection(id) {
    if (!await showConfirm('¿Seguro que desea eliminar esta conexión?')) return;
    
    try {
        const response = await fetch(`/api/conexioncliente/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadClientConnections(editingClienteId);
        } else {
            const err = await response.json().catch(() => ({}));
            showAlert(err.error || 'Error al eliminar.', 'error');
        }
    } catch (error) {
        console.error('Error al eliminar conexión:', error);
    }
}

function editClientConnection(index) {
    const tableBody = document.getElementById('conexionesTableBody');
    const rows = tableBody.getElementsByTagName('tr');
    const row = rows[index];
    const con = clientConnections[index];
    
    // Marcar fila como editando
    row.dataset.editing = "true";
    row.classList.add('editing-row');
    
    row.innerHTML = `
        <td>
            <select class="c-tipo-select">
                <option value="">Seleccionar...</option>
                ${tiposConexionesOptions.map(t => `<option value="${t.ID}" ${t.ID == con.IDTipoConexion ? 'selected' : ''}>${t.Nombre}</option>`).join('')}
            </select>
        </td>
        <td><input type="text" class="c-nom-input" value="${con.Nombre || ''}" placeholder="Nombre"></td>
        <td><input type="text" class="c-ip-input" value="${con.DireccionIP || ''}" placeholder="IP/Dirección"></td>
        <td><input type="number" class="c-pue-input" value="${con.Puerto || ''}" placeholder="Puerto"></td>
        <td><input type="text" class="c-usu-input" value="${con.Usuario || ''}" placeholder="Usuario"></td>
        <td><input type="text" class="c-pass-input" value="${con.Password || ''}" placeholder="Password"></td>
        <td class="checkbox-center"><input type="checkbox" class="c-act-input" ${con.Activo ? 'checked' : ''}></td>
        <td><input type="text" class="c-not-input" value="${con.Notas || ''}" placeholder="Notas"></td>
        <td>
            <button type="button" class="btn-icon btn-save" onclick="updateClientConnection(this, ${con.ID})" title="Actualizar"><i class="fas fa-save"></i></button>
            <button type="button" class="btn-icon btn-cancel" onclick="renderConnectionsTable()" title="Cancelar"><i class="fas fa-times"></i></button>
        </td>
    `;
}

async function updateClientConnection(btn, id) {
    const row = btn.closest('tr');
    
    const connectionData = {
        IDTipoConexion: row.querySelector('.c-tipo-select').value || null,
        Nombre: row.querySelector('.c-nom-input').value || '',
        DireccionIP: row.querySelector('.c-ip-input').value || '',
        Puerto: row.querySelector('.c-pue-input').value || null,
        Usuario: row.querySelector('.c-usu-input').value || '',
        Password: row.querySelector('.c-pass-input').value || '',
        Activo: row.querySelector('.c-act-input').checked ? 1 : 0,
        Notas: row.querySelector('.c-not-input').value || ''
    };
    
    try {
        const response = await fetch(`/api/conexioncliente/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(connectionData)
        });
        
        if (response.ok) {
            loadClientConnections(editingClienteId);
        } else {
            const err = await response.json();
            showAlert('Error al actualizar conexión: ' + (err.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al actualizar conexión:', error);
    }
}



// Cargar datos de clientes
async function loadClientesData() {
    try {
        const response = await fetch('/api/clientes');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        clientesData = data;
        currentVisibleData = data;
        renderClientesTable(data);
        updateClienteCount();

        // Handle search query parameter from global search
        const params = new URLSearchParams(window.location.search);
        const searchTerm = params.get('search');
        if (searchTerm) {
            const searchBox = document.getElementById('searchBox');
            if (searchBox) {
                searchBox.value = searchTerm;
                filterClientes(); // Trigger filtering
            }
        }
    } catch (error) {
        console.error('Error al cargar clientes:', error);
        document.getElementById('clientes-table-container').innerHTML = '<p style="color:red">Error al cargar clientes</p>';
    }
}

// Cargar poblaciones para mapear ID -> Nombre
async function loadPoblaciones() {
    try {
        const response = await fetch('/api/poblaciones');
        if (response.ok) {
            poblacionesOptions = await response.json();
            // console.log('Poblaciones loaded in clientes.js:', poblacionesOptions); 
            populatePoblacionSelect(); 
        }
    } catch (error) {
        console.error('Error al cargar poblaciones:', error);
    }
}

// Cargar tipos de clientes para el dropdown
async function loadTiposClientes() {
    try {
        const response = await fetch('/api/tiposclientes');
        const data = await response.json();
        tiposClientesOptions = data;
        populateTipoClienteSelect();
    } catch (error) {
        console.error('Error al cargar tipos de clientes:', error);
    }
}


function populatePoblacionSelect() {
    const select = document.getElementById('poblacion');
    if (!select) return;
    
    // Save current value if any
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">Seleccionar...</option>';
    poblacionesOptions.forEach(pob => {
        const option = document.createElement('option');
        option.value = pob.ID;
        option.textContent = pob.Nombre;
        select.appendChild(option);
    });
    
    // Restore value if it exists in new options
    if (currentValue) select.value = currentValue;
}


// Llenar el dropdown de tipos de clientes
function populateTipoClienteSelect() {
    const select = document.getElementById('tipoCliente');
    tiposClientesOptions.forEach(tipo => {
        const option = document.createElement('option');
        option.value = tipo.ID;
        option.textContent = tipo.Nombre;
        select.appendChild(option);
    });
}

// Renderizar tabla de clientes
function renderClientesTable(data) {
    const tbody = document.getElementById('clientesTableBody');
    tbody.innerHTML = '';

    data.forEach((cliente, index) => {
        // Mappers
        const tipoObj = tiposClientesOptions.find(t => t.ID === cliente.TipoCliente);
        const tipoNombre = tipoObj ? tipoObj.Nombre : '';
        
        const pobObj = poblacionesOptions.find(p => p.ID === cliente.Poblacion);
        const pobNombre = pobObj ? pobObj.Nombre : '';

        const fechaAlta = formatDate(cliente.FechaAlta);

        const row = document.createElement('tr');
        row.dataset.id = cliente.ID; // Guardar ID para borrado masivo
        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" onchange="updateBulkDeleteButton()"></td>
            <td>${cliente.Codigo || ''}</td>
            <td>${cliente.NombreComercial || ''}</td>
            <td>${cliente.NombreFiscal || ''}</td>
            <td>${tipoNombre}</td>
            <td>${fechaAlta}</td>
            <td>${cliente.NombreContacto || ''}</td>
            <td>${cliente.NIF || ''}</td>
            <td>${cliente.Direccion || ''}</td>
            <td>${cliente.CodigoPostal || ''}</td>
            <td>${pobNombre}</td>
            <td>${cliente.Provincia || ''}</td>
            <td>${cliente.Telefono1 || ''}</td>
            <td>${cliente.Telefono2 || ''}</td>
            <td>${cliente.TelefonoMovil || ''}</td>
            <td>${cliente.Fax || ''}</td>
            <td>${cliente.Email || ''}</td>
            <td title="${cliente.Observaciones || ''}" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${cliente.Observaciones || ''}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view" onclick="viewClienteByObject(${JSON.stringify(cliente).replace(/"/g, '&quot;')})" title="Ver"><i class="fas fa-eye"></i></button>
                <button class="btn-icon btn-edit" onclick="editClienteByObject(${JSON.stringify(cliente).replace(/"/g, '&quot;')})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon btn-delete" onclick="deleteClienteById(${cliente.ID})" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Actualizar contador de clientes
function updateClienteCount() {
    const count = clientesData.length;
    document.getElementById('clienteCount').textContent = `${count} cliente${count !== 1 ? 's' : ''}`;
}

// Configurar event listeners
function setupEventListeners() {
    // Botones de modal
    document.getElementById('addClienteBtn').addEventListener('click', openClienteModal);
    document.getElementById('closeClienteModal').addEventListener('click', closeClienteModal);
    // document.getElementById('cancelClienteBtn').addEventListener('click', closeClienteModal); // Removed, handled by toolbar
    document.getElementById('clienteForm').addEventListener('submit', submitClienteForm);
    
    document.getElementById('searchBox').addEventListener('keyup', filterClientes);

    // Toggle dropdown de columnas
    const toggleBtn = document.getElementById('toggleColumnsBtn');
    const dropdown = document.getElementById('columnDropdown');
    
    if (toggleBtn && dropdown) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !toggleBtn.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
    }

    // Cerrar modal al hacer clic fuera (solo si el click empieza y termina en el fondo)
    let isMouseDownOnModal = false;
    const modal = document.getElementById('clienteModal');
    
    modal.addEventListener('mousedown', (e) => {
        if (e.target === modal) {
            isMouseDownOnModal = true;
        }
    });

    modal.addEventListener('mouseup', (e) => {
        if (e.target === modal && isMouseDownOnModal) {
            closeClienteModal();
        }
        isMouseDownOnModal = false;
    });

    setupBulkDelete();
    setupRestoreButton(); // Initialize restore button once
}

// Filtrar clientes por búsqueda
function filterClientes() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    
    const filtered = clientesData.filter(cliente => {
        const codigo = (cliente.Codigo || '').toLowerCase();
        const nombre = (cliente.NombreComercial || '').toLowerCase();
        const nif = (cliente.NIF || '').toLowerCase();
        
        return codigo.includes(searchTerm) || nombre.includes(searchTerm) || nif.includes(searchTerm);
    });

    currentVisibleData = filtered;
    renderClientesTable(filtered);
}

function openClienteModal() {
    lastViewedIndex = currentModalIndex; // Save current state (might be -1 or a valid index)
    editingClienteId = null;
    currentModalIndex = -1;
    document.getElementById('modalClientName').textContent = 'NUEVO CLIENTE';
    document.getElementById('clienteForm').reset();
    
    // Default tab
    document.querySelector('.tab-btn[data-tab="tab-datos"]').click();
    
    setModalReadOnly(false);
    document.getElementById('codigo').readOnly = false;
    
    // Ensure dropdowns are populated
    if (poblacionesOptions.length === 0) loadPoblaciones();
    populatePoblacionSelect();
    populateTipoClienteSelect();
    
    // Apply persistent layout
    applyPersistentModalLayout();

    document.getElementById('clienteModal').style.display = 'block';
    updateModalNavigationState();
}

function applyPersistentModalLayout() {
    // Specific selector for the client modal content
    const content = document.querySelector('#clienteModal .modal-content-wrapper');
    if (content) {
        fetch('/api/config/modal')
            .then(r => r.json())
            .then(data => {
                if (data.layout) {
                     // Ensure modal is visible/rendered before applying strict position
                    requestAnimationFrame(() => {
                        content.style.position = 'absolute';
                        content.style.left = data.layout.left;
                        content.style.top = data.layout.top;
                        content.style.width = data.layout.width;
                        content.style.height = data.layout.height;
                        content.style.transform = 'none'; // Disable center transform
                        content.style.margin = '0';
                    });
                } else {
                    // Default
                    requestAnimationFrame(() => {
                        content.style.position = 'absolute';
                        content.style.top = '50%';
                        content.style.left = '50%';
                        content.style.transform = 'translate(-50%, -50%)';
                        content.style.width = ''; // Default CSS
                        content.style.height = ''; // Default CSS
                        content.style.margin = '0';
                    });
                }
            })
            .catch(e => console.error("Error loading modal layout:", e));
    }
}

function setupRestoreButton() {
    // Add Restore Button if not exists
    if (!document.getElementById('restoreLayoutBtn')) {
        const header = document.querySelector('.modal-header-new');
        const closeBtn = document.getElementById('closeClienteModal');
        
        if (header && closeBtn) {
            const restoreBtn = document.createElement('button');
            restoreBtn.id = 'restoreLayoutBtn';
            
            // Explicit styles for visibility
            restoreBtn.style.marginRight = '10px';
            restoreBtn.style.background = 'rgba(255, 255, 255, 0.1)'; // Slight background
            restoreBtn.style.border = '1px solid rgba(255, 255, 255, 0.2)';
            restoreBtn.style.borderRadius = '4px';
            restoreBtn.style.color = 'var(--text-primary)'; // Use theme text color
            restoreBtn.style.cursor = 'pointer';
            restoreBtn.style.width = '30px';
            restoreBtn.style.height = '30px';
            restoreBtn.style.display = 'flex';
            restoreBtn.style.alignItems = 'center';
            restoreBtn.style.justifyContent = 'center';
            restoreBtn.style.fontSize = '1rem';
            
            restoreBtn.title = 'Restaurar tamaño y posición';
            restoreBtn.innerHTML = '<i class="fas fa-window-restore"></i>';
            
            restoreBtn.onclick = (e) => {
                e.stopPropagation(); 
                restoreModalLayout();
            };
            
            restoreBtn.onmouseover = () => {
               restoreBtn.style.background = 'rgba(255, 255, 255, 0.2)';
               restoreBtn.style.color = 'var(--accent-color)';
            };
            restoreBtn.onmouseout = () => {
               restoreBtn.style.background = 'rgba(255, 255, 255, 0.1)';
               restoreBtn.style.color = 'var(--text-primary)';
            };

            // Insert before the close button
            closeBtn.insertAdjacentElement('beforebegin', restoreBtn);
        }
    }
}


// Helpers for table actions using objects/IDs instead of indexes
function viewClienteByObject(cliente) {
    const fullIndex = clientesData.findIndex(c => c.ID === cliente.ID);
    if (fullIndex !== -1) viewCliente(fullIndex);
}

function editClienteByObject(cliente) {
    const fullIndex = clientesData.findIndex(c => c.ID === cliente.ID);
    if (fullIndex !== -1) editCliente(fullIndex);
}

function deleteClienteById(id) {
    const fullIndex = clientesData.findIndex(c => c.ID === id);
    if (fullIndex !== -1) deleteCliente(fullIndex);
}

function setModalReadOnly(isReadOnly) {
    const form = document.getElementById('clienteForm');
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        // Use disabled for all to properly "lock" the form, but be careful with FormData
        input.disabled = isReadOnly;
        // Keep readOnly for visual consistency if needed
        if (input.tagName !== 'SELECT') {
            input.readOnly = isReadOnly;
        }
    });

    isModalEditing = !isReadOnly;
    
    // Refresh docs if on that tab to update edit buttons visibility
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.dataset.tab === 'tab-documentacion') {
        loadClientDocs(editingClienteId);
    }

    // Disable tab action buttons
    const actionButtons = [
        'addProgramRowBtn',
        'addConnectionRowBtn',
        'addEquipoBtn',
        'uploadDocBtn'
    ];
    
    actionButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = isReadOnly;
    });
    
    // Toolbar state
    document.getElementById('modalEditBtn').style.display = isReadOnly ? 'flex' : 'none';
    document.getElementById('modalSaveBtn').style.display = isReadOnly ? 'none' : 'flex';
    document.getElementById('modalCancelBtn').style.display = isReadOnly ? 'none' : 'flex';
}

function viewCliente(index) {
    currentModalIndex = index;
    const cliente = clientesData[index];
    editingClienteId = cliente.ID;
    
    // Update header name
    document.getElementById('modalClientName').textContent = `${cliente.Codigo || ''} - ${cliente.NombreComercial || ''}`;
    
    populateForm(cliente);
    
    // Default tab
    document.querySelector('.tab-btn[data-tab="tab-datos"]').click();
    
    setModalReadOnly(true);
    
    applyPersistentModalLayout();
    document.getElementById('clienteModal').style.display = 'block';
    updateModalNavigationState();
}

function populateForm(cliente) {
    document.getElementById('codigo').value = cliente.Codigo || '';
    document.getElementById('nombreComercial').value = cliente.NombreComercial || '';
    document.getElementById('nombreFiscal').value = cliente.NombreFiscal || '';
    document.getElementById('nif').value = cliente.NIF || '';
    document.getElementById('nombreContacto').value = cliente.NombreContacto || '';
    document.getElementById('email').value = cliente.Email || '';
    document.getElementById('telefono1').value = cliente.Telefono1 || '';
    document.getElementById('telefono2').value = cliente.Telefono2 || '';
    document.getElementById('telefonoMovil').value = cliente.TelefonoMovil || '';
    document.getElementById('fax').value = cliente.Fax || '';
    document.getElementById('direccion').value = cliente.Direccion || '';
    document.getElementById('codigoPostal').value = cliente.CodigoPostal || '';
    document.getElementById('provincia').value = cliente.Provincia || '';
    document.getElementById('observaciones').value = cliente.Observaciones || '';
    document.getElementById('tipoCliente').value = cliente.TipoCliente || '';
    
    // New fields if any (placeholder mapping)
    if (document.getElementById('poblacion')) document.getElementById('poblacion').value = cliente.Poblacion || '';
    if (document.getElementsByName('DireccionIP')[0]) document.getElementsByName('DireccionIP')[0].value = cliente.DireccionIP || '';
    if (document.getElementById('fechaAlta')) {
        const input = document.getElementById('fechaAlta');
        if (input.disabled) {
            // In read-only mode, we can show dd/mm/yyyy by changing type to text temporarily or just formatting
            input.type = 'text';
            input.value = formatDate(cliente.FechaAlta);
        } else {
            input.type = 'date';
            input.value = cliente.FechaAlta ? new Date(cliente.FechaAlta).toISOString().split('T')[0] : '';
        }
    }

    // Manejar checkboxes (Activo, etc.)
    const checkboxes = document.getElementById('clienteForm').querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        if (cliente[cb.name] !== undefined) {
            cb.checked = cliente[cb.name] == 1 || cliente[cb.name] === true;
        }
    });
}

// Cerrar modal
function closeClienteModal() {
    document.getElementById('clienteModal').style.display = 'none';
    editingClienteId = null;
}

// Editar cliente (Keep for existing table actions)
function editCliente(index) {
    viewCliente(index);
    setModalReadOnly(false);
}

// Guardar/actualizar cliente
async function submitClienteForm(e) {
    e.preventDefault();

    const formData = new FormData(document.getElementById('clienteForm'));
    const cliente = Object.fromEntries(formData);

    // Manejar checkboxes explícitamente (si no están marcados no aparecen en FormData)
    const checkboxes = document.getElementById('clienteForm').querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        if (cb.name) {
            cliente[cb.name] = cb.checked ? 1 : 0;
        }
    });

    // Convertir campos vacíos a null para la base de datos
    Object.keys(cliente).forEach(key => {
        if (cliente[key] === '') {
            cliente[key] = null;
        }
    });

    // --- FIX: Formatear fechaAlta para MySQL (YYYY-MM-DD) ---
    // Si el input estaba en modo lectura, puede venir como DD/MM/YYYY
    if (cliente.FechaAlta && cliente.FechaAlta.includes('/')) {
        const parts = cliente.FechaAlta.split('/');
        if (parts.length === 3) {
            // Asumimos DD/MM/YYYY -> YYYY-MM-DD
            cliente.FechaAlta = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }

    try {
        if (editingClienteId) {
            // Actualizar
            const response = await fetch(`/api/clientes/${editingClienteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cliente)
            });

            const data = await response.json();
            
            if (response.ok) {
                // Keep modal open, but set to read-only
                showAlert('Cliente actualizado con éxito', 'success');
                await loadClientesData(); // Reload all data
                
                // Find the updated client and refresh the modal index
                const newIndex = clientesData.findIndex(cli => cli.ID == editingClienteId);
                if (newIndex !== -1) {
                    currentModalIndex = newIndex;
                    populateForm(clientesData[newIndex]);
                }
                setModalReadOnly(true);
            } else {
                console.error('Error response:', data);
                showAlert('Error al actualizar cliente: ' + (data.error || 'Error desconocido'), 'error');
            }
        } else {
            // Validar que el código no exista
            const codigoExistente = clientesData.some(cli => cli.Codigo === cliente.Codigo);
            if (codigoExistente) {
                showAlert('El código de cliente ya existe', 'warning');
                return;
            }

            // Crear nuevo
            const response = await fetch('/api/clientes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cliente)
            });

            const data = await response.json();
            
            if (response.ok) {
                // Keep modal open, but set to read-only
                showAlert('Cliente creado con éxito', 'success');
                editingClienteId = data.id; // Store the new ID
                await loadClientesData();
                
                const newIndex = clientesData.findIndex(cli => cli.ID == editingClienteId);
                if (newIndex !== -1) {
                    currentModalIndex = newIndex;
                    populateForm(clientesData[newIndex]);
                }
                setModalReadOnly(true);
            } else {
                console.error('Error response:', data);
                showAlert('Error al crear cliente: ' + (data.error || 'Error desconocido'), 'error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación: ' + error.message, 'error');
    }
}

// Eliminar cliente
async function deleteCliente(index) {
    const cliente = clientesData[index];
    
    if (!await showConfirm(`¿Eliminar cliente "${cliente.Codigo} - ${cliente.NombreComercial}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/clientes/${cliente.ID}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showAlert('Cliente eliminado correctamente', 'success');
            loadClientesData();
        } else {
            const err = await response.json().catch(() => ({}));
            showAlert(err.error || 'Error al eliminar cliente', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al eliminar cliente', 'error');
    }
}


// (Funciones de acordeón eliminadas para usar las de main.js)

// --- GESTIÓN DE COLUMNAS ---
let hiddenColumns = JSON.parse(localStorage.getItem('hiddenColumns_clientes')) || [];

function initColumnToggle() {
    const table = document.getElementById('clientesTable');
    if (!table) return;

    const headers = table.querySelectorAll('thead th');
    const dropdown = document.getElementById('columnDropdown');
    if (!dropdown) return;

    dropdown.innerHTML = '';
    
    // --- Add Select All / None Option ---
    const selectAllItem = document.createElement('div');
    selectAllItem.className = 'column-item select-all-option';
    selectAllItem.style.borderBottom = '1px solid var(--border-color)';
    selectAllItem.style.marginBottom = '5px';
    selectAllItem.style.paddingBottom = '5px';
    selectAllItem.style.fontWeight = 'bold';
    
    // Check if all relevant columns are visible to set initial state
    const totalToggleable = Array.from(headers).filter(th => {
        const text = th.textContent.trim();
        return text && !th.querySelector('input[type="checkbox"]') && text !== 'Acciones';
    }).length;
    
    const visibleCount = totalToggleable - hiddenColumns.length;
    const isAllChecked = visibleCount === totalToggleable;

    selectAllItem.innerHTML = `
        <input type="checkbox" id="col-select-all" ${isAllChecked ? 'checked' : ''}>
        <label for="col-select-all">Marcar todos</label>
    `;

    selectAllItem.querySelector('input').addEventListener('change', (e) => {
        const checked = e.target.checked;
        const allCheckboxes = dropdown.querySelectorAll('.column-item:not(.select-all-option) input[type="checkbox"]');
        
        allCheckboxes.forEach(cb => {
            if (cb.checked !== checked) {
                cb.checked = checked;
                cb.dispatchEvent(new Event('change')); // Trigger individual change listeners
            }
        });
    });
    
    // Click on item wrapper
    selectAllItem.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
            const cb = selectAllItem.querySelector('input');
            cb.checked = !cb.checked;
            cb.dispatchEvent(new Event('change'));
        }
    });

    dropdown.appendChild(selectAllItem);
    // ------------------------------------

    headers.forEach((th, index) => {
        // Ignorar checkbox y acciones
        const text = th.textContent.trim();
        if (!text || th.querySelector('input[type="checkbox"]') || text === 'Acciones') return;

        const item = document.createElement('div');
        item.className = 'column-item';
        
        const isChecked = !hiddenColumns.includes(index);
        
        item.innerHTML = `
            <input type="checkbox" id="col-${index}" ${isChecked ? 'checked' : ''}>
            <label for="col-${index}">${text}</label>
        `;

        item.querySelector('input').addEventListener('change', (e) => {
            toggleColumn(index, e.target.checked);
            
            // Update Select All state logic
            const allCheckboxes = dropdown.querySelectorAll('.column-item:not(.select-all-option) input[type="checkbox"]');
            const allChecked = Array.from(allCheckboxes).every(c => c.checked);
            const selectAllCb = document.getElementById('col-select-all');
            if (selectAllCb) selectAllCb.checked = allChecked;
        });

        // Hacer que todo el item sea clickable
        item.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                const cb = item.querySelector('input');
                cb.checked = !cb.checked;
                toggleColumn(index, cb.checked);
                
                // Update Select All state logic (duplicated for click event)
                cb.dispatchEvent(new Event('change')); // Reuse change listener logic is cleaner but this works too if dispatch is problematic
            }
        });

        dropdown.appendChild(item);
        
        // Aplicar estado inicial
        if (!isChecked) {
            applyColumnVisibility(index, false);
        }
    });
}

function toggleColumn(index, show) {
    if (show) {
        hiddenColumns = hiddenColumns.filter(i => i !== index);
    } else {
        if (!hiddenColumns.includes(index)) {
            hiddenColumns.push(index);
        }
    }
    
    localStorage.setItem('hiddenColumns_clientes', JSON.stringify(hiddenColumns));
    applyColumnVisibility(index, show);
}

function applyColumnVisibility(index, show) {
    const table = document.getElementById('clientesTable');
    const rows = table.rows;

    for (let i = 0; i < rows.length; i++) {
        const cell = rows[i].cells[index];
        if (cell) {
            if (show) {
                cell.classList.remove('hidden-column');
            } else {
                cell.classList.add('hidden-column');
            }
        }
    }
}

// Re-aplicar visibilidad después de renderizar la tabla
const originalRenderTable = renderClientesTable;
renderClientesTable = function(data) {
    originalRenderTable(data);
    hiddenColumns.forEach(index => {
        applyColumnVisibility(index, false);
    });
};

// --- GESTIÓN DE BORRADO MASIVO ---

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
    const selectedCount = document.querySelectorAll('.row-checkbox:checked').length;
    
    if (bulkDeleteBtn) {
        bulkDeleteBtn.style.display = selectedCount > 0 ? 'inline-block' : 'none';
        bulkDeleteBtn.innerHTML = `<i class="fas fa-trash"></i> Eliminar (${selectedCount})`;
    }

    // Actualizar estado del selectAll
    const selectAll = document.getElementById('selectAll');
    const totalCheckboxes = document.querySelectorAll('.row-checkbox').length;
    if (selectAll && totalCheckboxes > 0) {
        selectAll.checked = selectedCount === totalCheckboxes;
        selectAll.indeterminate = selectedCount > 0 && selectedCount < totalCheckboxes;
    }
}

async function deleteSelected() {
    const selectedBoxes = document.querySelectorAll('.row-checkbox:checked');
    const ids = Array.from(selectedBoxes).map(cb => cb.closest('tr').dataset.id);

    if (ids.length === 0) return;

    if (!await showConfirm(`¿Estás seguro de que deseas eliminar ${ids.length} registros permanentemente?`)) {
        return;
    }

    try {
        const response = await fetch('/api/clientes/bulk-delete', {
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
            loadClientesData();
        } else {
            showAlert('Error al eliminar registros: ' + (data.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación de eliminación masiva', 'error');
    }
}

// --- GESTIÓN DE MENÚ CONTEXTUAL ---

let contextMenuTargetId = null;
let contextMenuTargetIndex = null;

function initContextMenu() {
    const menu = document.getElementById('clientesContextMenu');
    const tableBody = document.getElementById('clientesTableBody');

    // Desactivar el menú contextual por defecto en las filas de la tabla
    tableBody.addEventListener('contextmenu', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;

        e.preventDefault();
        
        // Guardar referencia del cliente
        contextMenuTargetId = row.dataset.id;
        // Encontrar el índice en clientesData basándose en el ID
        contextMenuTargetIndex = clientesData.findIndex(c => c.ID == contextMenuTargetId);

        if (contextMenuTargetIndex === -1) return;

        // Posicionar y mostrar el menú
        menu.style.display = 'block';
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;

        // Cerrar el menú si se hace scroll o click fuera
        const closeMenu = () => {
            menu.style.display = 'none';
            document.removeEventListener('click', closeMenu);
            document.removeEventListener('scroll', closeMenu, true);
        };

        // Timeout pequeño para no atrapar el click actual
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
            document.addEventListener('scroll', closeMenu, true);
        }, 10);
    });

    // Manejar acciones del menú contextual
    document.getElementById('ctxEditCliente').addEventListener('click', () => {
        if (contextMenuTargetIndex !== null) editCliente(contextMenuTargetIndex);
    });

    document.getElementById('ctxDeleteCliente').addEventListener('click', () => {
        if (contextMenuTargetIndex !== null) deleteCliente(contextMenuTargetIndex);
    });

    document.getElementById('ctxInfoCliente').addEventListener('click', () => {
        if (contextMenuTargetIndex !== null) viewCliente(contextMenuTargetIndex);
    });

    // Acciones de exportación
    document.getElementById('ctxExportExcel').addEventListener('click', exportToExcel);
    document.getElementById('ctxExportWord').addEventListener('click', exportToWord);
    document.getElementById('ctxExportXML').addEventListener('click', exportToXML);
    document.getElementById('ctxPrintPDF').addEventListener('click', printTable);
}

// --- FUNCIONALIDADES DE EXPORTACIÓN Y PRENSA ---

function exportToExcel() {
    if (currentVisibleData.length === 0) return;
    
    // Headers logic: get display names from table headers (skip first checkbox and last actions)
    const headers = Array.from(document.querySelectorAll('#clientesTable thead th'))
        .slice(1, -1)
        .map(th => th.textContent.trim());
    
    // Create CSV content (Excel friendly with BOM and semi-colon)
    let csvContent = "\uFEFF"; // BOM for UTF-8
    csvContent += headers.join(";") + "\n";
    
    currentVisibleData.forEach(row => {
        const values = [
            row.Codigo,
            row.NombreComercial,
            row.NombreFiscal,
            getTipoClienteNombre(row.TipoCliente),
            formatDate(row.FechaAlta),
            row.NombreContacto,
            row.NIF,
            row.Direccion,
            row.CodigoPostal,
            getPoblacionNombre(row.Poblacion),
            row.Provincia,
            row.Telefono1,
            row.Telefono2,
            row.TelefonoMovil,
            row.Fax,
            row.Email,
            row.Observaciones
        ].map(val => {
            let str = (val === null || val === undefined) ? "" : String(val);
            str = str.replace(/"/g, '""'); // Escape quotes
            return `"${str}"`;
        });
        csvContent += values.join(";") + "\n";
    });
    
    downloadFile(csvContent, 'clientes_export.csv', 'text/csv;charset=utf-8;');
}

function exportToWord() {
    if (currentVisibleData.length === 0) return;
    
    let html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Export Clientes</title>
        <!--[if gte mso 9]>
        <xml>
            <w:WordDocument>
                <w:View>Print</w:View>
                <w:Zoom>90</w:Zoom>
                <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
            @page Section1 { 
                size: 841.9pt 595.3pt; /* A4 Landscape */
                mso-page-orientation: landscape; 
                margin: 0.5in 0.5in 0.5in 0.5in; 
            }
            div.Section1 { page: Section1; }
            table { 
                border-collapse: collapse; 
                width: 100%; 
                font-family: Arial, sans-serif;
                font-size: 8pt;
            }
            th, td { 
                border: 1px solid #000000; 
                padding: 4px; 
                text-align: left; 
                word-wrap: break-word;
            }
            th { background-color: #f2f2f2; font-weight: bold; }
            h2 { font-family: Arial, sans-serif; }
        </style>
        </head>
        <body>
        <div class="Section1">
        <h2>Listado de Clientes</h2>
        <table>
            <thead>
                <tr>
                    ${Array.from(document.querySelectorAll('#clientesTable thead th')).slice(1, -1).map(th => `<th>${th.textContent}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${currentVisibleData.map(row => `
                    <tr>
                        <td>${row.Codigo || ''}</td>
                        <td>${row.NombreComercial || ''}</td>
                        <td>${row.NombreFiscal || ''}</td>
                        <td>${getTipoClienteNombre(row.TipoCliente)}</td>
                        <td>${formatDate(row.FechaAlta)}</td>
                        <td>${row.NombreContacto || ''}</td>
                        <td>${row.NIF || ''}</td>
                        <td>${row.Direccion || ''}</td>
                        <td>${row.CodigoPostal || ''}</td>
                        <td>${getPoblacionNombre(row.Poblacion)}</td>
                        <td>${row.Provincia || ''}</td>
                        <td>${row.Telefono1 || ''}</td>
                        <td>${row.Telefono2 || ''}</td>
                        <td>${row.TelefonoMovil || ''}</td>
                        <td>${row.Fax || ''}</td>
                        <td>${row.Email || ''}</td>
                        <td>${row.Observaciones || ''}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        </div>
        </body></html>`;
    
    downloadFile(html, 'clientes_export.doc', 'application/msword');
}

function exportToXML() {
    if (currentVisibleData.length === 0) return;
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Clientes>\n';
    currentVisibleData.forEach(row => {
        xml += '  <Cliente>\n';
        Object.keys(row).forEach(key => {
            let val = (row[key] === null || row[key] === undefined) ? "" : String(row[key]);
            val = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            xml += `    <${key}>${val}</${key}>\n`;
        });
        xml += '  </Cliente>\n';
    });
    xml += '</Clientes>';
    
    downloadFile(xml, 'clientes_export.xml', 'text/xml');
}

function printTable() {
    window.print();
}

// Helpers
function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function getTipoClienteNombre(id) {
    const opt = tiposClientesOptions.find(t => t.ID === id);
    return opt ? opt.Nombre : '';
}

function getPoblacionNombre(id) {
    const opt = poblacionesOptions.find(p => p.ID === id);
    return opt ? opt.Nombre : '';
}

// formatDate is now provided by main.js

// --- EQUIPOS LOGIC ---

let currentClientEquipos = [];

async function loadClientEquipos(clientId) {
    try {
        const response = await fetch(`/api/equipos/cliente/${clientId}`);
        const equipos = await response.json();
        currentClientEquipos = equipos; // Store for local access
        renderEquiposGrid(equipos);
    } catch (error) {
        console.error('Error al cargar equipos:', error);
    }
}

function renderEquiposGrid(equipos) {
    const grid = document.querySelector('.equipos-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    equipos.forEach(eq => {
        const card = document.createElement('div');
        card.className = 'equipo-card';
        card.innerHTML = `
            <div class="equipo-header">
                <span class="equipo-date">${eq.Fecha ? new Date(eq.Fecha).toLocaleDateString() : ''}</span>
                <div class="equipo-name-container">
                    <i class="fas fa-desktop"></i>
                    <span>${eq.NombreEquipo || 'Equipo sin nombre'}</span>
                </div>
                <div class="equipo-actions">
                    <i class="fas fa-edit icon-save" onclick="enableEditEquipo(${eq.IDEquipos})" title="Editar"></i>
                    <i class="fas fa-trash icon-cancel" onclick="deleteClientEquipo(${eq.IDEquipos})" title="Eliminar"></i>
                </div>
            </div>
            <div class="equipo-body">
                <div class="equipo-specs">
                    <p><i class="fas fa-microchip" title="Placa Base"></i> <span>${eq.PlacaBase || ''}</span></p>
                    <p><i class="fas fa-memory" title="Procesador"></i> <span>${eq.CPU || ''}</span></p>
                    <p><i class="fas fa-brain" title="Memoria"></i> <span>${eq.Memoria || ''}</span></p>
                    <p><i class="fas fa-video" title="Gráfica"></i> <span>${eq.Grafica || ''}</span></p>
                    <p><i class="fas fa-hdd" title="Unidades"></i> <span>${eq.Unidades || ''}</span></p>
                </div>
                <div class="equipo-notes-container">
                    <div class="equipo-notes-box">
                        <label><i class="fas fa-edit"></i> Notas</label>
                        <textarea readonly>${eq.Notas || ''}</textarea>
                    </div>
                    <div class="equipo-ip-pill">
                        <i class="fas fa-network-wired"></i> IP: <span>${eq.IP || ''}</span>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}


function enableEditEquipo(id) {
    const eq = currentClientEquipos.find(e => e.IDEquipos === id);
    if (!eq) return;

    // Direct DOM finding via delete button hook
    const deleteBtn = document.querySelector(`.equipo-actions i[onclick="deleteClientEquipo(${id})"]`);
    if (!deleteBtn) return;
    const card = deleteBtn.closest('.equipo-card');
    
    card.className = 'equipo-card editing';
    card.innerHTML = `
        <div class="equipo-header">
            <input type="date" class="e-fecha-input" value="${eq.Fecha ? eq.Fecha.split('T')[0] : ''}" style="width: auto;">
            <div class="equipo-name-container">
                <i class="fas fa-desktop"></i>
                <input type="text" class="e-nom-input" value="${eq.NombreEquipo || ''}" placeholder="Nombre Equipo">
            </div>
            <div class="equipo-actions">
                <i class="fas fa-save icon-save" onclick="updateEquipo(this, ${eq.IDEquipos})" title="Guardar"></i>
                <i class="fas fa-times icon-cancel" onclick="loadClientEquipos(editingClienteId)" title="Cancelar"></i>
            </div>
        </div>
        <div class="equipo-body">
            <div class="equipo-specs">
                <p><i class="fas fa-microchip"></i> <input type="text" class="e-pla-input" value="${eq.PlacaBase || ''}" placeholder="Placa Base"></p>
                <p><i class="fas fa-memory" title="Procesador"></i> <input type="text" class="e-cpu-input" value="${eq.CPU || ''}" placeholder="CPU"></p>
                <p><i class="fas fa-brain" title="Memoria"></i> <input type="text" class="e-mem-input" value="${eq.Memoria || ''}" placeholder="Memoria"></p>
                <p><i class="fas fa-video" title="Gráfica"></i> <input type="text" class="e-gra-input" value="${eq.Grafica || ''}" placeholder="Gráfica"></p>
                <p><i class="fas fa-hdd" title="Unidades"></i> <input type="text" class="e-uni-input" value="${eq.Unidades || ''}" placeholder="Unidades"></p>
            </div>
            <div class="equipo-notes-container">
                <div class="equipo-notes-box">
                    <label><i class="fas fa-edit"></i> Notas</label>
                    <textarea class="e-not-input" placeholder="Notas...">${eq.Notas || ''}</textarea>
                </div>
                <div class="equipo-ip-pill">
                    <i class="fas fa-network-wired"></i> IP: <input type="text" class="e-ip-input" value="${eq.IP || ''}" placeholder="0.0.0.0" style="width: 120px;">
                </div>
            </div>
        </div>
    `;
}

async function updateEquipo(btn, id) {
    const card = btn.closest('.equipo-card');
    
    const equipoData = {
        NombreEquipo: card.querySelector('.e-nom-input').value || 'Sin nombre',
        Fecha: card.querySelector('.e-fecha-input').value || null,
        PlacaBase: card.querySelector('.e-pla-input').value || '',
        CPU: card.querySelector('.e-cpu-input').value || '',
        Memoria: card.querySelector('.e-mem-input').value || '',
        Grafica: card.querySelector('.e-gra-input').value || '',
        Unidades: card.querySelector('.e-uni-input').value || '',
        IP: card.querySelector('.e-ip-input').value || '',
        Notas: card.querySelector('.e-not-input').value || ''
    };
    
    try {
        const response = await fetch(`/api/equipos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(equipoData)
        });
        
        if (response.ok) {
            loadClientEquipos(editingClienteId);
        } else {
            const err = await response.json();
            showAlert('Error al actualizar: ' + (err.error || 'Desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al actualizar equipo:', error);
    }
}

function addEquipoCard() {
    if (!editingClienteId) {
        showAlert('Guarde el cliente antes de añadir equipos.', 'warning');
        return;
    }
    
    const grid = document.querySelector('.equipos-grid');
    const card = document.createElement('div');
    card.className = 'equipo-card editing';
    
    card.innerHTML = `
        <div class="equipo-header">
            <input type="date" class="e-fecha-input" value="${new Date().toISOString().split('T')[0]}" style="width: auto;">
            <div class="equipo-name-container">
                <i class="fas fa-desktop"></i>
                <input type="text" class="e-nom-input" placeholder="Nombre Equipo">
            </div>
            <div class="equipo-actions">
                <i class="fas fa-save icon-save" onclick="saveNewEquipo(this)" title="Guardar"></i>
                <i class="fas fa-times icon-cancel" onclick="loadClientEquipos(editingClienteId)" title="Cancelar"></i>
            </div>
        </div>
        <div class="equipo-body">
            <div class="equipo-specs">
                <p><i class="fas fa-microchip"></i> <input type="text" class="e-pla-input" placeholder="Placa Base"></p>
                <p><i class="fas fa-memory" title="Procesador"></i> <input type="text" class="e-cpu-input" placeholder="CPU"></p>
                <p><i class="fas fa-brain" title="Memoria"></i> <input type="text" class="e-mem-input" placeholder="Memoria"></p>
                <p><i class="fas fa-video" title="Gráfica"></i> <input type="text" class="e-gra-input" placeholder="Gráfica"></p>
                <p><i class="fas fa-hdd" title="Unidades"></i> <input type="text" class="e-uni-input" placeholder="Unidades"></p>
            </div>
            <div class="equipo-notes-container">
                <div class="equipo-notes-box">
                    <label><i class="fas fa-edit"></i> Notas</label>
                    <textarea class="e-not-input" placeholder="Notas..."></textarea>
                </div>
                <div class="equipo-ip-pill">
                    <i class="fas fa-network-wired"></i> IP: <input type="text" class="e-ip-input" placeholder="0.0.0.0" style="width: 100px;">
                </div>
            </div>
        </div>
    `;
    grid.insertBefore(card, grid.firstChild);
}

async function saveNewEquipo(btn) {
    const card = btn.closest('.equipo-card');
    
    const equipoData = {
        IDCliente: editingClienteId,
        NombreEquipo: card.querySelector('.e-nom-input').value || 'Sin nombre',
        Fecha: card.querySelector('.e-fecha-input').value || null,
        PlacaBase: card.querySelector('.e-pla-input').value || '',
        CPU: card.querySelector('.e-cpu-input').value || '',
        Memoria: card.querySelector('.e-mem-input').value || '',
        Grafica: card.querySelector('.e-gra-input').value || '',
        Unidades: card.querySelector('.e-uni-input').value || '',
        IP: card.querySelector('.e-ip-input').value || '',
        Notas: card.querySelector('.e-not-input').value || ''
    };
    
    try {
        const response = await fetch('/api/equipos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(equipoData)
        });
        
        if (response.ok) {
            loadClientEquipos(editingClienteId);
        } else {
            const err = await response.json();
            showAlert('Error al guardar equipo: ' + (err.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al guardar equipo:', error);
    }
}

async function deleteClientEquipo(id) {
    if (!await showConfirm('¿Seguro que desea eliminar este equipo?')) return;
    
    try {
        const response = await fetch(`/api/equipos/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadClientEquipos(editingClienteId);
        } else {
            const err = await response.json();
            showAlert('Error al eliminar: ' + (err.error || 'Desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al eliminar equipo:', error);
    }
}

// --- DOCUMENTACIÓN LOGIC ---

async function loadClientDocs(clientId) {
    try {
        const response = await fetch(`/api/documentacion/cliente/${clientId}`);
        const docs = await response.json();
        renderDocsGrid(docs);
    } catch (error) {
        console.error('Error al cargar documentos:', error);
    }
}

function renderDocsGrid(docs) {
    const grid = document.querySelector('.docs-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    docs.forEach(doc => {
        const ext = doc.NombreArchivo.split('.').pop().toLowerCase();
        const card = document.createElement('div');
        card.className = `doc-card ext-${ext}`;
        
        // Icon logic
        let icon = 'fa-file';
        if (['pdf'].includes(ext)) icon = 'fa-file-pdf';
        else if (['doc', 'docx'].includes(ext)) icon = 'fa-file-word';
        else if (['xls', 'xlsx'].includes(ext)) icon = 'fa-file-excel';
        else if (['zip', 'rar'].includes(ext)) icon = 'fa-file-archive';
        else if (['png', 'jpg', 'jpeg'].includes(ext)) icon = 'fa-file-image';

        card.innerHTML = `
            <div class="doc-card-header">
                <i class="fas ${icon} doc-icon"></i>
                <div class="doc-name" title="${doc.NombreArchivo}">${doc.NombreArchivo}</div>
            </div>
            <div class="doc-meta">
                <span><b>Tamaño:</b> ${(doc.TamArchivo / 1024 / 1024).toFixed(2)} MB</span>
                <span><b>Subido:</b> ${formatDate(doc.FechaSubida)} ${new Date(doc.FechaSubida).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div class="doc-desc">${doc.Descripcion || 'Sin descripción'}</div>
            <div class="doc-card-actions">
                <i class="fas fa-eye" onclick="openDocument(${doc.IDDocumentacion})" title="Abrir en Sistema"></i>
                ${isModalEditing ? `<i class="fas fa-edit icon-save" onclick="enableEditDoc(${doc.IDDocumentacion})" title="Editar Descripción"></i>` : ''}
                <i class="fas fa-download" onclick="downloadDocument(${doc.IDDocumentacion}, '${doc.NombreArchivo}')" title="Descargar"></i>
                <i class="fas fa-trash icon-cancel" onclick="deleteDocument(${doc.IDDocumentacion})" title="Eliminar"></i>
            </div>
        `;
        grid.appendChild(card);
    });
}

function enableEditDoc(id) {
    const card = document.querySelector(`.doc-card-actions i[onclick="enableEditDoc(${id})"]`).closest('.doc-card');
    const descDiv = card.querySelector('.doc-desc');
    const currentDesc = descDiv.innerText === 'Sin descripción' ? '' : descDiv.innerText;

    descDiv.innerHTML = `
        <textarea class="doc-edit-input" style="width: 100%; resize: vertical; margin-bottom: 5px; background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px; padding: 5px;">${currentDesc}</textarea>
        <div style="display: flex; gap: 5px; justify-content: flex-end;">
            <i class="fas fa-save icon-save" onclick="updateDoc(${id}, this)" title="Guardar" style="cursor: pointer; font-size: 1.2rem;"></i>
            <i class="fas fa-times icon-cancel" onclick="loadClientDocs(editingClienteId)" title="Cancelar" style="cursor: pointer; font-size: 1.2rem; color: var(--btn-delete);"></i>
        </div>
    `;
}

async function updateDoc(id, btn) {
    const card = btn.closest('.doc-card');
    const newDesc = card.querySelector('.doc-edit-input').value;

    try {
        const response = await fetch(`/api/documentacion/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Descripcion: newDesc })
        });

        if (response.ok) {
            loadClientDocs(editingClienteId);
        } else {
            const err = await response.json();
            showAlert('Error al actualizar: ' + err.error, 'error');
        }
    } catch (error) {
        console.error('Error updating doc:', error);
    }
}

async function openDocument(id) {
    try {
        const response = await fetch(`/api/documentacion/open/${id}`, { method: 'POST' });
        if (response.ok) {
            // Optional: showAlert('Archivo abierto', 'success');
        } else {
            const err = await response.json();
            showAlert('Error al abrir archivo: ' + err.error, 'error');
        }
    } catch (error) {
        console.error('Error opening doc:', error);
    }
}

async function uploadDocument(event) {
    const file = event.target.files[0];
    if (!file || !editingClienteId) return;

    const descripcion = prompt('Introduce una breve descripción del documento (opcional):');
    if (descripcion === null) return; // Cancelado

    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('IDCliente', editingClienteId);
    formData.append('Descripcion', descripcion);

    try {
        const response = await fetch('/api/documentacion/upload', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            loadClientDocs(editingClienteId);
            event.target.value = ''; // Reset input
        } else {
            const err = await response.json();
            showAlert('Error al subir: ' + (err.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error al subir documento:', error);
    }
}

async function downloadDocument(id, filename) {
    try {
        const response = await fetch(`/api/documentacion/download/${id}`);
        if (!response.ok) throw new Error('Error al descargar');
        
        const blob = await response.json().then(res => {
            // Wait, the endpoint sends a stream/buffer, not JSON.
            // I should handle it as a blob directly.
            return response.blob(); 
        }).catch(() => response.blob()); // Safety fallback

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Download error:', error);
        // Retry with a simple link if fetch fails (fallback)
        window.location.href = `/api/documentacion/download/${id}`;
    }
}

async function deleteDocument(id) {
    if (!await showConfirm('¿Seguro que deseas eliminar este documento?')) return;

    try {
        const response = await fetch(`/api/documentacion/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadClientDocs(editingClienteId);
        } else {
            const err = await response.json().catch(() => ({}));
            showAlert(err.error || 'Error al eliminar el documento', 'error');
        }
    } catch (error) {
        console.error('Error al eliminar:', error);
    }
}


// --- FILTER SIDEBAR LOGIC ---
function initFilters() {
    const sidebar = document.getElementById('filterSidebar');
    const overlay = document.getElementById('filterOverlay');
    const openBtn = document.getElementById('openFilterBtn');
    const closeBtn = document.getElementById('closeFilterBtn');
    const applyBtn = document.getElementById('applyFiltersBtn');
    const clearBtn = document.getElementById('clearFiltersBtn');

    if (!sidebar || !openBtn) return;

    openBtn.addEventListener('click', () => {
        sidebar.classList.add('show');
        overlay.classList.add('show');
        populateFilterLists();
    });

    const closeSidebar = () => {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
    };

    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);

    applyBtn.addEventListener('click', () => {
        applyFilters();
        closeSidebar();
    });

    clearBtn.addEventListener('click', () => {
        resetFilters();
    });

    // Select All Checkboxes
    document.getElementById('selectAllApps').addEventListener('change', (e) => {
        const checked = e.target.checked;
        document.querySelectorAll('#appsFilterList input[type="checkbox"]').forEach(cb => cb.checked = checked);
    });

    document.getElementById('selectAllPlats').addEventListener('change', (e) => {
        const checked = e.target.checked;
        document.querySelectorAll('#platsFilterList input[type="checkbox"]').forEach(cb => cb.checked = checked);
    });
}

async function populateFilterLists() {
    // Populate Applications
    const appsList = document.getElementById('appsFilterList');
    if (appsList.children.length === 0) {
        appsList.innerHTML = aplicacionesOptions.map(app => `
            <label class="filter-checkbox-item">
                <input type="checkbox" class="app-filter-cb" value="${app.ID}">
                <span>${app.Nombre}</span>
            </label>
        `).join('');
    }

    // Populate Platforms
    const platsList = document.getElementById('platsFilterList');
    if (platsList.children.length === 0) {
        platsList.innerHTML = plataformasOptions.map(plat => `
            <label class="filter-checkbox-item">
                <input type="checkbox" class="plat-filter-cb" value="${plat.ID}">
                <span>${plat.Nombre}</span>
            </label>
        `).join('');
    }

    // Populate Client Types
    const tipoSelect = document.getElementById('filterTipoCliente');
    if (tipoSelect.children.length === 1) { // Only "Todos los tipos"
        tiposClientesOptions.forEach(tipo => {
            const opt = document.createElement('option');
            opt.value = tipo.ID;
            opt.textContent = tipo.Nombre;
            tipoSelect.appendChild(opt);
        });
    }

    // Fetch all client apps if not done yet for filtering
    if (allClientApps.length === 0) {
        try {
            const res = await fetch('/api/aplicacioncliente');
            allClientApps = await res.json();
        } catch (e) {
            console.error('Error fetching global apps for filter:', e);
        }
    }
}

function applyFilters() {
    const selectedApps = Array.from(document.querySelectorAll('.app-filter-cb:checked')).map(cb => parseInt(cb.value));
    const selectedPlats = Array.from(document.querySelectorAll('.plat-filter-cb:checked')).map(cb => parseInt(cb.value));
    const selectedTipo = document.getElementById('filterTipoCliente').value;
    const fechaOp = document.getElementById('filterFechaOp').value;
    const fechaAlta = document.getElementById('filterFechaAlta').value;
    const nifValue = document.getElementById('filterNIF').value.toLowerCase();
    const searchContent = document.getElementById('filterSearch').value.toLowerCase();

    const filtered = clientesData.filter(cliente => {
        // --- Related Apps & Platforms Filter ---
        // Match only if the client has AT LEAST ONE record that satisfies the selected Apps AND Plats
        if (selectedApps.length > 0 || selectedPlats.length > 0) {
            const hasMatch = allClientApps.some(ac => {
                if (Number(ac.IDCliente) !== Number(cliente.ID)) return false;
                
                // If apps are selected, this record MUST match one of them
                const matchesApp = selectedApps.length === 0 || selectedApps.map(Number).includes(Number(ac.IDAplicacion));
                
                // If platforms are selected, this record MUST match one of them
                const matchesPlat = selectedPlats.length === 0 || selectedPlats.map(Number).includes(Number(ac.IDPlataforma));
                
                return matchesApp && matchesPlat;
            });
            
            if (!hasMatch) return false;
        }

        // --- Other Filters (AND logic) ---
        // Tipo Filter
        if (selectedTipo && Number(cliente.TipoCliente) !== Number(selectedTipo)) return false;

        // Fecha Filter
        if (fechaAlta && cliente.FechaAlta) {
            const cDate = new Date(cliente.FechaAlta).getTime();
            const fDate = new Date(fechaAlta).getTime();
            if (fechaOp === '>=' && cDate < fDate) return false;
            if (fechaOp === '<=' && cDate > fDate) return false;
            if (fechaOp === '=' && cDate !== fDate) return false;
        }

        // NIF Filter
        if (nifValue && !(cliente.NIF || '').toLowerCase().includes(nifValue)) return false;

        // Multi-field search context (Global search inside the filter)
        if (searchContent) {
            const found = 
                (cliente.NombreComercial || '').toLowerCase().includes(searchContent) ||
                (cliente.NombreFiscal || '').toLowerCase().includes(searchContent) ||
                (cliente.Direccion || '').toLowerCase().includes(searchContent) ||
                (cliente.Observaciones || '').toLowerCase().includes(searchContent);
            if (!found) return false;
        }

        return true;
    });

    currentVisibleData = filtered;
    renderClientesTable(filtered);
    
    // Update count to reflect filtered result
    document.getElementById('clienteCount').textContent = `${filtered.length} cliente${filtered.length !== 1 ? 's' : ''} (filtrado)`;
    
    // Alert if no results
    if (filtered.length === 0) {
        showAlert('No se encontraron clientes con los filtros aplicados', 'info');
    }
}

function resetFilters() {
    document.querySelectorAll('.filter-sidebar input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.getElementById('filterTipoCliente').value = '';
    document.getElementById('filterFechaAlta').value = '';
    document.getElementById('filterNIF').value = '';
    document.getElementById('filterSearch').value = '';
    
    // Refresh table with full data
    currentVisibleData = clientesData;
    renderClientesTable(clientesData);
    updateClienteCount();
}

