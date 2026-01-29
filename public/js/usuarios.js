// Gestión de Usuarios - Página Independiente
let usuariosData = [];
let editingUsuarioId = null;

// Inicializar la página
document.addEventListener('DOMContentLoaded', () => {
    loadUsuariosData();
    setupEventListeners();
// initAccordion(); (Eliminado para evitar duplicidad)

    // Disable Add Button if not root
    const btnAdd = document.getElementById('addUsuarioBtn');
    if (window.currentUser && window.currentUser.Usuario !== 'root') {
        btnAdd.disabled = true;
        btnAdd.style.opacity = '0.5';
        btnAdd.style.cursor = 'not-allowed';
    }

    // Image Input Listener
    document.getElementById('imagenInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('imagePreview').src = e.target.result;
                document.getElementById('imagePreview').style.display = 'block';
                document.getElementById('imagePlaceholder').style.display = 'none';
            }
            reader.readAsDataURL(file);
        }
    });
});

// Helper para mostrar imagen desde Buffer o String
function getImgHtml(imagen) {
    if (!imagen) return '<i class="fas fa-user" style="color: #94a3b8; font-size: 24px;"></i>';
    
    let src = '';
    // Si viene como Buffer de MySQL (objeto JSON)
    if (imagen && imagen.type === 'Buffer') {
        // El buffer contiene el string "data:image/..." completo (utf8)
        // Convertir los números del array a caracteres y unirlos.
        // String.fromCharCode(...imagen.data) puede fallar con call stacks grandes, mejor reduce o un loop simple si es enorme,
        // pero TextDecoder es lo ideal en navegadores modernos.
        try {
            src = new TextDecoder("utf-8").decode(new Uint8Array(imagen.data));
        } catch (e) {
            // Fallback antiguo si fallase TextDecoder
             const binary = String.fromCharCode.apply(null, imagen.data);
             src = binary; 
        }
    } else if (typeof imagen === 'string') {
         src = imagen; 
    }
    
    return `<img src="${src}" style="width: 100%; height: 100%; object-fit: cover;">`;
}

// Cargar datos de usuarios
async function loadUsuariosData() {
    try {
        const response = await fetch('/api/usuarios');
        const data = await response.json();
        usuariosData = data;
        renderUsuariosTable(data);
        updateUsuarioCount();
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        showAlert('Error al cargar usuarios', 'error');
    }
}

