// Gestión de Remitentes
let remitentesData = [];
let editingRemitenteId = null;

// Inicializar la página
document.addEventListener('DOMContentLoaded', () => {
    loadRemitentesData();
    setupEventListeners();
});

// Cargar datos
async function loadRemitentesData() {
    try {
        const response = await fetch('/api/remitentes');
        const data = await response.json();
        remitentesData = data;
        renderRemitentesTable(data);
        updateRemitenteCount();
        const selectAll = document.getElementById('selectAll');
        if (selectAll) selectAll.checked = false;
        updateBulkDeleteButton();
    } catch (error) {
        console.error('Error al cargar remitentes:', error);
        showAlert('Error al cargar remitentes', 'error');
    }
}

// Renderizar tabla
function renderRemitentesTable(data) {
    const tbody = document.getElementById('remitentesTableBody');
    tbody.innerHTML = '';

    data.forEach((remitente, index) => {
        const row = document.createElement('tr');
        row.dataset.id = remitente.IDRemitentes;
        
        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" onchange="updateBulkDeleteButton()"></td>
            <td>${remitente.Nombre || '-'}</td>
            <td>${remitente.Remitente || '-'}</td>
            <td>${remitente.ServidorSMTP ? remitente.ServidorSMTP + ':' + (remitente.Puerto || '') : '-'}</td>
            <td>${remitente.Usuario || '-'}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view" onclick="viewRemitente(${index})" title="Ver"><i class="fas fa-eye"></i></button>
                <button class="btn-icon btn-edit" onclick="editRemitente(${index})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon btn-delete" onclick="deleteRemitente(${index})" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateRemitenteCount() {
    const count = remitentesData.length;
    document.getElementById('remitenteCount').textContent = `${count} remitente${count !== 1 ? 's' : ''}`;
}

// Event Listeners
function setupEventListeners() {
    document.getElementById('addRemitenteBtn').addEventListener('click', openRemitenteModal);
    document.getElementById('closeRemitenteModal').addEventListener('click', closeRemitenteModal);
    document.getElementById('cancelRemitenteBtn').addEventListener('click', closeRemitenteModal);
    document.getElementById('remitenteForm').addEventListener('submit', submitRemitenteForm);
    document.getElementById('searchBox').addEventListener('keyup', filterRemitentes);
    
    // "Aplicar" button (Just creates/updates but keeps modal open? Or just submits?)
    // Usually "Aplicar" means save without closing.
    document.getElementById('applyRemitenteBtn').addEventListener('click', (e) => submitRemitenteForm(e, false));

    // Nav Buttons
    document.getElementById('navFirstBtn').addEventListener('click', () => navigateRecord('first'));
    document.getElementById('navPrevBtn').addEventListener('click', () => navigateRecord('prev'));
    document.getElementById('navNextBtn').addEventListener('click', () => navigateRecord('next'));
    document.getElementById('navLastBtn').addEventListener('click', () => navigateRecord('last'));

    window.addEventListener('click', (event) => {
        const modal = document.getElementById('remitenteModal');
        if (event.target === modal) {
            closeRemitenteModal();
        }
    });

    setupBulkDelete();
}

// Filtrar
function filterRemitentes() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    
    const filtered = remitentesData.filter(item => {
        const nombre = (item.Nombre || '').toLowerCase();
        const remitente = (item.Remitente || '').toLowerCase();
        return nombre.includes(searchTerm) || remitente.includes(searchTerm);
    });

    renderRemitentesTable(filtered);
}

// Modal Logic
function openRemitenteModal() {
    editingRemitenteId = null;
    currentRemitenteIndex = -1;
    document.getElementById('modalTitle').textContent = 'Añadir remitente...';
    document.getElementById('remitenteForm').reset();
    document.getElementById('puerto').value = 25; // Default logic
    
    setReadOnly(false);
    updateNavButtons();
    document.getElementById('remitenteModal').style.display = 'block';
}

function closeRemitenteModal() {
    document.getElementById('remitenteModal').style.display = 'none';
    editingRemitenteId = null;
    currentRemitenteIndex = -1;
}

function setReadOnly(isReadOnly) {
    const inputs = document.querySelectorAll('#remitenteForm input, #remitenteForm select');
    inputs.forEach(input => {
        if (input.type !== 'hidden') {
            input.readOnly = isReadOnly;
            if (input.tagName === 'SELECT') input.disabled = isReadOnly;
        }
    });
    
    const submitBtn = document.getElementById('saveRemitenteBtn');
    const applyBtn = document.getElementById('applyRemitenteBtn');
    if (submitBtn) submitBtn.style.display = isReadOnly ? 'none' : 'inline-block';
    if (applyBtn) applyBtn.style.display = isReadOnly ? 'none' : 'inline-block';
}

// Navigation
let currentRemitenteIndex = -1;

function updateNavButtons() {
    const prevBtn = document.getElementById('navPrevBtn');
    const nextBtn = document.getElementById('navNextBtn');
    const firstBtn = document.getElementById('navFirstBtn');
    const lastBtn = document.getElementById('navLastBtn');
    
    if (currentRemitenteIndex === -1) {
        if(prevBtn) prevBtn.disabled = true;
        if(nextBtn) nextBtn.disabled = true;
        if(firstBtn) firstBtn.disabled = true;
        if(lastBtn) lastBtn.disabled = true;
        return;
    }
    
    if(prevBtn) prevBtn.disabled = (currentRemitenteIndex <= 0);
    if(firstBtn) firstBtn.disabled = (currentRemitenteIndex <= 0);
    if(nextBtn) nextBtn.disabled = (currentRemitenteIndex >= remitentesData.length - 1);
    if(lastBtn) lastBtn.disabled = (currentRemitenteIndex >= remitentesData.length - 1);
}

function navigateRecord(direction) {
    if (currentRemitenteIndex === -1) return;
    
    let newIndex = currentRemitenteIndex;
    if (direction === 'first') newIndex = 0;
    if (direction === 'prev') newIndex = currentRemitenteIndex - 1;
    if (direction === 'next') newIndex = currentRemitenteIndex + 1;
    if (direction === 'last') newIndex = remitentesData.length - 1;
    
    if (newIndex >= 0 && newIndex < remitentesData.length) {
        const isViewMode = document.getElementById('saveRemitenteBtn').style.display === 'none';
        if (isViewMode) {
            viewRemitente(newIndex);
        } else {
            editRemitente(newIndex);
        }
    }
}

// View
function viewRemitente(index) {
    currentRemitenteIndex = index;
    const item = remitentesData[index];
    populateForm(item);
    document.getElementById('modalTitle').textContent = 'Ver Remitente';
    setReadOnly(true);
    updateNavButtons();
    document.getElementById('remitenteModal').style.display = 'block';
}

// Edit
function editRemitente(index) {
    currentRemitenteIndex = index;
    const item = remitentesData[index];
    editingRemitenteId = item.IDRemitentes;
    
    populateForm(item);
    document.getElementById('modalTitle').textContent = 'Modificar remitente...';
    setReadOnly(false);
    updateNavButtons();
    document.getElementById('remitenteModal').style.display = 'block';
}

function populateForm(item) {
    document.getElementById('remitenteId').value = item.IDRemitentes || '';
    document.getElementById('nombre').value = item.Nombre || '';
    document.getElementById('remitente').value = item.Remitente || '';
    document.getElementById('usuario').value = item.Usuario || '';
    document.getElementById('password').value = item.Password || '';
    document.getElementById('servidorSMTP').value = item.ServidorSMTP || '';
    document.getElementById('puerto').value = item.Puerto || '';
    document.getElementById('autenticacion').value = item.Autenticacion || '0';
}

// Submit
async function submitRemitenteForm(e, closeOnSave = true) {
    e.preventDefault();

    const formData = new FormData(document.getElementById('remitenteForm'));
    const dataObj = Object.fromEntries(formData);
    
    // Clean empty
    Object.keys(dataObj).forEach(key => {
        if (dataObj[key] === '') dataObj[key] = null;
    });

    // Fix Autenticacion if not selected (should default to 0 if null, but select usually has value)
    if (!dataObj.Autenticacion) dataObj.Autenticacion = 0;

    // Validar Nombre Único
    const nombreNormalizado = (dataObj.Nombre || '').trim().toLowerCase();
    const nombreDuplicado = remitentesData.some(item => {
        const iNombre = (item.Nombre || '').trim().toLowerCase();
        // Si estamos editando, ignorar el propio registro
        if (editingRemitenteId && item.IDRemitentes == editingRemitenteId) return false;
        return iNombre === nombreNormalizado;
    });

    if (nombreDuplicado) {
        showAlert('El nombre del remitente ya existe. Por favor, elija otro.', 'warning');
        return;
    }

    try {
        if (editingRemitenteId) {
            const response = await fetch(`/api/remitentes/${editingRemitenteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataObj)
            });
            const resData = await response.json();
            
            if (response.ok) {
                if (closeOnSave) closeRemitenteModal();
                loadRemitentesData();
                showAlert('Remitente actualizado correctamente', 'success');
            } else {
                showAlert('Error al actualizar: ' + (resData.error || 'Unknown'), 'error');
            }
        } else {
            const response = await fetch('/api/remitentes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataObj)
            });
            const resData = await response.json();
            
            if (response.ok) {
                if (closeOnSave) closeRemitenteModal();
                loadRemitentesData();
                showAlert('Remitente creado correctamente', 'success');
            } else {
                showAlert('Error al crear: ' + (resData.error || 'Unknown'), 'error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación', 'error');
    }
}

// Delete
async function deleteRemitente(index) {
    const item = remitentesData[index];
    if (!await showConfirm(`¿Eliminar remitente "${item.Nombre}"?`)) return;

    try {
        const response = await fetch(`/api/remitentes/${item.IDRemitentes}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showAlert('Remitente eliminado', 'success');
            loadRemitentesData();
        } else {
            const data = await response.json().catch(() => ({}));
            showAlert(data.error || 'Error al eliminar', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al eliminar', 'error');
    }
}

// Bulk Delete
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
    const selectedBoxes = document.querySelectorAll('.row-checkbox:checked');
    const count = selectedBoxes.length;
    
    if (bulkDeleteBtn) {
        bulkDeleteBtn.style.display = count > 0 ? 'inline-block' : 'none';
        bulkDeleteBtn.innerHTML = `<i class="fas fa-trash"></i> Eliminar (${count})`;
    }
}

async function deleteSelected() {
    const selectedBoxes = document.querySelectorAll('.row-checkbox:checked');
    const ids = Array.from(selectedBoxes).map(cb => cb.closest('tr').dataset.id);

    if (ids.length === 0) return;
    if (!await showConfirm(`¿Eliminar ${ids.length} remitentes?`)) return;

    try {
        // Use generic bulk delete logic if server supports it, otherwise parallel delete.
        
        const response = await fetch('/api/remitentes/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        
        const resData = await response.json();

        if (response.ok) {
            document.getElementById('selectAll').checked = false;
            updateBulkDeleteButton();
            loadRemitentesData();
            showAlert(`Eliminados ${resData.affectedRows || ids.length} remitentes`, 'success');
        } else {
            showAlert('Error al eliminar selección: ' + (resData.error || 'Unknown'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al eliminar', 'error');
    }
}
