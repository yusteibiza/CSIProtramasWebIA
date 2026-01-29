// Logic for Enviar Emails
let recipientsData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadRecipients();
    loadSenders();
    setupEventHandlers();
});

// Load Senders (Remitentes)
async function loadSenders() {
    const select = document.getElementById('remitenteSelect');
    try {
        const response = await fetch('/api/remitentes');
        const data = await response.json();
        
        select.innerHTML = '<option value="">-- Seleccione un Remitente --</option>';
        data.forEach(sender => {
            const option = document.createElement('option');
            option.value = sender.IDRemitentes;
            option.textContent = `${sender.Nombre || sender.Remitente} <${sender.Remitente}>`;
            select.appendChild(option);
        });
        
        // Auto-select first if available
        if (data.length > 0) {
            select.value = data[0].IDRemitentes;
        }

    } catch (error) {
        console.error('Error loading senders:', error);
        select.innerHTML = '<option value="">Error cargando remitentes</option>';
    }
}

// Load Recipients (CuentasCorreo)
async function loadRecipients() {
    const listContainer = document.getElementById('recipientsList');
    listContainer.innerHTML = '<div style="text-align: center; color: #999;">Cargando...</div>';
    
    try {
        const response = await fetch('/api/cuentascorreo');
        const data = await response.json();
        recipientsData = data;
        renderRecipients(data);
    } catch (error) {
        console.error('Error loading recipients:', error);
        listContainer.innerHTML = '<div style="text-align: center; color: red;">Error cargando destinatarios</div>';
    }
}

function renderRecipients(data) {
    const listContainer = document.getElementById('recipientsList');
    listContainer.innerHTML = '';
    
    if (data.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; color: #999; padding: 10px;">No hay destinatarios encontrados.</div>';
        updateCount(0);
        return;
    }

    data.forEach(item => {
        // Display Text: Name <Email> or just Email
        const email = item.Direccion;
        const name = item.Nombre;
        const displayText = name ? `${name} (${email})` : email;
        const value = email;

        const div = document.createElement('div');
        div.className = 'recipient-item';
        div.innerHTML = `
            <input type="checkbox" class="recipient-checkbox" value="${value}" id="email_${item.ID}">
            <label for="email_${item.ID}" style="margin:0; cursor: pointer; flex: 1; margin-left: 10px;">${displayText}</label>
        `;
        listContainer.appendChild(div);
    });
    
    updateCount(data.length);
}

function updateCount(count) {
    document.getElementById('recipientCount').textContent = `${count} correos listados`;
}

// Event Handlers
function setupEventHandlers() {
    // Filter
    document.getElementById('filterRecipients').addEventListener('keyup', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = recipientsData.filter(item => {
            return (item.Nombre || '').toLowerCase().includes(term) || 
                   (item.Direccion || '').toLowerCase().includes(term);
        });
        renderRecipients(filtered);
    });

    // Select All
    document.getElementById('selectAllBtn').addEventListener('click', () => {
        document.querySelectorAll('.recipient-checkbox').forEach(cb => cb.checked = true);
        toggleBtnState('selectAllBtn');
    });

    // Deselect All
    document.getElementById('deselectAllBtn').addEventListener('click', () => {
        document.querySelectorAll('.recipient-checkbox').forEach(cb => cb.checked = false);
        toggleBtnState('deselectAllBtn');
    });

    // Form Submit
    document.getElementById('emailForm').addEventListener('submit', handleSend);
}

function toggleBtnState(activeId) {
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(activeId).classList.add('active');
    setTimeout(() => {
         document.getElementById(activeId).classList.remove('active');
    }, 200);
}

async function handleSend(e) {
    e.preventDefault();
    
    const sendBtn = document.getElementById('sendBtn');
    const originalBtnText = sendBtn.innerHTML;
    
    // 1. Get Selected Recipients
    const selectedCheckboxes = document.querySelectorAll('.recipient-checkbox:checked');
    const recipients = Array.from(selectedCheckboxes).map(cb => cb.value);
    
    if (recipients.length === 0) {
        showAlert('Por favor, selecciona al menos un destinatario.', 'warning');
        return;
    }

    const remitenteId = document.getElementById('remitenteSelect').value;
    if (!remitenteId) {
        showAlert('Por favor, selecciona un remitente.', 'warning');
        return;
    }
    
    const subject = document.getElementById('asunto').value;
    const html = $('#summernote').summernote('code'); // Get HTML from Summernote
    
    // 2. Prepare FormData (for files)
    const formData = new FormData();
    formData.append('remitenteId', remitenteId);
    formData.append('to', JSON.stringify(recipients));
    formData.append('subject', subject);
    formData.append('html', html);
    
    const fileInput = document.getElementById('attachments');
    for (let i = 0; i < fileInput.files.length; i++) {
        formData.append('attachments', fileInput.files[i]);
    }
    
    // 3. Send
    try {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        
        const response = await fetch('/api/send-email', {
            method: 'POST',
            body: formData // No Content-Type header needed for FormData, browser sets it
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('Proceso completado.\n' + result.message, 'success');
            // Optional: reset form?
            // document.getElementById('emailForm').reset();
            // $('#summernote').summernote('reset');
        } else {
            showAlert('Error al enviar: ' + (result.error || 'Desconocido'), 'error');
        }
    } catch (error) {
        console.error('Error sending:', error);
        showAlert('Error de conexión al enviar emails.', 'error');
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalBtnText;
    }
}

function openRemitentesPopup() {
    const modal = document.getElementById('embeddedRemitentesModal');
    const iframe = document.getElementById('remitentesFrame');
    
    // Set src with embedded flag to hide sidebar/header within the iframe
    iframe.src = '/remitentes.html?embedded=true';
    modal.style.display = 'block';
}

function closeRemitentesModal() {
    const modal = document.getElementById('embeddedRemitentesModal');
    const iframe = document.getElementById('remitentesFrame');
    
    modal.style.display = 'none';
    iframe.src = ''; // Clear source to stop processing
    
    // Refresh senders list in the main page
    loadSenders();
}

// Close modal if clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('embeddedRemitentesModal');
    if (event.target == modal) {
        closeRemitentesModal();
    }
}
