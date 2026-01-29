const express = require('express');
const router = express.Router();

module.exports = (db) => {
    router.post('/recuperar-clientes', async (req, res) => {
        const dbp = db.promise();
        try {
            await dbp.query('START TRANSACTION');

            const [excelCountRows] = await dbp.query('SELECT COUNT(*) as count FROM ClientesExcel');
            const excelCount = excelCountRows[0]?.count || 0;
            if (excelCount === 0) {
                await dbp.query('ROLLBACK');
                return res.status(400).json({ error: 'ClientesExcel está vacío. No hay datos para importar.' });
            }

            await dbp.query('TRUNCATE TABLE Documentacion');
            await dbp.query('TRUNCATE TABLE Equipos');
            await dbp.query('TRUNCATE TABLE AplicacionCliente');
            await dbp.query('TRUNCATE TABLE ConexionCliente');
            await dbp.query('TRUNCATE TABLE Clientes');

            const [insertResult] = await dbp.query(`
                INSERT INTO Clientes (Codigo, NombreComercial, NombreFiscal, NIF)
                SELECT Codigo, NomComercial, NomFiscal, DNI
                FROM ClientesExcel
            `);

            await dbp.query('COMMIT');

            res.json({
                success: true,
                deleted: {
                    documentacion: 0,
                    equipos: 0,
                    aplicacioncliente: 0,
                    conexioncliente: 0,
                    clientes: 0
                },
                inserted: insertResult.affectedRows,
                source: excelCount
            });
        } catch (err) {
            try {
                await dbp.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Error en rollback:', rollbackError);
            }
            res.status(500).json({ error: 'Error recuperando clientes: ' + err.message });
        }
    });

    router.post('/fecha-alta', async (req, res) => {
        const { fechaAlta } = req.body || {};
        if (!fechaAlta || !/^\d{4}-\d{2}-\d{2}$/.test(fechaAlta)) {
            return res.status(400).json({ error: 'Fecha inválida. Usa el formato YYYY-MM-DD.' });
        }

        try {
            const dbp = db.promise();
            const [result] = await dbp.query('UPDATE Clientes SET FechaAlta = ?', [fechaAlta]);
            res.json({ success: true, affected: result.affectedRows, fechaAlta });
        } catch (err) {
            res.status(500).json({ error: 'Error al actualizar fecha de alta: ' + err.message });
        }
    });

    return router;
};
