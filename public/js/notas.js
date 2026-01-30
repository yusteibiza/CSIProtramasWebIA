document.addEventListener('DOMContentLoaded', () => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = '/login.html';
        return;
    }

    stripCustomSelects(document);

    const addBtn = document.getElementById('addNoteBtn');
    if (addBtn) addBtn.addEventListener('click', () => createNote(currentUser));
    const deleteAllBtn = document.getElementById('deleteAllNotesBtn');
    if (deleteAllBtn) deleteAllBtn.addEventListener('click', () => deleteAllNotes(currentUser));

    bindToolbar(document.querySelector('.note-toolbar'), document.getElementById('newNoteText'));
    bindColorPicker(document.getElementById('newNoteColorPicker'));
    resetColorPicker(document.getElementById('newNoteColorPicker'));
    loadNotes(currentUser);
});

function stripCustomSelects(scope) {
    const root = scope || document;
    root.querySelectorAll('.note-toolbar .custom-select-wrapper').forEach(wrapper => {
        const select = wrapper.querySelector('select');
        if (!select) return;
        select.classList.remove('custom-select-hidden');
        wrapper.parentNode.insertBefore(select, wrapper);
        wrapper.remove();
    });
}

function getCurrentUser() {
    try {
        const raw = localStorage.getItem('currentUser');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

async function loadNotes(user) {
    const board = document.getElementById('notesBoard');
    if (!board) return;

    try {
        const res = await fetch(`/api/notas/usuario/${user.IDAcceso}`);
        const data = await res.json();
        if (!res.ok) {
            showAlert(data.error || 'Error al cargar notas', 'error');
            return;
        }
        renderNotes(data);
    } catch (err) {
        console.error(err);
        showAlert('Error de conexión al cargar notas', 'error');
    }
}

function renderNotes(notes) {
    const board = document.getElementById('notesBoard');
    board.innerHTML = '';

    if (!Array.isArray(notes) || notes.length === 0) {
        board.innerHTML = '<div class="empty-state">No hay notas todavía.</div>';
        return;
    }

    notes.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.dataset.id = note.IDNotasUsuarios;

        card.innerHTML = `
            <div class="note-toolbar">
                <button type="button" class="note-btn" data-cmd="bold" title="Negrita"><i class="fas fa-bold"></i></button>
                <button type="button" class="note-btn" data-cmd="italic" title="Cursiva"><i class="fas fa-italic"></i></button>
                <button type="button" class="note-btn" data-cmd="underline" title="Subrayado"><i class="fas fa-underline"></i></button>
                <span class="note-sep"></span>
                <button type="button" class="note-btn" data-cmd="insertUnorderedList" title="Lista"><i class="fas fa-list-ul"></i></button>
                <button type="button" class="note-btn" data-cmd="insertOrderedList" title="Lista numerada"><i class="fas fa-list-ol"></i></button>
                <span class="note-sep"></span>
                <button type="button" class="note-btn" data-cmd="justifyLeft" title="Alinear izquierda"><i class="fas fa-align-left"></i></button>
                <button type="button" class="note-btn" data-cmd="justifyCenter" title="Centrar"><i class="fas fa-align-center"></i></button>
                <button type="button" class="note-btn" data-cmd="justifyRight" title="Alinear derecha"><i class="fas fa-align-right"></i></button>
                <span class="note-sep"></span>
                <button type="button" class="note-btn" data-cmd="removeFormat" title="Quitar formato"><i class="fas fa-eraser"></i></button>
                <span class="note-sep"></span>
                <select class="note-select note-font no-custom" data-cmd="fontName" title="Fuente">
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Tahoma">Tahoma</option>
                    <option value="Courier New">Courier New</option>
                </select>
                <select class="note-select note-size no-custom" data-cmd="fontSize" title="Tamaño">
                    <option value="2">12</option>
                    <option value="3" selected>14</option>
                    <option value="4">16</option>
                    <option value="5">18</option>
                    <option value="6">22</option>
                </select>
                <div class="note-color-inline">
                    <span class="note-color-label">Color</span>
                    <div class="note-color-picker">
                        <button type="button" class="note-color-btn" data-color="sand" title="Arena"></button>
                        <button type="button" class="note-color-btn" data-color="mint" title="Menta"></button>
                        <button type="button" class="note-color-btn" data-color="sky" title="Cielo"></button>
                        <button type="button" class="note-color-btn" data-color="rose" title="Rosa"></button>
                        <button type="button" class="note-color-btn" data-color="lavender" title="Lavanda"></button>
                    </div>
                </div>
            </div>
            <div class="note-text" contenteditable="true"></div>
            <div class="note-actions">
                <button class="btn btn-secondary btn-note-save"><i class="fas fa-save"></i> Guardar</button>
                <button class="btn btn-delete btn-note-delete"><i class="fas fa-trash"></i> Borrar</button>
            </div>
        `;

        const saveBtn = card.querySelector('.btn-note-save');
        const deleteBtn = card.querySelector('.btn-note-delete');
        const textArea = card.querySelector('.note-text');
        const colorPicker = card.querySelector('.note-color-picker');

        const parsed = parseNoteHtml(note.Nota || '');
        textArea.innerHTML = parsed.html;
        applyCardColor(card, parsed.color || 'sand');
        setPickerSelected(colorPicker, parsed.color || 'sand');

        bindToolbar(card.querySelector('.note-toolbar'), textArea);
        bindColorPicker(colorPicker, (color) => applyCardColor(card, color));
        saveBtn.addEventListener('click', () => updateNote(note.IDNotasUsuarios, wrapNoteHtml(textArea.innerHTML, getSelectedColor(colorPicker) || 'sand')));
        deleteBtn.addEventListener('click', () => deleteNote(note.IDNotasUsuarios));

        board.appendChild(card);
    });

    stripCustomSelects(board);
}

