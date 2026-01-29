// Gestión de Soporte Técnico - Página Independiente
let soporteData = [];
let allClientes = []; // Almacenar lista completa de clientes
let editingSoporteId = null;

// Inicializar la página
document.addEventListener('DOMContentLoaded', () => {
    loadSoporteData();
    loadClientesForSelect(); // Cargar clientes para el dropdown
    setupEventListeners();
// initAccordion(); (Eliminado para evitar duplicidad)
});

// Cargar lista de clientes para el selector
async function loadClientesForSelect() {
    try {
        const response = await fetch('/api/clientes');
        allClientes = await response.json();
        
        const select = document.getElementById('clienteSelect');
        // Mantener la opción por defecto
        select.innerHTML = '<option value="">-- Buscar Cliente (Nombre o Código) --</option>';
        
        allClientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.NombreComercial || cliente.NombreFiscal;
            option.textContent = `${cliente.Codigo ? '[' + cliente.Codigo + '] ' : ''}${cliente.NombreComercial || cliente.NombreFiscal}`;
            option.dataset.codigo = cliente.Codigo;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar clientes para el selector:', error);
    }
}

// Cargar datos de soporte
async function loadSoporteData() {
    try {
        const response = await fetch('/api/soporte');
        const data = await response.json();
        soporteData = data;
        renderSoporteTable(data);
        updateSoporteCount();
    } catch (error) {
        console.error('Error al cargar soporte:', error);
        showAlert('Error al cargar datos de soporte', 'error');
    }
}

// Renderizar tabla de soporte
function renderSoporteTable(data) {
    const tbody = document.getElementById('soporteTableBody');
    tbody.innerHTML = '';

    data.forEach((ticket, index) => {
        const row = document.createElement('tr');
        row.dataset.id = ticket.ID; // Guardar ID para borrado masivo
        
        // Formatear fecha
        const fecha = formatDate(ticket.Fecha);

        // Estilo para estado
        let estadoClass = '';
        if (ticket.Estado === 'Abierto') estadoClass = 'text-danger';
        else if (ticket.Estado === 'En Proceso') estadoClass = 'text-warning';
        else if (ticket.Estado === 'Cerrado') estadoClass = 'text-success';

        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" onchange="updateBulkDeleteButton()"></td>
            <td>${ticket.Codigo || '-'}</td>
            <td>${ticket.Cliente || '-'}</td>
            <td>${ticket.Asunto || '-'}</td>
            <td><span class="${estadoClass}" style="font-weight:bold;">${ticket.Estado || 'Abierto'}</span></td>
            <td>${ticket.Prioridad || 'Media'}</td>
            <td>${fecha}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view" onclick="viewSoporte(${index})" title="Ver"><i class="fas fa-eye"></i></button>
                <button class="btn-icon btn-edit" onclick="editSoporte(${index})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon btn-delete" onclick="deleteSoporte(${index})" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Actualizar contador de tickets
function updateSoporteCount() {
    const count = soporteData.length;
    document.getElementById('soporteCount').textContent = `${count} ticket${count !== 1 ? 's' : ''}`;
}

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('addSoporteBtn').addEventListener('click', openSoporteModal);
    document.getElementById('closeSoporteModal').addEventListener('click', closeSoporteModal);
    document.getElementById('cancelSoporteBtn').addEventListener('click', closeSoporteModal);
    document.getElementById('soporteForm').addEventListener('submit', submitSoporteForm);
    document.getElementById('searchBox').addEventListener('keyup', filterSoporte);

    // Sync select con input de texto
    document.getElementById('clienteSelect').addEventListener('change', (e) => {
        if (e.target.value) {
            document.getElementById('cliente').value = e.target.value;
        }
    });

    // Sync input de texto con select (búsqueda inteligente)
    document.getElementById('cliente').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const select = document.getElementById('clienteSelect');
        
        if (!val) {
            select.value = '';
            return;
        }

        // Buscar coincidencia más cercana
        const match = allClientes.find(c => 
            (c.NombreComercial && c.NombreComercial.toLowerCase().includes(val)) ||
            (c.NombreFiscal && c.NombreFiscal.toLowerCase().includes(val)) ||
            (c.Codigo && c.Codigo.toLowerCase().includes(val))
        );

        if (match) {
            select.value = match.NombreComercial || match.NombreFiscal;
        } else {
            select.value = '';
        }
    });

    // Nav Buttons
    document.getElementById('navFirstBtn').addEventListener('click', () => navigateRecord('first'));
    document.getElementById('navPrevBtn').addEventListener('click', () => navigateRecord('prev'));
    document.getElementById('navNextBtn').addEventListener('click', () => navigateRecord('next'));
    document.getElementById('navLastBtn').addEventListener('click', () => navigateRecord('last'));

    window.addEventListener('click', (event) => {
        const modal = document.getElementById('soporteModal');
        if (event.target === modal) {
            closeSoporteModal();
        }
    });

    setupBulkDelete();
}

