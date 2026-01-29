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

            const [delDocumentacion] = await dbp.query('DELETE FROM Documentacion');
            const [delEquipos] = await dbp.query('DELETE FROM Equipos');
            const [delAplicacion] = await dbp.query('DELETE FROM AplicacionCliente');
            const [delConexion] = await dbp.query('DELETE FROM ConexionCliente');
            const [delClientes] = await dbp.query('DELETE FROM Clientes');

            const [insertResult] = await dbp.query(`
                INSERT INTO Clientes (Codigo, NombreComercial, NombreFiscal, NIF)
                SELECT Codigo, NomComercial, NomFiscal, DNI
                FROM ClientesExcel
            `);

            await dbp.query('COMMIT');

            res.json({
                success: true,
                deleted: {
                    documentacion: delDocumentacion.affectedRows,
                    equipos: delEquipos.affectedRows,
                    aplicacioncliente: delAplicacion.affectedRows,
                    conexioncliente: delConexion.affectedRows,
                    clientes: delClientes.affectedRows
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

    return router;
};
