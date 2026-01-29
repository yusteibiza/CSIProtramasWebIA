// Gestión de Aplicaciones - Página Independiente
let aplicacionesData = [];
let editingAplicacionId = null;

// Inicializar la página
document.addEventListener('DOMContentLoaded', () => {
    loadAplicacionesData();
    setupEventListeners();
// initAccordion(); (Eliminado para evitar duplicidad)
});

// Cargar datos de aplicaciones
async function loadAplicacionesData() {
    try {
        const response = await fetch('/api/aplicaciones');
        const data = await response.json();
        aplicacionesData = data;
        renderAplicacionesTable(data);
        updateAplicacionCount();
    } catch (error) {
        console.error('Error al cargar aplicaciones:', error);
        showAlert('Error al cargar aplicaciones', 'error');
    }
}

// Renderizar tabla de aplicaciones
function renderAplicacionesTable(data) {
    const tbody = document.getElementById('aplicacionesTableBody');
    tbody.innerHTML = '';

    data.forEach((aplicacion, index) => {
        const row = document.createElement('tr');
        row.dataset.id = aplicacion.ID; // Guardar ID para borrado masivo
        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" onchange="updateBulkDeleteButton()"></td>
            <td>${aplicacion.Codigo || '-'}</td>
            <td>${aplicacion.Nombre || '-'}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view" onclick="viewAplicacion(${index})" title="Ver"><i class="fas fa-eye"></i></button>
                <button class="btn-icon btn-edit" onclick="editAplicacion(${index})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon btn-delete" onclick="deleteAplicacion(${index})" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Actualizar contador de aplicaciones
function updateAplicacionCount() {
    const count = aplicacionesData.length;
    document.getElementById('aplicacionCount').textContent = count === 1 ? `${count} aplicación` : `${count} aplicaciones`;
}

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('addAplicacionBtn').addEventListener('click', openAplicacionModal);
    document.getElementById('closeAplicacionModal').addEventListener('click', closeAplicacionModal);
    document.getElementById('cancelAplicacionBtn').addEventListener('click', closeAplicacionModal);
    document.getElementById('aplicacionForm').addEventListener('submit', submitAplicacionForm);
    document.getElementById('searchBox').addEventListener('keyup', filterAplicaciones);

    // Nav Buttons
    document.getElementById('navFirstBtn').addEventListener('click', () => navigateRecord('first'));
    document.getElementById('navPrevBtn').addEventListener('click', () => navigateRecord('prev'));
    document.getElementById('navNextBtn').addEventListener('click', () => navigateRecord('next'));
    document.getElementById('navLastBtn').addEventListener('click', () => navigateRecord('last'));

    window.addEventListener('click', (event) => {
        const modal = document.getElementById('aplicacionModal');
        if (event.target === modal) {
            closeAplicacionModal();
        }
    });

    setupBulkDelete();
}

// Filtrar aplicaciones por búsqueda
function filterAplicaciones() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    
    const filtered = aplicacionesData.filter(aplicacion => {
        const codigo = (aplicacion.Codigo || '').toLowerCase();
        const nombre = (aplicacion.Nombre || '').toLowerCase();
        
        return codigo.includes(searchTerm) || nombre.includes(searchTerm);
    });

    renderAplicacionesTable(filtered);
}

// Abrir modal para nueva aplicación
function openAplicacionModal() {
    editingAplicacionId = null;
    currentAplicacionIndex = -1; // Reset index
    document.getElementById('modalTitle').textContent = 'Nueva Aplicación';
    document.getElementById('aplicacionForm').reset();
    document.getElementById('codigo').readOnly = false;
    document.getElementById('nombre').readOnly = false;
    document.querySelector('#aplicacionForm button[type="submit"]').style.display = 'block';
    
    updateNavButtons();
    document.getElementById('aplicacionModal').style.display = 'block';
}

// Cerrar modal
function closeAplicacionModal() {
    document.getElementById('aplicacionModal').style.display = 'none';
    editingAplicacionId = null;
    currentAplicacionIndex = -1;
}

// Logic for Navigation Buttons
let currentAplicacionIndex = -1;

function updateNavButtons() {
    const prevBtn = document.getElementById('navPrevBtn');
    const nextBtn = document.getElementById('navNextBtn');
    const firstBtn = document.getElementById('navFirstBtn');
    const lastBtn = document.getElementById('navLastBtn');
    
    if (currentAplicacionIndex === -1) {
        if(prevBtn) prevBtn.disabled = true;
        if(nextBtn) nextBtn.disabled = true;
        if(firstBtn) firstBtn.disabled = true;
        if(lastBtn) lastBtn.disabled = true;
        return;
    }
    
    if(prevBtn) prevBtn.disabled = (currentAplicacionIndex <= 0);
    if(firstBtn) firstBtn.disabled = (currentAplicacionIndex <= 0);
    if(nextBtn) nextBtn.disabled = (currentAplicacionIndex >= aplicacionesData.length - 1);
    if(lastBtn) lastBtn.disabled = (currentAplicacionIndex >= aplicacionesData.length - 1);
}

function navigateRecord(direction) {
    if (currentAplicacionIndex === -1) return;
    
    let newIndex = currentAplicacionIndex;
    if (direction === 'first') newIndex = 0;
    if (direction === 'prev') newIndex = currentAplicacionIndex - 1;
    if (direction === 'next') newIndex = currentAplicacionIndex + 1;
    if (direction === 'last') newIndex = aplicacionesData.length - 1;
    
    if (newIndex >= 0 && newIndex < aplicacionesData.length) {
        const isViewMode = document.querySelector('#aplicacionForm button[type="submit"]').style.display === 'none';
        
        if (isViewMode) {
            viewAplicacion(newIndex);
        } else {
            editAplicacion(newIndex);
        }
    }
}

// Ver aplicación (Read-only)
function viewAplicacion(index) {
    currentAplicacionIndex = index;
    const aplicacion = aplicacionesData[index];
    document.getElementById('modalTitle').textContent = 'Ver Aplicación';
    
    document.getElementById('codigo').value = aplicacion.Codigo || '';
    document.getElementById('codigo').readOnly = true;
    
    document.getElementById('nombre').value = aplicacion.Nombre || '';
    document.getElementById('nombre').readOnly = true;
    
    // Hide submit button
    document.querySelector('#aplicacionForm button[type="submit"]').style.display = 'none';
    
    updateNavButtons();
    document.getElementById('aplicacionModal').style.display = 'block';
}

// Editar aplicación
function editAplicacion(index) {
    currentAplicacionIndex = index;
    const aplicacion = aplicacionesData[index];
    editingAplicacionId = aplicacion.ID;
    
    document.getElementById('modalTitle').textContent = 'Editar Aplicación';
    
    document.getElementById('codigo').readOnly = true;
    document.getElementById('codigo').value = aplicacion.Codigo || '';
    
    document.getElementById('nombre').readOnly = false;
    document.getElementById('nombre').value = aplicacion.Nombre || '';
    
    // Ensure submit button is visible
    document.querySelector('#aplicacionForm button[type="submit"]').style.display = 'block';
    
    updateNavButtons();
    document.getElementById('aplicacionModal').style.display = 'block';
}

// Guardar/actualizar aplicación
async function submitAplicacionForm(e) {
    e.preventDefault();

    const formData = new FormData(document.getElementById('aplicacionForm'));
    const aplicacion = Object.fromEntries(formData);

    Object.keys(aplicacion).forEach(key => {
        if (aplicacion[key] === '') {
            aplicacion[key] = null;
        }
    });

    try {
        if (editingAplicacionId) {
            const response = await fetch(`/api/aplicaciones/${editingAplicacionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(aplicacion)
            });

            const data = await response.json();
            
            if (response.ok) {
                closeAplicacionModal();
                loadAplicacionesData();
                showAlert('Aplicación actualizada correctamente', 'success');
            } else {
                showAlert('Error al actualizar: ' + (data.error || 'Error desconocido'), 'error');
            }
        } else {
            // Validar que el código no exista
            const codigoExistente = aplicacionesData.some(app => app.Codigo === aplicacion.Codigo);
            if (codigoExistente) {
                showAlert('El código de aplicación ya existe', 'warning');
                return;
            }

            const response = await fetch('/api/aplicaciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(aplicacion)
            });

            const data = await response.json();
            
            if (response.ok) {
                closeAplicacionModal();
                loadAplicacionesData();
                showAlert('Aplicación creada correctamente', 'success');
            } else {
                showAlert('Error al crear: ' + (data.error || 'Error desconocido'), 'error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación', 'error');
    }
}

// Eliminar aplicación
async function deleteAplicacion(index) {
    const aplicacion = aplicacionesData[index];
    
    if (!await showConfirm(`¿Eliminar aplicación "${aplicacion.Nombre}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/aplicaciones/${aplicacion.ID}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showAlert('Aplicación eliminada correctamente', 'success');
            loadAplicacionesData();
        } else {
            // Read specific error from backend (e.g., Integrity constraint)
            const result = await response.json();
            showAlert(result.error || 'Error al eliminar aplicación', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al eliminar aplicación', 'error');
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
        const response = await fetch('/api/aplicaciones/bulk-delete', {
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
            loadAplicacionesData();
        } else {
            showAlert('Error al eliminar registros: ' + (data.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación de eliminación masiva', 'error');
    }
}