// Renderizar tabla de usuarios
function renderUsuariosTable(data) {
    const tbody = document.getElementById('usuariosTableBody');
    tbody.innerHTML = '';


    data.forEach((usuario, index) => {
        const safeCurrentUser = window.currentUser ? window.currentUser.Usuario.toLowerCase() : '';
        const safeRowUser = usuario.Usuario.toLowerCase();
        
        const isGlobalRoot = safeCurrentUser === 'root';
        const isRowRoot = safeRowUser === 'root';
        const isRowMe = safeCurrentUser === safeRowUser;

        const canEdit = isGlobalRoot || isRowMe;
        // Permitir borrar si soy root o es mi propia fila (Root tiene poder absoluto ahora)
        const canDelete = isGlobalRoot || isRowMe;
        
        // DEBUG - Quitar en producción si molesta
        if (index === 0) console.log('DEBUG PERMISOS:', { safeCurrentUser, safeRowUser, canDelete });

        const disableEdit = !canEdit;
        const disableDelete = !canDelete;

        const row = document.createElement('tr');
        row.dataset.id = usuario.IDAcceso; // Guardar IDAcceso para borrado masivo
        row.innerHTML = `
            <td>
                <input type="checkbox" class="row-checkbox" onchange="updateBulkDeleteButton()" 
                ${disableDelete ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}>
            </td>
            <td>${usuario.Usuario || '-'}</td>
            <td>${usuario.Email || '-'}</td>
            <td>${usuario.Password ? '********' : '-'}</td>
            <td>
                <div style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: #e2e8f0; display: flex; align-items: center; justify-content: center;">
                    ${getImgHtml(usuario.Imagen)}
                </div>
            </td>
            <td class="actions-cell">
                <button class="btn-icon btn-view" onclick="viewUsuario(${index})" title="Ver" ${disableEdit ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}><i class="fas fa-eye"></i></button>
                <button class="btn-icon btn-edit" onclick="editUsuario(${index})" title="Editar" ${disableEdit ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}><i class="fas fa-edit"></i></button>
                <button class="btn-icon btn-delete" onclick="deleteUsuario(${index})" title="Eliminar" ${disableDelete ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Actualizar contador de usuarios
function updateUsuarioCount() {
    const count = usuariosData.length;
    document.getElementById('usuarioCount').textContent = `${count} usuario${count !== 1 ? 's' : ''}`;
}

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('addUsuarioBtn').addEventListener('click', openUsuarioModal);
    document.getElementById('closeUsuarioModal').addEventListener('click', closeUsuarioModal);
    document.getElementById('cancelUsuarioBtn').addEventListener('click', closeUsuarioModal);
    document.getElementById('usuarioForm').addEventListener('submit', submitUsuarioForm);
    document.getElementById('searchBox').addEventListener('keyup', filterUsuarios);

    // Nav Buttons
    document.getElementById('navFirstBtn').addEventListener('click', () => navigateRecord('first'));
    document.getElementById('navPrevBtn').addEventListener('click', () => navigateRecord('prev'));
    document.getElementById('navNextBtn').addEventListener('click', () => navigateRecord('next'));
    document.getElementById('navLastBtn').addEventListener('click', () => navigateRecord('last'));

    window.addEventListener('click', (event) => {
        const modal = document.getElementById('usuarioModal');
        if (event.target === modal) {
            closeUsuarioModal();
        }
    });

    setupBulkDelete();
}

// Filtrar usuarios por búsqueda
function filterUsuarios() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    
    const filtered = usuariosData.filter(usuario => {
        const user = (usuario.Usuario || '').toLowerCase();
        
        return user.includes(searchTerm);
    });

    renderUsuariosTable(filtered);
}

// Abrir modal para nuevo usuario
function openUsuarioModal() {
    editingUsuarioId = null;
    currentUsuarioIndex = -1; // Reset index
    document.getElementById('modalTitle').textContent = 'Nuevo Usuario';
    document.getElementById('usuarioForm').reset();
    document.getElementById('usuario').readOnly = false;
    document.getElementById('email').readOnly = false;
    if(document.getElementById('password')) document.getElementById('password').readOnly = false;
    
    // Reset Image
    document.getElementById('imagePreview').src = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('imagePlaceholder').style.display = 'block';
    document.getElementById('imagenInput').value = '';

    document.querySelector('#usuarioForm button[type="submit"]').style.display = 'block';
    
    updateNavButtons();
    document.getElementById('usuarioModal').style.display = 'block';
}

// Cerrar modal
function closeUsuarioModal() {
    document.getElementById('usuarioModal').style.display = 'none';
    editingUsuarioId = null;
    currentUsuarioIndex = -1;
}

// Logic for Navigation Buttons
let currentUsuarioIndex = -1;


function updateNavButtons() {
    const prevBtn = document.getElementById('navPrevBtn');
    const nextBtn = document.getElementById('navNextBtn');
    const firstBtn = document.getElementById('navFirstBtn');
    const lastBtn = document.getElementById('navLastBtn');
    
    // PERMISO: Solo root puede navegar entre registros
    const isRoot = window.currentUser && window.currentUser.Usuario.toLowerCase() === 'root';
    if (!isRoot) {
        if(prevBtn) prevBtn.disabled = true;
        if(nextBtn) nextBtn.disabled = true;
        if(firstBtn) firstBtn.disabled = true;
        if(lastBtn) lastBtn.disabled = true;
        // Opcional: Ocultarlos visualmente también si se prefiere
        // document.querySelector('.modal-navigation').style.display = 'none';
        return;
    }

    if (currentUsuarioIndex === -1) {
        if(prevBtn) prevBtn.disabled = true;
        if(nextBtn) nextBtn.disabled = true;
        if(firstBtn) firstBtn.disabled = true;
        if(lastBtn) lastBtn.disabled = true;
        return;
    }
    
    if(prevBtn) prevBtn.disabled = (currentUsuarioIndex <= 0);
    if(firstBtn) firstBtn.disabled = (currentUsuarioIndex <= 0);
    if(nextBtn) nextBtn.disabled = (currentUsuarioIndex >= usuariosData.length - 1);
    if(lastBtn) lastBtn.disabled = (currentUsuarioIndex >= usuariosData.length - 1);
}

function navigateRecord(direction) {
    if (currentUsuarioIndex === -1) return;
    
    let newIndex = currentUsuarioIndex;
    if (direction === 'first') newIndex = 0;
    if (direction === 'prev') newIndex = currentUsuarioIndex - 1;
    if (direction === 'next') newIndex = currentUsuarioIndex + 1;
    if (direction === 'last') newIndex = usuariosData.length - 1;
    
    if (newIndex >= 0 && newIndex < usuariosData.length) {
        const isViewMode = document.querySelector('#usuarioForm button[type="submit"]').style.display === 'none';
        
        if (isViewMode) {
            viewUsuario(newIndex);
        } else {
            editUsuario(newIndex);
        }
    }
}

// Ver usuario (Read-only)
function viewUsuario(index) {
    currentUsuarioIndex = index;
    const usuario = usuariosData[index];
    document.getElementById('modalTitle').textContent = 'Ver Usuario';
    
    document.getElementById('usuario').value = usuario.Usuario || '';
    document.getElementById('usuario').readOnly = true;
    
    document.getElementById('email').value = usuario.Email || '';
    document.getElementById('email').readOnly = true;

    // Load Image
    const imgHtml = getImgHtml(usuario.Imagen);
    // Extract src from the html helper (hacky but reuses logic) or re-implement
    // Better to re-implement specific logic for preview:
    updatePreviewImage(usuario.Imagen);

    if(document.getElementById('password')) {
        document.getElementById('password').value = '********';
        document.getElementById('password').readOnly = true;
    }
    
    // Hide submit button
    document.querySelector('#usuarioForm button[type="submit"]').style.display = 'none';
    
    updateNavButtons();
    document.getElementById('usuarioModal').style.display = 'block';
}

// Editar usuario
function editUsuario(index) {
    currentUsuarioIndex = index;
    const usuario = usuariosData[index];
    editingUsuarioId = usuario.IDAcceso; // Nota: La PK de usuarios es IDAcceso según instrucciones
    
    document.getElementById('modalTitle').textContent = 'Editar Usuario';
    
    document.getElementById('usuario').readOnly = true;
    document.getElementById('usuario').value = usuario.Usuario || '';
    
    document.getElementById('email').value = usuario.Email || '';
    document.getElementById('email').readOnly = false;

    updatePreviewImage(usuario.Imagen);
    
    if(document.getElementById('password')) {
        document.getElementById('password').value = usuario.Password || '';
        document.getElementById('password').readOnly = false;
    }
    
    // Ensure submit button is visible
    document.querySelector('#usuarioForm button[type="submit"]').style.display = 'block';
    
    updateNavButtons();
    document.getElementById('usuarioModal').style.display = 'block';
}

// Guardar/actualizar usuario
async function submitUsuarioForm(e) {
    e.preventDefault();

    const formData = new FormData(document.getElementById('usuarioForm'));
    const usuario = Object.fromEntries(formData);

    Object.keys(usuario).forEach(key => {
        if (usuario[key] === '') {
            usuario[key] = null;
        }
    });

    try {
        if (editingUsuarioId) {
            // Keep old image if not changed? The form sends what's in inputs? 
            // File input logic need to be handled here.
            
            // If new file, use it. If not, we need to decide. 
            // With generic CRUD, 'PUT' replaces fields. If we don't send Imagen, it might set to NULL or keep it?
            // Depends on server logic. Generic one: `UPDATE table SET ?`. If key missing, it doesn't update it.
            // But FormData doesn't include file unless we read it manually.
            
            const fileInput = document.getElementById('imagenInput');
            if (fileInput.files.length > 0) {
                // Convert file to base64
                usuario.Imagen = await toBase64(fileInput.files[0]);
            } else {
               // If editing, we shouldn't send Imagen key if empty, to preserve old one.
               // Or send keys for only changed fields.
               // Since we generated `usuario` from formData text Inputs, Imagen is not there.
               // So existing `Imagen` in DB won't be touched unless we explicitly add it. 
            }

            const response = await fetch(`/api/usuarios/${editingUsuarioId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(usuario)
            });

            const data = await response.json();
            
            if (response.ok) {
                closeUsuarioModal();
                loadUsuariosData();
                showAlert('Usuario actualizado con éxito', 'success');
            } else {
                showAlert('Error al actualizar: ' + (data.error || 'Error desconocido'), 'error');
            }
        } else {
            // Validar que el usuario no exista
            const usuarioExistente = usuariosData.some(u => u.Usuario === usuario.Usuario);
            if (usuarioExistente) {
                showAlert('El nombre de usuario ya existe', 'warning');
                return;
            }
            
            const fileInput = document.getElementById('imagenInput');
            if (fileInput.files.length > 0) {
                usuario.Imagen = await toBase64(fileInput.files[0]);
            }

            const response = await fetch('/api/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(usuario)
            });

            const data = await response.json();
            
            if (response.ok) {
                closeUsuarioModal();
                loadUsuariosData();
                showAlert('Usuario creado con éxito', 'success');
            } else {
                showAlert('Error al crear: ' + (data.error || 'Error desconocido'), 'error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación', 'error');
    }
}

