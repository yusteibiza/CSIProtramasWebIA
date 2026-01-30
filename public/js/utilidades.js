document.addEventListener('DOMContentLoaded', () => {
    const restoreBtn = document.getElementById('restoreClientesBtn');
    if (restoreBtn) {
        restoreBtn.addEventListener('click', restoreClientesDefault);
    }

    const fechaAltaBtn = document.getElementById('aplicarFechaAltaBtn');
    if (fechaAltaBtn) {
        fechaAltaBtn.addEventListener('click', aplicarFechaAlta);
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

async function aplicarFechaAlta() {
    const input = document.getElementById('fechaAltaInput');
    const statusEl = document.getElementById('fechaAltaStatus');
    const btn = document.getElementById('aplicarFechaAltaBtn');
    const fechaAlta = input ? input.value : '';
    const fechaAltaEs = formatFechaEs(fechaAlta);

    if (!fechaAlta) {
        showAlert('Selecciona una fecha válida.', 'warning');
        return;
    }

    if (!await showConfirm(`¿Aplicar la fecha ${fechaAltaEs} a todos los clientes?`)) {
        return;
    }

    if (btn) btn.disabled = true;
    if (statusEl) {
        statusEl.textContent = 'Aplicando...';
        statusEl.classList.add('loading');
        statusEl.classList.remove('success', 'error');
    }

    try {
        const response = await fetch('/api/utilidades/fecha-alta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fechaAlta })
        });
        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            const msg = `Fecha ${fechaAltaEs} aplicada a ${data.affected || 0} clientes.`;
            if (statusEl) {
                statusEl.textContent = msg;
                statusEl.classList.remove('loading');
                statusEl.classList.add('success');
            }
            showAlert(msg, 'success');
        } else {
            const message = data.error || 'Error al aplicar la fecha de alta.';
            if (statusEl) {
                statusEl.textContent = message;
                statusEl.classList.remove('loading');
                statusEl.classList.add('error');
            }
            showAlert(message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        const message = 'Error de conexión al aplicar la fecha de alta.';
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.classList.remove('loading');
            statusEl.classList.add('error');
        }
        showAlert(message, 'error');
    }

    if (btn) btn.disabled = false;
}

function formatFechaEs(fechaIso) {
    if (!fechaIso || !/^\d{4}-\d{2}-\d{2}$/.test(fechaIso)) return fechaIso;
    const [y, m, d] = fechaIso.split('-');
    return `${d}/${m}/${y}`;
}
