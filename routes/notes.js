const express = require('express');
const router = express.Router();

module.exports = (db) => {
    const ensureUserExists = (userId) => {
        return new Promise((resolve, reject) => {
            db.query('SELECT IDAcceso FROM Usuarios WHERE IDAcceso = ?', [userId], (err, rows) => {
                if (err) return reject(err);
                resolve(rows && rows.length > 0);
            });
        });
    };

    router.get('/usuario/:id', async (req, res) => {
        const userId = parseInt(req.params.id, 10);
        if (!userId) return res.status(400).json({ error: 'ID de usuario inválido' });

        try {
            const exists = await ensureUserExists(userId);
            if (!exists) return res.status(404).json({ error: 'Usuario no encontrado' });

            db.query(
                'SELECT IDNotasUsuarios, IDUsuario, Nota FROM NotasUsuarios WHERE IDUsuario = ? ORDER BY IDNotasUsuarios DESC',
                [userId],
                (err, rows) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json(rows);
                }
            );
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.post('/', async (req, res) => {
        const { IDUsuario, Nota } = req.body || {};
        const userId = parseInt(IDUsuario, 10);
        const noteText = typeof Nota === 'string' ? Nota.trim() : '';

        if (!userId) return res.status(400).json({ error: 'ID de usuario inválido' });
        if (!noteText) return res.status(400).json({ error: 'La nota no puede estar vacía' });

        try {
            const exists = await ensureUserExists(userId);
            if (!exists) return res.status(404).json({ error: 'Usuario no encontrado' });

            db.query(
                'INSERT INTO NotasUsuarios (IDUsuario, Nota) VALUES (?, ?)',
                [userId, noteText],
                (err, result) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ id: result.insertId, message: 'Nota creada' });
                }
            );
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.put('/:id', async (req, res) => {
        const noteId = parseInt(req.params.id, 10);
        const { IDUsuario, Nota } = req.body || {};
        const userId = parseInt(IDUsuario, 10);
        const noteText = typeof Nota === 'string' ? Nota.trim() : '';

        if (!noteId) return res.status(400).json({ error: 'ID de nota inválido' });
        if (!userId) return res.status(400).json({ error: 'ID de usuario inválido' });
        if (!noteText) return res.status(400).json({ error: 'La nota no puede estar vacía' });

        try {
            const exists = await ensureUserExists(userId);
            if (!exists) return res.status(404).json({ error: 'Usuario no encontrado' });

            db.query(
                'UPDATE NotasUsuarios SET Nota = ? WHERE IDNotasUsuarios = ? AND IDUsuario = ?',
                [noteText, noteId, userId],
                (err, result) => {
                    if (err) return res.status(500).json({ error: err.message });
                    if (result.affectedRows === 0) {
                        return res.status(404).json({ error: 'Nota no encontrada' });
                    }
                    res.json({ message: 'Nota actualizada' });
                }
            );
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.delete('/:id', async (req, res) => {
        const noteId = parseInt(req.params.id, 10);
        const { IDUsuario } = req.body || {};
        const userId = parseInt(IDUsuario, 10);

        if (!noteId) return res.status(400).json({ error: 'ID de nota inválido' });
        if (!userId) return res.status(400).json({ error: 'ID de usuario inválido' });

        try {
            const exists = await ensureUserExists(userId);
            if (!exists) return res.status(404).json({ error: 'Usuario no encontrado' });

            db.query(
                'DELETE FROM NotasUsuarios WHERE IDNotasUsuarios = ? AND IDUsuario = ?',
                [noteId, userId],
                (err, result) => {
                    if (err) return res.status(500).json({ error: err.message });
                    if (result.affectedRows === 0) {
                        return res.status(404).json({ error: 'Nota no encontrada' });
                    }
                    res.json({ message: 'Nota eliminada' });
                }
            );
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.delete('/usuario/:id', async (req, res) => {
        const userId = parseInt(req.params.id, 10);
        if (!userId) return res.status(400).json({ error: 'ID de usuario inválido' });

        try {
            const exists = await ensureUserExists(userId);
            if (!exists) return res.status(404).json({ error: 'Usuario no encontrado' });

            db.query(
                'DELETE FROM NotasUsuarios WHERE IDUsuario = ?',
                [userId],
                (err, result) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: 'Notas eliminadas', affected: result.affectedRows });
                }
            );
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