// Eliminar usuario
async function deleteUsuario(index) {
    const usuario = usuariosData[index];
    
    if (!await showConfirm(`¿Eliminar usuario "${usuario.Usuario}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/usuarios/${usuario.IDAcceso}`, { // Usando IDAcceso
            method: 'DELETE'
        });

        if (response.ok) {
            showAlert('Usuario eliminado correctamente', 'success');
            loadUsuariosData();
        } else {
            const data = await response.json().catch(() => ({}));
            showAlert(data.error || 'Error al eliminar usuario', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al eliminar usuario', 'error');
    }
}

// Inicializar acordeón del menú

// (Funciones de acordeón eliminadas para usar las de main.js)

// --- GESTIÓN DE BORRADO MASIVO ---

function setupBulkDelete() {
    const selectAll = document.getElementById('selectAll');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

    if (selectAll) {
        selectAll.addEventListener('change', () => {
            const checkboxes = document.querySelectorAll('.row-checkbox');
            checkboxes.forEach(cb => {
                // Solo marcar las habilitadas (esto respeta mis permisos)
                if (!cb.disabled) {
                    cb.checked = selectAll.checked;
                }
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

    if (!await showConfirm(`¿Estás seguro de que deseas eliminar ${ids.length} usuarios permanentemente?`)) {
        return;
    }

    try {
        const response = await fetch('/api/usuarios/bulk-delete', {
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
            
            showAlert(`Se han eliminado ${data.affectedRows || ids.length} usuarios.`, 'success');
            
            // Recargar datos
            loadUsuariosData();
        } else {
            showAlert('Error al eliminar registros: ' + (data.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error en la operación de eliminación masiva', 'error');
    }
}
// Helper to preview image in modal
function updatePreviewImage(imagen) {
    const preview = document.getElementById('imagePreview');
    const placeholder = document.getElementById('imagePlaceholder');
    
    if (imagen) {
        let src = '';
        if (imagen.type === 'Buffer') {
            try {
                src = new TextDecoder("utf-8").decode(new Uint8Array(imagen.data));
            } catch (e) {
                 src = String.fromCharCode.apply(null, imagen.data);
            }
        } else {
            src = imagen;
        }
        preview.src = src;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        preview.src = '';
        preview.style.display = 'none';
        placeholder.style.display = 'block';
    }
}

// Helper: File to Base64
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});
