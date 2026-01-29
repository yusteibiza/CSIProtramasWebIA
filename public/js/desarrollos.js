// Gestión de Desarrollos - Página Independiente
let desarrollosData = [];
let editingDesarrolloId = null;

// Inicializar la página
document.addEventListener('DOMContentLoaded', () => {
    loadDesarrollosData();
    setupEventListeners();
// initAccordion(); (Eliminado para evitar duplicidad)
});

// Cargar datos de desarrollos
async function loadDesarrollosData() {
    try {
        const response = await fetch('/api/desarrollos');
        const data = await response.json();
        desarrollosData = data;
        renderDesarrollosTable(data);
        updateDesarrolloCount();
    } catch (error) {
        console.error('Error al cargar desarrollos:', error);
        showAlert('Error al cargar desarrollos', 'error');
    }
}

// Renderizar tabla de desarrollos
function renderDesarrollosTable(data) {
    const tbody = document.getElementById('desarrollosTableBody');
    tbody.innerHTML = '';

    data.forEach((desarrollo, index) => {
        const row = document.createElement('tr');
        row.dataset.id = desarrollo.ID; // Guardar ID para borrado masivo
        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" onchange="updateBulkDeleteButton()"></td>
            <td>${desarrollo.Codigo || '-'}</td>
            <td>${desarrollo.Nombre || '-'}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view" onclick="viewDesarrollo(${index})" title="Ver"><i class="fas fa-eye"></i></button>
                <button class="btn-icon btn-edit" onclick="editDesarrollo(${index})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon btn-delete" onclick="deleteDesarrollo(${index})" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Actualizar contador de desarrollos
function updateDesarrolloCount() {
    const count = desarrollosData.length;
    document.getElementById('desarrolloCount').textContent = `${count} desarrollo${count !== 1 ? 's' : ''}`;
}

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('addDesarrolloBtn').addEventListener('click', openDesarrolloModal);
    document.getElementById('closeDesarrolloModal').addEventListener('click', closeDesarrolloModal);
    document.getElementById('cancelDesarrolloBtn').addEventListener('click', closeDesarrolloModal);
    document.getElementById('desarrolloForm').addEventListener('submit', submitDesarrolloForm);
    document.getElementById('searchBox').addEventListener('keyup', filterDesarrollos);

    // Nav Buttons
    document.getElementById('navFirstBtn').addEventListener('click', () => navigateRecord('first'));
    document.getElementById('navPrevBtn').addEventListener('click', () => navigateRecord('prev'));
    document.getElementById('navNextBtn').addEventListener('click', () => navigateRecord('next'));
    document.getElementById('navLastBtn').addEventListener('click', () => navigateRecord('last'));

    window.addEventListener('click', (event) => {
        const modal = document.getElementById('desarrolloModal');
        if (event.target === modal) {
            closeDesarrolloModal();
        }
    });

    setupBulkDelete();
}

// Filtrar desarrollos por búsqueda
function filterDesarrollos() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    
    const filtered = desarrollosData.filter(desarrollo => {
        const codigo = (desarrollo.Codigo || '').toLowerCase();
        const nombre = (desarrollo.Nombre || '').toLowerCase();
        
        return codigo.includes(searchTerm) || nombre.includes(searchTerm);
    });

    renderDesarrollosTable(filtered);
}

// Abrir modal para nuevo desarrollo
function openDesarrolloModal() {
    editingDesarrolloId = null;
    currentDesarrolloIndex = -1; // Reset index
    document.getElementById('modalTitle').textContent = 'Nuevo Desarrollo';
    document.getElementById('desarrolloForm').reset();
    document.getElementById('codigo').readOnly = false;
    document.getElementById('nombre').readOnly = false;
    document.querySelector('#desarrolloForm button[type="submit"]').style.display = 'block';
    
    updateNavButtons();
    document.getElementById('desarrolloModal').style.display = 'block';
}

// Cerrar modal
function closeDesarrolloModal() {
    document.getElementById('desarrolloModal').style.display = 'none';
    editingDesarrolloId = null;
    currentDesarrolloIndex = -1;
}

// Logic for Navigation Buttons
let currentDesarrolloIndex = -1;

function updateNavButtons() {
    const prevBtn = document.getElementById('navPrevBtn');
    const nextBtn = document.getElementById('navNextBtn');
    const firstBtn = document.getElementById('navFirstBtn');
    const lastBtn = document.getElementById('navLastBtn');
    
    if (currentDesarrolloIndex === -1) {
        if(prevBtn) prevBtn.disabled = true;
        if(nextBtn) nextBtn.disabled = true;
        if(firstBtn) firstBtn.disabled = true;
        if(lastBtn) lastBtn.disabled = true;
        return;
    }
    
    if(prevBtn) prevBtn.disabled = (currentDesarrolloIndex <= 0);
    if(firstBtn) firstBtn.disabled = (currentDesarrolloIndex <= 0);
    if(nextBtn) nextBtn.disabled = (currentDesarrolloIndex >= desarrollosData.length - 1);
    if(lastBtn) lastBtn.disabled = (currentDesarrolloIndex >= desarrollosData.length - 1);
}

function navigateRecord(direction) {
    if (currentDesarrolloIndex === -1) return;
    
    let newIndex = currentDesarrolloIndex;
    if (direction === 'first') newIndex = 0;
    if (direction === 'prev') newIndex = currentDesarrolloIndex - 1;
    if (direction === 'next') newIndex = currentDesarrolloIndex + 1;
    if (direction === 'last') newIndex = desarrollosData.length - 1;
    
    if (newIndex >= 0 && newIndex < desarrollosData.length) {
        const isViewMode = document.querySelector('#desarrolloForm button[type="submit"]').style.display === 'none';
        
        if (isViewMode) {
            viewDesarrollo(newIndex);
        } else {
            editDesarrollo(newIndex);
        }
    }
}

// Ver desarrollo (Read-only)
function viewDesarrollo(index) {
    currentDesarrolloIndex = index;
    const desarrollo = desarrollosData[index];
    document.getElementById('modalTitle').textContent = 'Ver Desarrollo';
    
    document.getElementById('codigo').value = desarrollo.Codigo || '';
    document.getElementById('codigo').readOnly = true;
    
    document.getElementById('nombre').value = desarrollo.Nombre || '';
    document.getElementById('nombre').readOnly = true;
    
    // Hide submit button
    document.querySelector('#desarrolloForm button[type="submit"]').style.display = 'none';
    
    updateNavButtons();
    document.getElementById('desarrolloModal').style.display = 'block';
}

// Editar desarrollo
function editDesarrollo(index) {
    currentDesarrolloIndex = index;
    const desarrollo = desarrollosData[index];
    editingDesarrolloId = desarrollo.ID;
    
    document.getElementById('modalTitle').textContent = 'Editar Desarrollo';
    
    document.getElementById('codigo').readOnly = true;
    document.getElementById('codigo').value = desarrollo.Codigo || '';
    
    document.getElementById('nombre').readOnly = false;
    document.getElementById('nombre').value = desarrollo.Nombre || '';
    
    // Ensure submit button is visible
    document.querySelector('#desarrolloForm button[type="submit"]').style.display = 'block';
    
    updateNavButtons();
    document.getElementById('desarrolloModal').style.display = 'block';
}

// Guardar/actualizar desarrollo
async function submitDesarrolloForm(e) {
    e.preventDefault();

    const formData = new FormData(document.getElementById('desarrolloForm'));
    const desarrollo = Object.fromEntries(formData);

    Object.keys(desarrollo).forEach(key => {
        if (desarrollo[key] === '') {
            desarrollo[key] = null;
        }
    });

    try {
        if (editingDesarrolloId) {
            const response = await fetch(`/api/desarrollos/${editingDesarrolloId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(desarrollo)
            });

            const data = await response.json();
            
            if (response.ok) {
                closeDesarrolloModal();
                loadDesarrollosData();
                showAlert('Desarrollo actualizado correctamente', 'success');
            } else {
                showAlert('Error al actualizar: ' + (data.error || 'Error desconocido'), 'error');
            }
        } else {
            // Validar que el código no exista
            const codigoExistente = desarrollosData.some(dev => dev.Codigo === desarrollo.Codigo);
            if (codigoExistente) {
                showAlert('El código de desarrollo ya existe', 'warning');
                return;
            }

            const response = await fetch('/api/desarrollos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(desarrollo)
            });

            const data = await response.json();
            
            if (response.ok) {
                closeDesarrolloModal();
                loadDesarrollosData();
                showAlert('Desarrollo creado correctamente', 'success');
            } else {
                showAlert('Error al crear: ' + (data.error || 'Error desconocido'), 'error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación', 'error');
    }
}

// Eliminar desarrollo
async function deleteDesarrollo(index) {
    const desarrollo = desarrollosData[index];
    
    if (!await showConfirm(`¿Eliminar desarrollo "${desarrollo.Nombre}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/desarrollos/${desarrollo.ID}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showAlert('Desarrollo eliminado correctamente', 'success');
            loadDesarrollosData();
        } else {
            const data = await response.json().catch(() => ({}));
            showAlert(data.error || 'Error al eliminar desarrollo', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al eliminar desarrollo', 'error');
    }
}


// (Funciones de acordeón eliminadas para usar las de main.js)

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
        const response = await fetch('/api/desarrollos/bulk-delete', {
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
            loadDesarrollosData();
        } else {
            showAlert('Error al eliminar registros: ' + (data.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación de eliminación masiva', 'error');
    }
}