// Filtrar soporte por búsqueda
function filterSoporte() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    
    const filtered = soporteData.filter(ticket => {
        const codigo = (ticket.Codigo || '').toLowerCase();
        const cliente = (ticket.Cliente || '').toLowerCase();
        const asunto = (ticket.Asunto || '').toLowerCase();
        
        return codigo.includes(searchTerm) || cliente.includes(searchTerm) || asunto.includes(searchTerm);
    });

    renderSoporteTable(filtered);
}

// Abrir modal para nuevo ticket
function openSoporteModal() {
    editingSoporteId = null;
    currentSoporteIndex = -1; 
    document.getElementById('modalTitle').textContent = 'Nuevo Ticket de Soporte';
    document.getElementById('soporteForm').reset();
    
    // Reset inputs
    document.getElementById('codigo').readOnly = false;
    document.getElementById('clienteSelect').disabled = false;
    document.getElementById('clienteSelect').value = '';
    document.getElementById('cliente').readOnly = false;
    document.getElementById('asunto').readOnly = false;
    document.getElementById('descripcion').readOnly = false;
    document.getElementById('estado').disabled = false;
    document.getElementById('prioridad').disabled = false;

    document.querySelector('#soporteForm button[type="submit"]').style.display = 'block';
    
    updateNavButtons(); 
    document.getElementById('soporteModal').style.display = 'block';
}

// Cerrar modal
function closeSoporteModal() {
    document.getElementById('soporteModal').style.display = 'none';
    editingSoporteId = null;
    currentSoporteIndex = -1;
}

// Logic for Navigation Buttons
let currentSoporteIndex = -1;

function updateNavButtons() {
    const prevBtn = document.getElementById('navPrevBtn');
    const nextBtn = document.getElementById('navNextBtn');
    const firstBtn = document.getElementById('navFirstBtn');
    const lastBtn = document.getElementById('navLastBtn');
    
    if (currentSoporteIndex === -1) {
        if(prevBtn) prevBtn.disabled = true;
        if(nextBtn) nextBtn.disabled = true;
        if(firstBtn) firstBtn.disabled = true;
        if(lastBtn) lastBtn.disabled = true;
        return;
    }
    
    if(prevBtn) prevBtn.disabled = (currentSoporteIndex <= 0);
    if(firstBtn) firstBtn.disabled = (currentSoporteIndex <= 0);
    if(nextBtn) nextBtn.disabled = (currentSoporteIndex >= soporteData.length - 1);
    if(lastBtn) lastBtn.disabled = (currentSoporteIndex >= soporteData.length - 1);
}

function navigateRecord(direction) {
    if (currentSoporteIndex === -1) return;
    
    let newIndex = currentSoporteIndex;
    if (direction === 'first') newIndex = 0;
    if (direction === 'prev') newIndex = currentSoporteIndex - 1;
    if (direction === 'next') newIndex = currentSoporteIndex + 1;
    if (direction === 'last') newIndex = soporteData.length - 1;
    
    if (newIndex >= 0 && newIndex < soporteData.length) {
        const isViewMode = document.querySelector('#soporteForm button[type="submit"]').style.display === 'none';
        
        if (isViewMode) {
            viewSoporte(newIndex);
        } else {
            editSoporte(newIndex);
        }
    }
}