async function createNote(user) {
    const input = document.getElementById('newNoteText');
    const statusEl = document.getElementById('notesStatus');
    const text = input ? input.textContent.trim() : '';
    const html = input ? input.innerHTML.trim() : '';
    const color = getSelectedColor(document.getElementById('newNoteColorPicker')) || 'sand';

    if (!text) {
        showAlert('Escribe un texto para la nota.', 'warning');
        return;
    }

    try {
        const res = await fetch('/api/notas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ IDUsuario: user.IDAcceso, Nota: wrapNoteHtml(html, color) })
        });
        const data = await res.json();
        if (!res.ok) {
            showAlert(data.error || 'Error al crear la nota', 'error');
            return;
        }
        if (input) input.innerHTML = '';
        if (statusEl) {
            statusEl.textContent = 'Nota añadida';
            statusEl.classList.add('success');
            setTimeout(() => statusEl.textContent = '', 1500);
        }
        resetColorPicker(document.getElementById('newNoteColorPicker'));
        loadNotes(user);
    } catch (err) {
        console.error(err);
        showAlert('Error de conexión al crear la nota', 'error');
    }
}

async function updateNote(noteId, text) {
    const user = getCurrentUser();
    if (!user) return;
    const stripped = stripHtml(text || '').trim();
    if (!stripped) {
        showAlert('La nota no puede estar vacía', 'warning');
        return;
    }

    try {
        const res = await fetch(`/api/notas/${noteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ IDUsuario: user.IDAcceso, Nota: text })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            showAlert(data.error || 'Error al actualizar la nota', 'error');
            return;
        }
        showAlert('Nota actualizada', 'success');
    } catch (err) {
        console.error(err);
        showAlert('Error de conexión al actualizar la nota', 'error');
    }
}

async function deleteNote(noteId) {
    const user = getCurrentUser();
    if (!user) return;
    if (!await showConfirm('¿Eliminar esta nota?')) return;

    try {
        const res = await fetch(`/api/notas/${noteId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ IDUsuario: user.IDAcceso })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            showAlert(data.error || 'Error al eliminar la nota', 'error');
            return;
        }
        loadNotes(user);
        showAlert('Nota eliminada', 'success');
    } catch (err) {
        console.error(err);
        showAlert('Error de conexión al eliminar la nota', 'error');
    }
}

