// Gestión de Cuentas de Correo
let cuentasData = [];
let editingCuentaId = null;

// Inicializar la página
document.addEventListener('DOMContentLoaded', () => {
    loadCuentasData();
    setupEventListeners();
});

// Cargar datos de cuentas
async function loadCuentasData() {
    try {
        const response = await fetch('/api/cuentascorreo');
        const data = await response.json();
        cuentasData = data;
        renderCuentasTable(data);
        updateCuentaCount();
        const selectAll = document.getElementById('selectAll');
        if (selectAll) selectAll.checked = false;
        updateBulkDeleteButton();
    } catch (error) {
        console.error('Error al cargar cuentas:', error);
        showAlert('Error al cargar cuentas de correo', 'error');
    }
}

// Renderizar tabla de cuentas
function renderCuentasTable(data) {
    const tbody = document.getElementById('cuentasTableBody');
    tbody.innerHTML = '';

    data.forEach((cuenta, index) => {
        const row = document.createElement('tr');
        row.dataset.id = cuenta.ID; // Guardar ID para borrado masivo
        
        row.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" onchange="updateBulkDeleteButton()"></td>
            <td>${cuenta.Codigo || '-'}</td>
            <td>${cuenta.Nombre || '-'}</td>
            <td>${cuenta.Direccion || '-'}</td>
            <td>${cuenta.Usuario || '-'}</td>
            <td>${cuenta.POP ? cuenta.POP + ':' + (cuenta.PuertoPOP || '') : '-'}</td>
            <td>${cuenta.SMTP ? cuenta.SMTP + ':' + (cuenta.PuertoSMTP || '') : '-'}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-view" onclick="viewCuenta(${index})" title="Ver"><i class="fas fa-eye"></i></button>
                <button class="btn-icon btn-edit" onclick="editCuenta(${index})" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon btn-delete" onclick="deleteCuenta(${index})" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Actualizar contador
function updateCuentaCount() {
    const count = cuentasData.length;
    document.getElementById('cuentaCount').textContent = `${count} cuenta${count !== 1 ? 's' : ''}`;
}

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('addCuentaBtn').addEventListener('click', openCuentaModal);
    document.getElementById('closeCuentaModal').addEventListener('click', closeCuentaModal);
    document.getElementById('cancelCuentaBtn').addEventListener('click', closeCuentaModal);
    document.getElementById('cuentaForm').addEventListener('submit', submitCuentaForm);
    document.getElementById('searchBox').addEventListener('keyup', filterCuentas);

    // Nav Buttons
    document.getElementById('navFirstBtn').addEventListener('click', () => navigateRecord('first'));
    document.getElementById('navPrevBtn').addEventListener('click', () => navigateRecord('prev'));
    document.getElementById('navNextBtn').addEventListener('click', () => navigateRecord('next'));
    document.getElementById('navLastBtn').addEventListener('click', () => navigateRecord('last'));

    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('cuentaModal');
        if (event.target === modal) {
            closeCuentaModal();
        }
    });

    setupBulkDelete();
}

// Filtrar cuentas
function filterCuentas() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    
    const filtered = cuentasData.filter(cuenta => {
        const codigo = (cuenta.Codigo || '').toLowerCase();
        const nombre = (cuenta.Nombre || '').toLowerCase();
        const email = (cuenta.Direccion || '').toLowerCase();
        const usuario = (cuenta.Usuario || '').toLowerCase();
        
        return codigo.includes(searchTerm) || 
               nombre.includes(searchTerm) || 
               email.includes(searchTerm) ||
               usuario.includes(searchTerm);
    });

    renderCuentasTable(filtered);
}

// Abrir modal
function openCuentaModal() {
    editingCuentaId = null;
    currentCuentaIndex = -1;
    document.getElementById('modalTitle').textContent = 'Nueva Cuenta de Correo';
    document.getElementById('cuentaForm').reset();
    
    setReadOnly(false);
    
    updateNavButtons();
    document.getElementById('cuentaModal').style.display = 'block';
}

// Cerrar modal
function closeCuentaModal() {
    document.getElementById('cuentaModal').style.display = 'none';
    editingCuentaId = null;
    currentCuentaIndex = -1;
}

