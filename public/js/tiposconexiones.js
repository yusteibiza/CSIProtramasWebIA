// Gestión de Tipos de Conexión - Página Independiente
let tiposconexionesData = [];
let editingTipoconexionId = null;

// Inicializar la página
document.addEventListener('DOMContentLoaded', () => {
    loadTiposconexionesData();
    setupEventListeners();
});

// Cargar datos de tipos de conexión
async function loadTiposconexionesData() {
    try {
        const response = await fetch('/api/tiposconexiones');
        const data = await response.json();
        tiposconexionesData = data;
        renderTiposconexionesTable(data);
        updateTipoconexionCount();
    } catch (error) {
        console.error('Error al cargar tipos de conexión:', error);
        showAlert('Error al cargar tipos de conexión', 'error');
    }
}

// Renderizar tabla de tipos de conexión
function renderTiposconexionesTable(data) {
    const tbody = document.getElementById('tiposconexionesTableBody');
    tbody.innerHTML = '';

    data.forEach((tipo, index) => {
        const globalIndex = tiposconexionesData.findIndex(t => t.ID === tipo.ID);
        const row = document.createElement('tr');
        row.dataset.id = tipo.ID; // Guardar ID para borrado masivo
        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" onchange="updateBulkDeleteButton()"></td>
            <td>${tipo.Codigo || '-'}</td>
            <td>${tipo.Nombre || '-'}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view" onclick="viewTipoconexion(${globalIndex})" title="Ver"><i class="fas fa-eye"></i></button>
                <button class="btn-icon btn-edit" onclick="editTipoconexion(${globalIndex})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon btn-delete" onclick="deleteTipoconexion(${globalIndex})" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Actualizar contador de tipos
function updateTipoconexionCount() {
    const count = tiposconexionesData.length;
    document.getElementById('tipoconexionCount').textContent = `${count} tipo${count !== 1 ? 's' : ''}`;
}

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('addTipoconexionBtn').addEventListener('click', openTipoconexionModal);
    document.getElementById('closeTipoconexionModal').addEventListener('click', closeTipoconexionModal);
    document.getElementById('cancelTipoconexionBtn').addEventListener('click', closeTipoconexionModal);
    document.getElementById('tipoconexionForm').addEventListener('submit', submitTipoconexionForm);
    document.getElementById('searchBox').addEventListener('keyup', filterTiposconexiones);

    window.addEventListener('click', (event) => {
        const modal = document.getElementById('tipoconexionModal');
        if (event.target === modal) {
            closeTipoconexionModal();
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
    const total = tiposconexionesData.length;
    
    switch(direction) {
        case 'first': newIndex = 0; break;
        case 'prev': newIndex = Math.max(0, currentModalIndex - 1); break;
        case 'next': newIndex = Math.min(total - 1, currentModalIndex + 1); break;
        case 'last': newIndex = total - 1; break;
    }
    

    console.log('New Index:', newIndex);
    
    if (newIndex !== currentModalIndex) {
        // Detect if we are currently editing
        const submitBtn = document.querySelector('#tipoconexionForm button[type="submit"]');
        const isEditing = submitBtn && submitBtn.style.display !== 'none';
        
        if (isEditing) {
            editTipoconexion(newIndex);
        } else {
            viewTipoconexion(newIndex);
        }
    }
    updateModalNavigationState();
}

function updateModalNavigationState() {
    const total = tiposconexionesData.length;
    const index = currentModalIndex;
    
    document.getElementById('navFirstBtn').disabled = index <= 0;
    document.getElementById('navPrevBtn').disabled = index <= 0;
    document.getElementById('navNextBtn').disabled = index >= total - 1;
    document.getElementById('navLastBtn').disabled = index >= total - 1;
}

// Filtrar tipos de conexión por búsqueda
function filterTiposconexiones() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    
    const filtered = tiposconexionesData.filter(tipo => {
        const codigo = (tipo.Codigo || '').toLowerCase();
        const nombre = (tipo.Nombre || '').toLowerCase();
        
        return codigo.includes(searchTerm) || nombre.includes(searchTerm);
    });

    renderTiposconexionesTable(filtered);
}

// Abrir modal para nuevo tipo
function openTipoconexionModal() {
    editingTipoconexionId = null;
    currentModalIndex = -1;
    document.getElementById('modalTitle').textContent = 'Nuevo Tipo de Conexión';
    document.getElementById('tipoconexionForm').reset();
    document.getElementById('codigo').readOnly = false;
    document.getElementById('nombre').readOnly = false;
    document.querySelector('#tipoconexionForm button[type="submit"]').style.display = 'block';
    
    document.getElementById('tipoconexionModal').style.display = 'block';
    updateModalNavigationState();
}

// Cerrar modal
function closeTipoconexionModal() {
    document.getElementById('tipoconexionModal').style.display = 'none';
    editingTipoconexionId = null;
}

// Ver tipo (Read-only)
function viewTipoconexion(index) {
    if (index < 0 || index >= tiposconexionesData.length) return;
    currentModalIndex = index;
    const tipo = tiposconexionesData[index];
    
    // Clear editing ID
    editingTipoconexionId = null;

    document.getElementById('modalTitle').textContent = 'Ver Tipo de Conexión';
    
    document.getElementById('codigo').value = tipo.Codigo || '';
    document.getElementById('codigo').readOnly = true;
    
    document.getElementById('nombre').value = tipo.Nombre || '';
    document.getElementById('nombre').readOnly = true;
    
    // Hide submit button
    document.querySelector('#tipoconexionForm button[type="submit"]').style.display = 'none';
    
    document.getElementById('tipoconexionModal').style.display = 'block';
    updateModalNavigationState();
}

// Editar tipo de conexión
function editTipoconexion(index) {
    if (index < 0 || index >= tiposconexionesData.length) return;
    currentModalIndex = index;
    const tipo = tiposconexionesData[index];
    editingTipoconexionId = tipo.ID;
    
    document.getElementById('modalTitle').textContent = 'Editar Tipo de Conexión';
    
    document.getElementById('codigo').readOnly = true;
    document.getElementById('codigo').value = tipo.Codigo || '';
    
    document.getElementById('nombre').readOnly = false;
    document.getElementById('nombre').value = tipo.Nombre || '';
    
    // Ensure submit button is visible
    document.querySelector('#tipoconexionForm button[type="submit"]').style.display = 'block';
    
    document.getElementById('tipoconexionModal').style.display = 'block';
    updateModalNavigationState();
}

// Guardar/actualizar tipo de conexión
async function submitTipoconexionForm(e) {
    e.preventDefault();

    const formData = new FormData(document.getElementById('tipoconexionForm'));
    const tipo = Object.fromEntries(formData);

    Object.keys(tipo).forEach(key => {
        if (tipo[key] === '') {
            tipo[key] = null;
        }
    });

    try {
        if (editingTipoconexionId) {
            const response = await fetch(`/api/tiposconexiones/${editingTipoconexionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tipo)
            });

            const data = await response.json();
            
            if (response.ok) {
                closeTipoconexionModal();
                loadTiposconexionesData();
                showAlert('Tipo de conexión actualizado correctamente', 'success');
            } else {
                showAlert('Error al actualizar: ' + (data.error || 'Error desconocido'), 'error');
            }
        } else {
            // Validar que el código no exista
            const codigoExistente = tiposconexionesData.some(tc => tc.Codigo === tipo.Codigo);
            if (codigoExistente) {
                showAlert('El código de tipo de conexión ya existe', 'warning');
                return;
            }

            const response = await fetch('/api/tiposconexiones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tipo)
            });

            const data = await response.json();
            
            if (response.ok) {
                closeTipoconexionModal();
                loadTiposconexionesData();
                showAlert('Tipo de conexión creado correctamente', 'success');
            } else {
                showAlert('Error al crear: ' + (data.error || 'Error desconocido'), 'error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación', 'error');
    }
}

// Eliminar tipo de conexión
async function deleteTipoconexion(index) {
    const tipo = tiposconexionesData[index];
    
    if (!await showConfirm(`¿Eliminar tipo "${tipo.Nombre}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/tiposconexiones/${tipo.ID}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showAlert('Tipo de conexión eliminado correctamente', 'success');
            loadTiposconexionesData();
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
        const response = await fetch('/api/tiposconexiones/bulk-delete', {
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
            loadTiposconexionesData();
        } else {
            showAlert('Error al eliminar registros: ' + (data.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación de eliminación masiva', 'error');
    }
}
