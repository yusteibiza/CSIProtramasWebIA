// Gestión de Poblaciones - Página Independiente
let poblacionesData = [];
let editingPoblacionId = null;

// Inicializar la página
document.addEventListener('DOMContentLoaded', () => {
    loadPoblacionesData();
    setupEventListeners();
// initAccordion(); (Eliminado para evitar duplicidad)
});

// Cargar datos de poblaciones
async function loadPoblacionesData() {
    try {
        const response = await fetch('/api/poblaciones');
        const data = await response.json();
        poblacionesData = data;
        renderPoblacionesTable(data);
        updatePoblacionCount();
    } catch (error) {
        console.error('Error al cargar poblaciones:', error);
        showAlert('Error al cargar poblaciones', 'error');
    }
}

// Renderizar tabla de poblaciones
function renderPoblacionesTable(data) {
    const tbody = document.getElementById('poblacionesTableBody');
    tbody.innerHTML = '';

    data.forEach((poblacion, index) => {
        const row = document.createElement('tr');
        row.dataset.id = poblacion.ID; // Guardar ID para borrado masivo
        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" onchange="updateBulkDeleteButton()"></td>
            <td>${poblacion.Codigo || '-'}</td>
            <td>${poblacion.Nombre || '-'}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view" onclick="viewPoblacion(${index})" title="Ver"><i class="fas fa-eye"></i></button>
                <button class="btn-icon btn-edit" onclick="editPoblacion(${index})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon btn-delete" onclick="deletePoblacion(${index})" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Actualizar contador de poblaciones
function updatePoblacionCount() {
    const count = poblacionesData.length;
    document.getElementById('poblacionCount').textContent = count === 1 ? `${count} población` : `${count} poblaciones`;
}

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('addPoblacionBtn').addEventListener('click', openPoblacionModal);
    document.getElementById('closePoblacionModal').addEventListener('click', closePoblacionModal);
    document.getElementById('cancelPoblacionBtn').addEventListener('click', closePoblacionModal);
    document.getElementById('poblacionForm').addEventListener('submit', submitPoblacionForm);
    document.getElementById('searchBox').addEventListener('keyup', filterPoblaciones);

    // Nav Buttons
    document.getElementById('navFirstBtn').addEventListener('click', () => navigateRecord('first'));
    document.getElementById('navPrevBtn').addEventListener('click', () => navigateRecord('prev'));
    document.getElementById('navNextBtn').addEventListener('click', () => navigateRecord('next'));
    document.getElementById('navLastBtn').addEventListener('click', () => navigateRecord('last'));

    window.addEventListener('click', (event) => {
        const modal = document.getElementById('poblacionModal');
        if (event.target === modal) {
            closePoblacionModal();
        }
    });

    setupBulkDelete();
}

// Filtrar poblaciones por búsqueda
function filterPoblaciones() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    
    const filtered = poblacionesData.filter(poblacion => {
        const codigo = (poblacion.Codigo || '').toLowerCase();
        const nombre = (poblacion.Nombre || '').toLowerCase();
        
        return codigo.includes(searchTerm) || nombre.includes(searchTerm);
    });

    renderPoblacionesTable(filtered);
}

// Abrir modal para nueva población
function openPoblacionModal() {
    editingPoblacionId = null;
    currentPoblacionIndex = -1; // Reset index
    document.getElementById('modalTitle').textContent = 'Nueva Población';
    document.getElementById('poblacionForm').reset();
    document.getElementById('codigo').readOnly = false;
    document.getElementById('nombre').readOnly = false;
    document.querySelector('#poblacionForm button[type="submit"]').style.display = 'block';
    
    updateNavButtons();
    document.getElementById('poblacionModal').style.display = 'block';
}

// Cerrar modal
function closePoblacionModal() {
    document.getElementById('poblacionModal').style.display = 'none';
    editingPoblacionId = null;
    currentPoblacionIndex = -1;
}

// Logic for Navigation Buttons
let currentPoblacionIndex = -1;

function updateNavButtons() {
    const prevBtn = document.getElementById('navPrevBtn');
    const nextBtn = document.getElementById('navNextBtn');
    const firstBtn = document.getElementById('navFirstBtn');
    const lastBtn = document.getElementById('navLastBtn');
    
    if (currentPoblacionIndex === -1) {
        if(prevBtn) prevBtn.disabled = true;
        if(nextBtn) nextBtn.disabled = true;
        if(firstBtn) firstBtn.disabled = true;
        if(lastBtn) lastBtn.disabled = true;
        return;
    }
    
    if(prevBtn) prevBtn.disabled = (currentPoblacionIndex <= 0);
    if(firstBtn) firstBtn.disabled = (currentPoblacionIndex <= 0);
    if(nextBtn) nextBtn.disabled = (currentPoblacionIndex >= poblacionesData.length - 1);
    if(lastBtn) lastBtn.disabled = (currentPoblacionIndex >= poblacionesData.length - 1);
}

function navigateRecord(direction) {
    if (currentPoblacionIndex === -1) return;
    
    let newIndex = currentPoblacionIndex;
    if (direction === 'first') newIndex = 0;
    if (direction === 'prev') newIndex = currentPoblacionIndex - 1;
    if (direction === 'next') newIndex = currentPoblacionIndex + 1;
    if (direction === 'last') newIndex = poblacionesData.length - 1;
    
    if (newIndex >= 0 && newIndex < poblacionesData.length) {
        const isViewMode = document.querySelector('#poblacionForm button[type="submit"]').style.display === 'none';
        
        if (isViewMode) {
            viewPoblacion(newIndex);
        } else {
            editPoblacion(newIndex);
        }
    }
}

// Ver población (Read-only)
function viewPoblacion(index) {
    currentPoblacionIndex = index;
    const poblacion = poblacionesData[index];
    document.getElementById('modalTitle').textContent = 'Ver Población';
    
    document.getElementById('codigo').value = poblacion.Codigo || '';
    document.getElementById('codigo').readOnly = true;
    
    document.getElementById('nombre').value = poblacion.Nombre || '';
    document.getElementById('nombre').readOnly = true;
    
    // Hide submit button
    document.querySelector('#poblacionForm button[type="submit"]').style.display = 'none';
    
    updateNavButtons();
    document.getElementById('poblacionModal').style.display = 'block';
}

// Editar población
function editPoblacion(index) {
    currentPoblacionIndex = index;
    const poblacion = poblacionesData[index];
    editingPoblacionId = poblacion.ID;
    
    document.getElementById('modalTitle').textContent = 'Editar Población';
    
    document.getElementById('codigo').readOnly = true;
    document.getElementById('codigo').value = poblacion.Codigo || '';
    
    document.getElementById('nombre').readOnly = false;
    document.getElementById('nombre').value = poblacion.Nombre || '';
    
    // Ensure submit button is visible
    document.querySelector('#poblacionForm button[type="submit"]').style.display = 'block';
    
    updateNavButtons();
    document.getElementById('poblacionModal').style.display = 'block';
}

// Guardar/actualizar población
async function submitPoblacionForm(e) {
    e.preventDefault();

    const formData = new FormData(document.getElementById('poblacionForm'));
    const poblacion = Object.fromEntries(formData);

    Object.keys(poblacion).forEach(key => {
        if (poblacion[key] === '') {
            poblacion[key] = null;
        }
    });

    try {
        if (editingPoblacionId) {
            const response = await fetch(`/api/poblaciones/${editingPoblacionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(poblacion)
            });

            const data = await response.json();
            
            if (response.ok) {
                closePoblacionModal();
                loadPoblacionesData();
                showAlert('Población actualizada correctamente', 'success');
            } else {
                showAlert('Error al actualizar: ' + (data.error || 'Error desconocido'), 'error');
            }
        } else {
            // Validar que el código no exista
            const codigoExistente = poblacionesData.some(pob => pob.Codigo === poblacion.Codigo);
            if (codigoExistente) {
                showAlert('El código de población ya existe', 'warning');
                return;
            }

            const response = await fetch('/api/poblaciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(poblacion)
            });

            const data = await response.json();
            
            if (response.ok) {
                closePoblacionModal();
                loadPoblacionesData();
                showAlert('Población creada correctamente', 'success');
            } else {
                showAlert('Error al crear: ' + (data.error || 'Error desconocido'), 'error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación', 'error');
    }
}

// Eliminar población
async function deletePoblacion(index) {
    const poblacion = poblacionesData[index];
    
    if (!await showConfirm(`¿Eliminar población "${poblacion.Nombre}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/poblaciones/${poblacion.ID}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showAlert('Población eliminada correctamente', 'success');
            loadPoblacionesData();
        } else {
            const result = await response.json();
            showAlert(result.error || 'Error al eliminar población', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al eliminar población', 'error');
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
        const response = await fetch('/api/poblaciones/bulk-delete', {
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
            loadPoblacionesData();
        } else {
            showAlert('Error al eliminar registros: ' + (data.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación de eliminación masiva', 'error');
    }
}