// Helper para ReadOnly
function setReadOnly(isReadOnly) {
    const inputs = document.querySelectorAll('#cuentaForm input');
    inputs.forEach(input => {
        if (input.type !== 'hidden') {
            input.readOnly = isReadOnly;
        }
    });
    
    const submitBtn = document.getElementById('saveCuentaBtn');
    if (submitBtn) {
        submitBtn.style.display = isReadOnly ? 'none' : 'block';
    }
}

// Navegación
let currentCuentaIndex = -1;

function updateNavButtons() {
    const prevBtn = document.getElementById('navPrevBtn');
    const nextBtn = document.getElementById('navNextBtn');
    const firstBtn = document.getElementById('navFirstBtn');
    const lastBtn = document.getElementById('navLastBtn');
    
    if (currentCuentaIndex === -1) {
        if(prevBtn) prevBtn.disabled = true;
        if(nextBtn) nextBtn.disabled = true;
        if(firstBtn) firstBtn.disabled = true;
        if(lastBtn) lastBtn.disabled = true;
        return;
    }
    
    if(prevBtn) prevBtn.disabled = (currentCuentaIndex <= 0);
    if(firstBtn) firstBtn.disabled = (currentCuentaIndex <= 0);
    if(nextBtn) nextBtn.disabled = (currentCuentaIndex >= cuentasData.length - 1);
    if(lastBtn) lastBtn.disabled = (currentCuentaIndex >= cuentasData.length - 1);
}

function navigateRecord(direction) {
    if (currentCuentaIndex === -1) return;
    
    let newIndex = currentCuentaIndex;
    if (direction === 'first') newIndex = 0;
    if (direction === 'prev') newIndex = currentCuentaIndex - 1;
    if (direction === 'next') newIndex = currentCuentaIndex + 1;
    if (direction === 'last') newIndex = cuentasData.length - 1;
    
    if (newIndex >= 0 && newIndex < cuentasData.length) {
        // Verificar modo actual (Ver o Editar)
        const isViewMode = document.getElementById('saveCuentaBtn').style.display === 'none';
        
        if (isViewMode) {
            viewCuenta(newIndex);
        } else {
            editCuenta(newIndex);
        }
    }
}

// Ver cuenta
function viewCuenta(index) {
    currentCuentaIndex = index;
    const cuenta = cuentasData[index];
    populateForm(cuenta);
    document.getElementById('modalTitle').textContent = 'Ver Cuenta';
    setReadOnly(true);
    updateNavButtons();
    document.getElementById('cuentaModal').style.display = 'block';
}

// Editar cuenta
function editCuenta(index) {
    currentCuentaIndex = index;
    const cuenta = cuentasData[index];
    editingCuentaId = cuenta.ID;
    
    populateForm(cuenta);
    document.getElementById('modalTitle').textContent = 'Editar Cuenta';
    setReadOnly(false);
    
    // Codigo suele ser clave, a veces se bloquea, pero en este diseño parece editable.
    // Si quisieramos bloquearlo: document.getElementById('codigo').readOnly = true;
    
    updateNavButtons();
    document.getElementById('cuentaModal').style.display = 'block';
}

function populateForm(cuenta) {
    document.getElementById('cuentaId').value = cuenta.ID || '';
    document.getElementById('codigo').value = cuenta.Codigo || '';
    document.getElementById('nombre').value = cuenta.Nombre || '';
    document.getElementById('email').value = cuenta.Direccion || ''; // Note: DB field is 'Direccion'
    document.getElementById('usuario').value = cuenta.Usuario || '';
    document.getElementById('password').value = cuenta.Password || '';
    document.getElementById('pop').value = cuenta.POP || '';
    document.getElementById('puertoPop').value = cuenta.PuertoPOP || '';
    document.getElementById('smtp').value = cuenta.SMTP || '';
    document.getElementById('puertoSmtp').value = cuenta.PuertoSMTP || '';
}

