// Gestión de Tipos de Clientes - Página Independiente
let tiposclientesData = [];
let editingTipoclienteId = null;

// Inicializar la página
document.addEventListener('DOMContentLoaded', () => {
    loadTiposclientesData();
    setupEventListeners();
});

// Cargar datos de tipos de clientes
async function loadTiposclientesData() {
    try {
        const response = await fetch('/api/tiposclientes');
        const data = await response.json();
        tiposclientesData = data;
        renderTiposclientesTable(data);
        updateTipoclienteCount();
    } catch (error) {
        console.error('Error al cargar tipos de clientes:', error);
        showAlert('Error al cargar tipos de clientes', 'error');
    }
}

// Renderizar tabla de tipos de clientes
function renderTiposclientesTable(data) {
    const tbody = document.getElementById('tiposclientesTableBody');
    tbody.innerHTML = '';

    data.forEach((tipo, index) => {
        const globalIndex = tiposclientesData.findIndex(t => t.ID === tipo.ID);
        const row = document.createElement('tr');
        row.dataset.id = tipo.ID; // Guardar ID para borrado masivo
        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" onchange="updateBulkDeleteButton()"></td>
            <td>${tipo.Codigo || '-'}</td>
            <td>${tipo.Nombre || '-'}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view" onclick="viewTipocliente(${globalIndex})" title="Ver"><i class="fas fa-eye"></i></button>
                <button class="btn-icon btn-edit" onclick="editTipocliente(${globalIndex})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon btn-delete" onclick="deleteTipocliente(${globalIndex})" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Actualizar contador de tipos
function updateTipoclienteCount() {
    const count = tiposclientesData.length;
    document.getElementById('tipoclienteCount').textContent = `${count} tipo${count !== 1 ? 's' : ''}`;
}

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('addTipoclienteBtn').addEventListener('click', openTipoclienteModal);
    document.getElementById('closeTipoclienteModal').addEventListener('click', closeTipoclienteModal);
    document.getElementById('cancelTipoclienteBtn').addEventListener('click', closeTipoclienteModal);
    document.getElementById('tipoclienteForm').addEventListener('submit', submitTipoclienteForm);
    document.getElementById('searchBox').addEventListener('keyup', filterTiposclientes);

    window.addEventListener('click', (event) => {
        const modal = document.getElementById('tipoclienteModal');
        if (event.target === modal) {
            closeTipoclienteModal();
        }
    });

    setupBulkDelete();
    
    // Modal Navigation
    const navFirst = document.getElementById('navFirstBtn');
    const navPrev = document.getElementById('navPrevBtn');
    const navNext = document.getElementById('navNextBtn');
    const navLast = document.getElementById('navLastBtn');

    if (navFirst) navFirst.addEventListener('click', (e) => { e.preventDefault(); navigateModal('first'); });
    if (navPrev) navPrev.addEventListener('click', (e) => { e.preventDefault(); navigateModal('prev'); });
    if (navNext) navNext.addEventListener('click', (e) => { e.preventDefault(); navigateModal('next'); });
    if (navLast) navLast.addEventListener('click', (e) => { e.preventDefault(); navigateModal('last'); });
}

let currentModalIndex = -1;


function navigateModal(direction) {
    console.log('Navigating:', direction, 'Current:', currentModalIndex);
    if (currentModalIndex === -1) return;
    
    let newIndex = currentModalIndex;
    const total = tiposclientesData.length;
    
    switch(direction) {
        case 'first': newIndex = 0; break;
        case 'prev': newIndex = Math.max(0, currentModalIndex - 1); break;
        case 'next': newIndex = Math.min(total - 1, currentModalIndex + 1); break;
        case 'last': newIndex = total - 1; break;
    }
    

    console.log('New Index:', newIndex);
    
    if (newIndex !== currentModalIndex) {
        // Detect if we are currently editing (submit button visible)
        const submitBtn = document.querySelector('#tipoclienteForm button[type="submit"]');
        const isEditing = submitBtn && submitBtn.style.display !== 'none';
        
        if (isEditing) {
            editTipocliente(newIndex);
        } else {
            viewTipocliente(newIndex);
        }
    }
    updateModalNavigationState();
}

function updateModalNavigationState() {
    const total = tiposclientesData.length;
    const index = currentModalIndex;
    
    document.getElementById('navFirstBtn').disabled = index <= 0;
    document.getElementById('navPrevBtn').disabled = index <= 0;
    document.getElementById('navNextBtn').disabled = index >= total - 1;
    document.getElementById('navLastBtn').disabled = index >= total - 1;
}

// Filtrar tipos de clientes por búsqueda
function filterTiposclientes() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    
    const filtered = tiposclientesData.filter(tipo => {
        const codigo = (tipo.Codigo || '').toLowerCase();
        const nombre = (tipo.Nombre || '').toLowerCase();
        
        return codigo.includes(searchTerm) || nombre.includes(searchTerm);
    });

    renderTiposclientesTable(filtered);
}

// Abrir modal para nuevo tipo
function openTipoclienteModal() {
    editingTipoclienteId = null;
    currentModalIndex = -1;
    document.getElementById('modalTitle').textContent = 'Nuevo Tipo de Cliente';
    document.getElementById('tipoclienteForm').reset();
    document.getElementById('codigo').readOnly = false;
    document.getElementById('nombre').readOnly = false;
    document.querySelector('#tipoclienteForm button[type="submit"]').style.display = 'block';
    
    document.getElementById('tipoclienteModal').style.display = 'block';
    updateModalNavigationState();
}

// Cerrar modal
function closeTipoclienteModal() {
    document.getElementById('tipoclienteModal').style.display = 'none';
    editingTipoclienteId = null;
}

// Ver tipo (Read-only)
function viewTipocliente(index) {
    if (index < 0 || index >= tiposclientesData.length) return;
    currentModalIndex = index;
    const tipo = tiposclientesData[index];
    
    // Clear editing ID just in case
    editingTipoclienteId = null;
    
    document.getElementById('modalTitle').textContent = 'Ver Tipo de Cliente';
    
    document.getElementById('codigo').value = tipo.Codigo || '';
    document.getElementById('codigo').readOnly = true;
    
    document.getElementById('nombre').value = tipo.Nombre || '';
    document.getElementById('nombre').readOnly = true;
    
    // Hide submit button
    document.querySelector('#tipoclienteForm button[type="submit"]').style.display = 'none';
    
    document.getElementById('tipoclienteModal').style.display = 'block';
    updateModalNavigationState();
}

// Editar tipo de cliente
function editTipocliente(index) {
    if (index < 0 || index >= tiposclientesData.length) return;
    currentModalIndex = index;
    const tipo = tiposclientesData[index];
    editingTipoclienteId = tipo.ID;
    
    document.getElementById('modalTitle').textContent = 'Editar Tipo de Cliente';
    
    document.getElementById('codigo').readOnly = true;
    document.getElementById('codigo').value = tipo.Codigo || '';
    
    document.getElementById('nombre').readOnly = false;
    document.getElementById('nombre').value = tipo.Nombre || '';
    
    // Ensure submit button is visible
    document.querySelector('#tipoclienteForm button[type="submit"]').style.display = 'block';
    
    document.getElementById('tipoclienteModal').style.display = 'block';
    updateModalNavigationState();
}

// Guardar/actualizar tipo de cliente
async function submitTipoclienteForm(e) {
    e.preventDefault();

    const formData = new FormData(document.getElementById('tipoclienteForm'));
    const tipo = Object.fromEntries(formData);

    Object.keys(tipo).forEach(key => {
        if (tipo[key] === '') {
            tipo[key] = null;
        }
    });

    try {
        if (editingTipoclienteId) {
            const response = await fetch(`/api/tiposclientes/${editingTipoclienteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tipo)
            });

            const data = await response.json();
            
            if (response.ok) {
                closeTipoclienteModal();
                loadTiposclientesData();
                showAlert('Tipo de cliente actualizado correctamente', 'success');
            } else {
                showAlert('Error al actualizar: ' + (data.error || 'Error desconocido'), 'error');
            }
        } else {
            // Validar que el código no exista
            const codigoExistente = tiposclientesData.some(tc => tc.Codigo === tipo.Codigo);
            if (codigoExistente) {
                showAlert('El código de tipo de cliente ya existe', 'warning');
                return;
            }

            const response = await fetch('/api/tiposclientes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tipo)
            });

            const data = await response.json();
            
            if (response.ok) {
                closeTipoclienteModal();
                loadTiposclientesData();
                showAlert('Tipo de cliente creado correctamente', 'success');
            } else {
                showAlert('Error al crear: ' + (data.error || 'Error desconocido'), 'error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación', 'error');
    }
}

// Eliminar tipo de cliente
async function deleteTipocliente(index) {
    const tipo = tiposclientesData[index];
    
    if (!await showConfirm(`¿Eliminar tipo "${tipo.Nombre}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/tiposclientes/${tipo.ID}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showAlert('Tipo de cliente eliminado correctamente', 'success');
            loadTiposclientesData();
        } else {
            const result = await response.json();
            showAlert(result.error || 'Error al eliminar tipo', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al eliminar tipo', 'error');
    }
}



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
    const selectedBoxes = document.querySelectorAll('.row-checkbox:checked');
    const selectedCount = selectedBoxes.length;
    
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
        const response = await fetch('/api/tiposclientes/bulk-delete', {
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
            
            showAlert(`Se han eliminado ${data.affectedRows || ids.length} registros.`, 'success');
            
            // Recargar datos
            loadTiposclientesData();
        } else {
            showAlert('Error al eliminar registros: ' + (data.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación de eliminación masiva', 'error');
    }
}