// Ver soporte (Read-only)
function viewSoporte(index) {
    currentSoporteIndex = index;
    const ticket = soporteData[index];
    document.getElementById('modalTitle').textContent = 'Ver Ticket';
    
    document.getElementById('codigo').value = ticket.Codigo || '';
    document.getElementById('codigo').readOnly = true;

    document.getElementById('clienteSelect').value = ticket.Cliente || '';
    document.getElementById('clienteSelect').disabled = true;

    document.getElementById('cliente').value = ticket.Cliente || '';
    document.getElementById('cliente').readOnly = true;
    
    document.getElementById('asunto').value = ticket.Asunto || '';
    document.getElementById('asunto').readOnly = true;

    document.getElementById('descripcion').value = ticket.Descripcion || '';
    document.getElementById('descripcion').readOnly = true;

    document.getElementById('estado').value = ticket.Estado || 'Abierto';
    document.getElementById('estado').disabled = true;

    document.getElementById('prioridad').value = ticket.Prioridad || 'Media';
    document.getElementById('prioridad').disabled = true;
    
    document.querySelector('#soporteForm button[type="submit"]').style.display = 'none';
    
    updateNavButtons();
    document.getElementById('soporteModal').style.display = 'block';
}

// Editar soporte
function editSoporte(index) {
    currentSoporteIndex = index;
    const ticket = soporteData[index];
    editingSoporteId = ticket.ID;
    
    document.getElementById('modalTitle').textContent = 'Editar Ticket';
    
    document.getElementById('codigo').value = ticket.Codigo || '';
    document.getElementById('codigo').readOnly = true; // No permitir cambiar código al editar

    document.getElementById('clienteSelect').disabled = false;
    document.getElementById('clienteSelect').value = ticket.Cliente || '';

    document.getElementById('cliente').readOnly = false;
    document.getElementById('cliente').value = ticket.Cliente || '';
    
    document.getElementById('asunto').readOnly = false;
    document.getElementById('asunto').value = ticket.Asunto || '';

    document.getElementById('descripcion').readOnly = false;
    document.getElementById('descripcion').value = ticket.Descripcion || '';

    document.getElementById('estado').disabled = false;
    document.getElementById('estado').value = ticket.Estado || 'Abierto';

    document.getElementById('prioridad').disabled = false;
    document.getElementById('prioridad').value = ticket.Prioridad || 'Media';
    
    document.querySelector('#soporteForm button[type="submit"]').style.display = 'block';
    
    updateNavButtons();
    document.getElementById('soporteModal').style.display = 'block';
}

// Guardar/actualizar soporte
async function submitSoporteForm(e) {
    e.preventDefault();

    const formData = new FormData(document.getElementById('soporteForm'));
    const ticket = Object.fromEntries(formData);

    Object.keys(ticket).forEach(key => {
        if (ticket[key] === '') {
            ticket[key] = null;
        }
    });

    try {
        if (editingSoporteId) {
             // Al editar, normalmente no cambiamos el código, pero si se permitiera, habría que validar duplicados excluyendo el propio
            const response = await fetch(`/api/soporte/${editingSoporteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ticket)
            });

            const data = await response.json();
            
            if (response.ok) {
                closeSoporteModal();
                loadSoporteData();
                showAlert('Ticket actualizado correctamente', 'success');
            } else {
                showAlert('Error al actualizar: ' + (data.error || 'Error desconocido'), 'error');
            }
        } else {
            // Validar que el código no exista
            const codigoExistente = soporteData.some(t => t.Codigo === ticket.Codigo);
            if (codigoExistente) {
                showAlert('Error: El código del ticket "' + ticket.Codigo + '" ya existe. Por favor utiliza otro código.', 'warning');
                return;
            }

            const response = await fetch('/api/soporte', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ticket)
            });

            const data = await response.json();
            
            if (response.ok) {
                closeSoporteModal();
                loadSoporteData();
                showAlert('Ticket creado correctamente', 'success');
            } else {
                showAlert('Error al crear: ' + (data.error || 'Error desconocido'), 'error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación', 'error');
    }
}

// Eliminar soporte
async function deleteSoporte(index) {
    const ticket = soporteData[index];
    
    if (!await showConfirm(`¿Eliminar ticket "${ticket.Asunto}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/soporte/${ticket.ID}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showAlert('Ticket eliminado correctamente', 'success');
            loadSoporteData();
        } else {
            const data = await response.json().catch(() => ({}));
            showAlert(data.error || 'Error al eliminar ticket', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al eliminar ticket', 'error');
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
        const response = await fetch('/api/soporte/bulk-delete', {
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
            loadSoporteData();
        } else {
            showAlert('Error al eliminar registros: ' + (data.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación de eliminación masiva', 'error');
    }
}
