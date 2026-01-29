// Gestión de Plataformas - Página Independiente
let plataformasData = [];
let editingPlataformaId = null;

// Inicializar la página
document.addEventListener('DOMContentLoaded', () => {
    loadPlataformasData();
    setupEventListeners();
// initAccordion(); (Eliminado para evitar duplicidad)
});

// Cargar datos de plataformas
async function loadPlataformasData() {
    try {
        const response = await fetch('/api/plataformas');
        const data = await response.json();
        plataformasData = data;
        renderPlataformasTable(data);
        updatePlataformaCount();
    } catch (error) {
        console.error('Error al cargar plataformas:', error);
        showAlert('Error al cargar plataformas', 'error');
    }
}

// Renderizar tabla de plataformas
function renderPlataformasTable(data) {
    const tbody = document.getElementById('plataformasTableBody');
    tbody.innerHTML = '';

    data.forEach((plataforma, index) => {
        const row = document.createElement('tr');
        row.dataset.id = plataforma.ID; // Guardar ID para borrado masivo
        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" onchange="updateBulkDeleteButton()"></td>
            <td>${plataforma.Codigo || '-'}</td>
            <td>${plataforma.Nombre || '-'}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view" onclick="viewPlataforma(${index})" title="Ver"><i class="fas fa-eye"></i></button>
                <button class="btn-icon btn-edit" onclick="editPlataforma(${index})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon btn-delete" onclick="deletePlataforma(${index})" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Actualizar contador de plataformas
function updatePlataformaCount() {
    const count = plataformasData.length;
    document.getElementById('plataformaCount').textContent = `${count} plataforma${count !== 1 ? 's' : ''}`;
}

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('addPlataformaBtn').addEventListener('click', openPlataformaModal);
    document.getElementById('closePlataformaModal').addEventListener('click', closePlataformaModal);
    document.getElementById('cancelPlataformaBtn').addEventListener('click', closePlataformaModal);
    document.getElementById('plataformaForm').addEventListener('submit', submitPlataformaForm);
    document.getElementById('searchBox').addEventListener('keyup', filterPlataformas);

    // Nav Buttons
    document.getElementById('navFirstBtn').addEventListener('click', () => navigateRecord('first'));
    document.getElementById('navPrevBtn').addEventListener('click', () => navigateRecord('prev'));
    document.getElementById('navNextBtn').addEventListener('click', () => navigateRecord('next'));
    document.getElementById('navLastBtn').addEventListener('click', () => navigateRecord('last'));

    window.addEventListener('click', (event) => {
        const modal = document.getElementById('plataformaModal');
        if (event.target === modal) {
            closePlataformaModal();
        }
    });

    setupBulkDelete();
}

// Filtrar plataformas por búsqueda
function filterPlataformas() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    
    const filtered = plataformasData.filter(plataforma => {
        const codigo = (plataforma.Codigo || '').toLowerCase();
        const nombre = (plataforma.Nombre || '').toLowerCase();
        
        return codigo.includes(searchTerm) || nombre.includes(searchTerm);
    });

    renderPlataformasTable(filtered);
}

// Abrir modal para nueva plataforma
function openPlataformaModal() {
    editingPlataformaId = null;
    currentPlataformaIndex = -1; // Reset index
    document.getElementById('modalTitle').textContent = 'Nueva Plataforma';
    document.getElementById('plataformaForm').reset();
    
    // Reset states
    document.getElementById('codigo').readOnly = false;
    document.getElementById('nombre').readOnly = false;
    document.querySelector('#plataformaForm button[type="submit"]').style.display = 'block';
    
    updateNavButtons(); // Update buttons (will be disabled)
    document.getElementById('plataformaModal').style.display = 'block';
}

// Cerrar modal
function closePlataformaModal() {
    document.getElementById('plataformaModal').style.display = 'none';
    editingPlataformaId = null;
    currentPlataformaIndex = -1;
}

// Logic for Navigation Buttons
let currentPlataformaIndex = -1;

function updateNavButtons() {
    const prevBtn = document.getElementById('navPrevBtn');
    const nextBtn = document.getElementById('navNextBtn');
    const firstBtn = document.getElementById('navFirstBtn');
    const lastBtn = document.getElementById('navLastBtn');
    
    if (currentPlataformaIndex === -1) {
        // New record mode - disable all
        if(prevBtn) prevBtn.disabled = true;
        if(nextBtn) nextBtn.disabled = true;
        if(firstBtn) firstBtn.disabled = true;
        if(lastBtn) lastBtn.disabled = true;
        return;
    }
    
    // Edit/View mode
    if(prevBtn) prevBtn.disabled = (currentPlataformaIndex <= 0);
    if(firstBtn) firstBtn.disabled = (currentPlataformaIndex <= 0);
    if(nextBtn) nextBtn.disabled = (currentPlataformaIndex >= plataformasData.length - 1);
    if(lastBtn) lastBtn.disabled = (currentPlataformaIndex >= plataformasData.length - 1);
}

function navigateRecord(direction) {
    if (currentPlataformaIndex === -1) return;
    
    let newIndex = currentPlataformaIndex;
    if (direction === 'first') newIndex = 0;
    if (direction === 'prev') newIndex = currentPlataformaIndex - 1;
    if (direction === 'next') newIndex = currentPlataformaIndex + 1;
    if (direction === 'last') newIndex = plataformasData.length - 1;
    
    if (newIndex >= 0 && newIndex < plataformasData.length) {
        // Check if we are in view or edit mode
        // Simple heuristic: if submit button is hidden, we are in View mode
        const isViewMode = document.querySelector('#plataformaForm button[type="submit"]').style.display === 'none';
        
        if (isViewMode) {
            viewPlataforma(newIndex);
        } else {
            editPlataforma(newIndex);
        }
    }
}

// Ver plataforma (Read-only)
function viewPlataforma(index) {
    currentPlataformaIndex = index;
    const plataforma = plataformasData[index];
    document.getElementById('modalTitle').textContent = 'Ver Plataforma';
    
    document.getElementById('codigo').value = plataforma.Codigo || '';
    document.getElementById('codigo').readOnly = true;
    
    document.getElementById('nombre').value = plataforma.Nombre || '';
    document.getElementById('nombre').readOnly = true;
    
    // Hide submit button
    document.querySelector('#plataformaForm button[type="submit"]').style.display = 'none';
    
    updateNavButtons();
    document.getElementById('plataformaModal').style.display = 'block';
}

// Editar plataforma
function editPlataforma(index) {
    currentPlataformaIndex = index;
    const plataforma = plataformasData[index];
    editingPlataformaId = plataforma.ID;
    
    document.getElementById('modalTitle').textContent = 'Editar Plataforma';
    
    document.getElementById('codigo').readOnly = true;
    document.getElementById('codigo').value = plataforma.Codigo || '';
    
    document.getElementById('nombre').readOnly = false;
    document.getElementById('nombre').value = plataforma.Nombre || '';
    
    // Ensure submit button is visible
    document.querySelector('#plataformaForm button[type="submit"]').style.display = 'block';
    
    updateNavButtons();
    document.getElementById('plataformaModal').style.display = 'block';
}

// Guardar/actualizar plataforma
async function submitPlataformaForm(e) {
    e.preventDefault();

    const formData = new FormData(document.getElementById('plataformaForm'));
    const plataforma = Object.fromEntries(formData);

    Object.keys(plataforma).forEach(key => {
        if (plataforma[key] === '') {
            plataforma[key] = null;
        }
    });

    try {
        if (editingPlataformaId) {
            const response = await fetch(`/api/plataformas/${editingPlataformaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(plataforma)
            });

            const data = await response.json();
            
            if (response.ok) {
                closePlataformaModal();
                loadPlataformasData();
                showAlert('Plataforma actualizada correctamente', 'success');
            } else {
                showAlert('Error al actualizar: ' + (data.error || 'Error desconocido'), 'error');
            }
        } else {
            // Validar que el código no exista
            const codigoExistente = plataformasData.some(plat => plat.Codigo === plataforma.Codigo);
            if (codigoExistente) {
                showAlert('El código de plataforma ya existe', 'warning');
                return;
            }

            const response = await fetch('/api/plataformas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(plataforma)
            });

            const data = await response.json();
            
            if (response.ok) {
                closePlataformaModal();
                loadPlataformasData();
                showAlert('Plataforma creada correctamente', 'success');
            } else {
                showAlert('Error al crear: ' + (data.error || 'Error desconocido'), 'error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación', 'error');
    }
}

// Eliminar plataforma
async function deletePlataforma(index) {
    const plataforma = plataformasData[index];
    
    if (!await showConfirm(`¿Eliminar plataforma "${plataforma.Nombre}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/plataformas/${plataforma.ID}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showAlert('Plataforma eliminada correctamente', 'success');
            loadPlataformasData();
        } else {
            const result = await response.json();
            showAlert(result.error || 'Error al eliminar plataforma', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al eliminar plataforma', 'error');
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
        const response = await fetch('/api/plataformas/bulk-delete', {
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
            loadPlataformasData();
        } else {
            showAlert('Error al eliminar registros: ' + (data.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación de eliminación masiva', 'error');
    }
}
