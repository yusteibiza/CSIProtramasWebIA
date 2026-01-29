document.addEventListener('DOMContentLoaded', () => {
    const restoreBtn = document.getElementById('restoreClientesBtn');
    if (restoreBtn) {
        restoreBtn.addEventListener('click', restoreClientesDefault);
    }
});

async function restoreClientesDefault() {
    const statusEl = document.getElementById('restoreStatus');
    const restoreBtn = document.getElementById('restoreClientesBtn');
    if (!await showConfirm('¿Confirmas la recuperación de clientes por defecto? Esta acción eliminará todos los clientes actuales.')) {
        return;
    }

    if (restoreBtn) restoreBtn.disabled = true;
    if (statusEl) {
        statusEl.textContent = 'Procesando...';
        statusEl.classList.add('loading');
    }

    try {
        const response = await fetch('/api/utilidades/recuperar-clientes', { method: 'POST' });
        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            const summary = `Importados ${data.inserted} clientes (origen: ${data.source}).`;
            if (statusEl) {
                statusEl.textContent = summary;
                statusEl.classList.remove('loading');
                statusEl.classList.add('success');
            }
            showAlert(summary, 'success');
        } else {
            const message = data.error || 'Error al recuperar clientes por defecto.';
            if (statusEl) {
                statusEl.textContent = message;
                statusEl.classList.remove('loading');
                statusEl.classList.add('error');
            }
            showAlert(message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        const message = 'Error de conexión al recuperar clientes por defecto.';
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.classList.remove('loading');
            statusEl.classList.add('error');
        }
        showAlert(message, 'error');
    }

    if (restoreBtn) restoreBtn.disabled = false;
}
