const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

module.exports = (db, upload) => {
    // Obtener documentación de un cliente
    router.get('/cliente/:id', (req, res) => {
        const query = 'SELECT IDDocumentacion, IDCliente, NombreArchivo, Descripcion, TamArchivo, FechaSubida FROM Documentacion WHERE IDCliente = ?';
        db.query(query, [req.params.id], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    });

    // SUBIR documento
    router.post('/upload', upload.single('archivo'), (req, res) => {
        const { IDCliente, Descripcion } = req.body;
        if (!req.file) return res.status(400).json({ error: 'No se ha subido ningún archivo' });

        const query = 'INSERT INTO Documentacion (IDCliente, NombreArchivo, Descripcion, Buffer, TamArchivo) VALUES (?, ?, ?, ?, ?)';
        db.query(query, [IDCliente, req.file.originalname, Descripcion || '', req.file.buffer, req.file.size], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Archivo subido con éxito', id: result.insertId });
        });
    });

    // DESCARGAR documento
    router.get('/download/:id', (req, res) => {
        const query = 'SELECT NombreArchivo, Buffer FROM Documentacion WHERE IDDocumentacion = ?';
        db.query(query, [req.params.id], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0) return res.status(404).json({ error: 'Archivo no encontrado' });

            const file = results[0];
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${file.NombreArchivo}"`);
            res.send(file.Buffer);
        });
    });

    // ELIMINAR documento
    router.delete('/:id', (req, res) => {
        const query = 'DELETE FROM Documentacion WHERE IDDocumentacion = ?';
        db.query(query, [req.params.id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Documento eliminado' });
        });
    });

    // ACTUALIZAR descripción
    router.put('/:id', (req, res) => {
        const { Descripcion } = req.body;
        const query = 'UPDATE Documentacion SET Descripcion = ? WHERE IDDocumentacion = ?';
        db.query(query, [Descripcion, req.params.id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Descripción actualizada' });
        });
    });

    // ABRIR documento en programa predeterminado (Sistema Local)
    router.post('/open/:id', (req, res) => {
        const query = 'SELECT NombreArchivo, Buffer FROM Documentacion WHERE IDDocumentacion = ?';
        db.query(query, [req.params.id], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0) return res.status(404).json({ error: 'Archivo no encontrado' });

            const file = results[0];
            const tempDir = path.join(__dirname, '../temp_docs');
            
            // Asegurar que el directorio temporal existe
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const safeName = path.basename(file.NombreArchivo || 'documento');
            const filePath = path.join(tempDir, `${req.params.id}-${safeName}`);

            try {
                fs.writeFileSync(filePath, file.Buffer);
                
                // Comando para abrir según SO (Asumimos Windows por el contexto del usuario)
                const args = ['/c', 'start', '', filePath];
                execFile('cmd', args, (error) => {
                    if (error) {
                        console.error('Error al abrir archivo:', error);
                        return res.status(500).json({ error: 'No se pudo abrir el archivo' });
                    }
                    res.json({ message: 'Archivo abierto correctamente' });
                });
            } catch (writeError) {
                console.error('Error escribiendo archivo temporal:', writeError);
                res.status(500).json({ error: 'Error al procesar archivo' });
            }
        });
    });

    return router;
};