// Guardar
async function submitCuentaForm(e) {
    e.preventDefault();

    const formData = new FormData(document.getElementById('cuentaForm'));
    const cuenta = Object.fromEntries(formData);
    
    // Normalizar datos vacíos
    Object.keys(cuenta).forEach(key => {
        if (cuenta[key] === '') {
            cuenta[key] = null;
        }
    });

    // Validar Email Único
    const emailNormalizado = (cuenta.Direccion || '').trim().toLowerCase();
    const emailDuplicado = cuentasData.some(c => {
        const cEmail = (c.Direccion || '').trim().toLowerCase();
        // Si estamos editando, ignorar el propio registro
        if (editingCuentaId && c.ID == editingCuentaId) return false;
        return cEmail === emailNormalizado;
    });

    if (emailDuplicado) {
        showAlert('La dirección de correo ya existe. Por favor, utilice otra.', 'warning');
        return;
    }

    try {
        if (editingCuentaId) {
            const response = await fetch(`/api/cuentascorreo/${editingCuentaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cuenta)
            });

            const data = await response.json();
            
            if (response.ok) {
                closeCuentaModal();
                loadCuentasData();
                showAlert('Cuenta actualizada correctamente', 'success');
            } else {
                showAlert('Error al actualizar: ' + (data.error || 'Error desconocido'), 'error');
            }
        } else {
            // Check duplicados
            const exists = cuentasData.some(c => c.Codigo === cuenta.Codigo);
            if (exists) {
                showAlert('El código de cuenta ya existe', 'warning');
                return;
            }

            const response = await fetch('/api/cuentascorreo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cuenta)
            });

            const data = await response.json();
            
            if (response.ok) {
                closeCuentaModal();
                loadCuentasData();
                showAlert('Cuenta creada correctamente', 'success');
            } else {
                showAlert('Error al crear: ' + (data.error || 'Error desconocido'), 'error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación', 'error');
    }
}

// Eliminar
async function deleteCuenta(index) {
    const cuenta = cuentasData[index];
    if (!await showConfirm(`¿Eliminar cuenta "${cuenta.Nombre}"?`)) return;

    try {
        const response = await fetch(`/api/cuentascorreo/${cuenta.ID}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showAlert('Cuenta eliminada correctamente', 'success');
            loadCuentasData();
        } else {
            const data = await response.json().catch(() => ({}));
            showAlert(data.error || 'Error al eliminar cuenta', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al eliminar', 'error');
    }
}

// Bulk Delete Logic (Reused Pattern)
function setupBulkDelete() {
    const selectAll = document.getElementById('selectAll');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

    if (selectAll) {
        selectAll.addEventListener('change', () => {
            const checkboxes = document.querySelectorAll('.row-checkbox');
            checkboxes.forEach(cb => {
                 if (!cb.disabled) cb.checked = selectAll.checked;
            });
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
}

async function deleteSelected() {
    const selectedBoxes = document.querySelectorAll('.row-checkbox:checked');
    const ids = Array.from(selectedBoxes).map(cb => cb.closest('tr').dataset.id);

    if (ids.length === 0) return;

    if (!await showConfirm(`¿Estás seguro de que deseas eliminar ${ids.length} cuentas?`)) return;

    // Use generic bulk delete or iterative delete if backend doesn't support bulk.
    // Assuming backend may not have specific bulk endpoint for generic tables, 
    // but main implementation pattern suggests we might need to iterate or add endpoint.
    // Since I didn't add bulk-delete specifically for this table in server, 
    // I will iterate here to be safe, like other generic pages might.
    // wait, server.js generic delete is only by ID.
    
    try {
        const results = await Promise.all(ids.map(async id => {
            const response = await fetch(`/api/cuentascorreo/${id}`, { method: 'DELETE' });
            if (response.ok) return { id, ok: true };
            const data = await response.json().catch(() => ({}));
            return { id, ok: false, error: data.error || 'Error desconocido' };
        }));

        const errors = results.filter(r => !r.ok);
        if (errors.length > 0) {
            const detail = errors.map(e => `#${e.id}: ${e.error}`).join(' | ');
            showAlert(`No se pudieron eliminar ${errors.length} registros. ${detail}`, 'error');
            return;
        }

        showAlert(`Se han eliminado ${ids.length} registros.`, 'success');
        
        loadCuentasData();
        document.getElementById('selectAll').checked = false;
        updateBulkDeleteButton();
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al eliminar registros', 'error');
    }
}