async function deleteAllNotes(user) {
    if (!user) return;
    if (!await showConfirm('¿Borrar todas las notas? Esta acción no se puede deshacer.')) return;

    try {
        const res = await fetch(`/api/notas/usuario/${user.IDAcceso}`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            showAlert(data.error || 'Error al borrar todas las notas', 'error');
            return;
        }
        showAlert('Todas las notas se han eliminado', 'success');
        loadNotes(user);
    } catch (err) {
        console.error(err);
        showAlert('Error de conexión al borrar todas las notas', 'error');
    }
}

function bindToolbar(toolbar, editor) {
    if (!toolbar || !editor) return;
    toolbar.querySelectorAll('.note-btn[data-cmd]').forEach(btn => {
        btn.addEventListener('click', () => {
            const cmd = btn.getAttribute('data-cmd');
            editor.focus();
            document.execCommand(cmd, false, null);
        });
    });

    toolbar.querySelectorAll('select[data-cmd]').forEach(select => {
        select.addEventListener('change', () => {
            const cmd = select.getAttribute('data-cmd');
            const value = select.value;
            editor.focus();
            document.execCommand(cmd, false, value);
        });
    });
}

function bindColorPicker(picker, onSelect) {
    if (!picker) return;
    picker.querySelectorAll('.note-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            picker.querySelectorAll('.note-color-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            const color = btn.getAttribute('data-color');
            if (onSelect) onSelect(color);
        });
    });
}

function getSelectedColor(picker) {
    if (!picker) return null;
    const selected = picker.querySelector('.note-color-btn.selected');
    return selected ? selected.getAttribute('data-color') : null;
}

function resetColorPicker(picker) {
    if (!picker) return;
    picker.querySelectorAll('.note-color-btn').forEach(b => b.classList.remove('selected'));
    const first = picker.querySelector('.note-color-btn[data-color="sand"]');
    if (first) first.classList.add('selected');
}

function setPickerSelected(picker, color) {
    if (!picker) return;
    picker.querySelectorAll('.note-color-btn').forEach(b => b.classList.remove('selected'));
    const btn = picker.querySelector(`.note-color-btn[data-color="${color}"]`);
    if (btn) btn.classList.add('selected');
}

function applyCardColor(card, color) {
    if (!card) return;
    const palette = getColorPalette(color);
    card.style.setProperty('--note-c1', palette.c1);
    card.style.setProperty('--note-c2', palette.c2);
    card.style.setProperty('--note-b', palette.b);
    card.style.setProperty('--note-dark-c1', palette.dc1);
    card.style.setProperty('--note-dark-c2', palette.dc2);
    card.style.setProperty('--note-dark-b', palette.db);
}

function getColorPalette(color) {
    const palettes = {
        sand: { c1: '#fff3b0', c2: '#ffe79a', b: '#f0d46a', dc1: '#5a4a12', dc2: '#3f330c', db: '#6b5615' },
        mint: { c1: '#dcfce7', c2: '#bbf7d0', b: '#86efac', dc1: '#163227', dc2: '#0f241b', db: '#1f3a2b' },
        sky: { c1: '#e0f2fe', c2: '#bae6fd', b: '#7dd3fc', dc1: '#0f2437', dc2: '#0a1a28', db: '#1b3a52' },
        rose: { c1: '#ffe4e6', c2: '#fecdd3', b: '#fda4af', dc1: '#34141a', dc2: '#240e12', db: '#4b1e26' },
        lavender: { c1: '#ede9fe', c2: '#ddd6fe', b: '#c4b5fd', dc1: '#251c3c', dc2: '#1a142b', db: '#3a2f55' }
    };
    return palettes[color] || palettes.sand;
}

function wrapNoteHtml(html, color) {
    const safeColor = color || 'sand';
    return `<div data-note-color="${safeColor}">${html}</div>`;
}

function parseNoteHtml(html) {
    const match = (html || '').match(/data-note-color=\"([^\"]+)\"/i);
    const color = match ? match[1] : 'sand';
    const stripped = (html || '').replace(/^<div[^>]*>/i, '').replace(/<\/div>$/i, '');
    return { color, html: stripped };
}

function stripHtml(html) {
    return (html || '').replace(/<[^>]*>/g, '');
}
