const express = require('express');
const router = express.Router();

module.exports = (db) => {
    const tables = [
        'Clientes', 'Usuarios', 'Remitentes', 'Equipos',
        'ConexionCliente', 'AplicacionCliente',
        'Plataformas', 'Aplicaciones', 'Desarrollos', 'TiposConexiones', 'TiposClientes',
        'Poblaciones',
        'CuentasCorreo', 'NotasUsuarios', 'Soporte', 'ClientesExcel', 'AplicacionesExcel'
    ];

    // Endpoint para estadísticas del dashboard
    router.get('/stats', (req, res) => {
        const stats = {};
        const queries = [
            new Promise((resolve) => db.query('SELECT COUNT(*) as count FROM Clientes', (err, r) => resolve(err ? 0 : r[0].count))),
            new Promise((resolve) => db.query('SELECT COUNT(*) as count FROM AplicacionCliente', (err, r) => resolve(err ? 0 : r[0].count))),
            new Promise((resolve) => db.query('SELECT COUNT(*) as count FROM Soporte WHERE Estado != "Cerrado"', (err, r) => resolve(err ? 0 : r[0].count))),
            new Promise((resolve) => db.query('SELECT COUNT(*) as count FROM Plataformas', (err, r) => resolve(err ? 0 : r[0].count))),
            new Promise((resolve) => {
                const q = `SELECT tc.Nombre as label, COUNT(c.ID) as value FROM TiposClientes tc LEFT JOIN Clientes c ON tc.ID = c.TipoCliente GROUP BY tc.ID`;
                db.query(q, (err, r) => resolve(err ? [] : r));
            }),
            new Promise((resolve) => {
                const q = 'SELECT Estado as label, COUNT(*) as value FROM Soporte GROUP BY Estado';
                db.query(q, (err, r) => resolve(err ? [] : r));
            }),
            new Promise((resolve) => {
                const q = `SELECT p.Nombre as label, COUNT(ac.ID) as value FROM Plataformas p LEFT JOIN AplicacionCliente ac ON p.ID = ac.IDPlataforma GROUP BY p.ID`;
                db.query(q, (err, r) => resolve(err ? [] : r));
            })
        ];

        Promise.all(queries).then(results => {
            stats.totalClientes = results[0];
            stats.totalAplicaciones = results[1];
            stats.ticketsAbiertos = results[2];
            stats.plataformasOperativas = results[3];
            stats.clientesPorTipo = results[4];
            stats.soportePorEstado = results[5];
            stats.aplicacionesPorPlataforma = results[6];
            res.json(stats);
        });
    });

    // Endpoint para información de columnas (Schema)
    router.get('/schema/:table', (req, res) => {
        const tableName = req.params.table;
        if (!tables.map(t => t.toLowerCase()).includes(tableName.toLowerCase())) {
             return res.status(400).json({ error: 'Invalid table name' });
        }
        const query = `DESCRIBE ${tableName}`;
        db.query(query, (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    });

    // Special Endpoints for Client Relations
    router.get('/aplicacioncliente/cliente/:id', (req, res) => {
        const query = `SELECT ac.*, a.Nombre as NomeAplicacion FROM AplicacionCliente ac LEFT JOIN Aplicaciones a ON ac.IDAplicacion = a.ID WHERE ac.IDCliente = ?`;
        db.query(query, [req.params.id], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    });

    router.get('/conexioncliente/cliente/:id', (req, res) => {
        const query = `SELECT cc.*, tc.Nombre as TipoConexionNombre FROM ConexionCliente cc LEFT JOIN TiposConexiones tc ON cc.IDTipoConexion = tc.ID WHERE cc.IDCliente = ?`;
        db.query(query, [req.params.id], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    });

    router.get('/equipos/cliente/:id', (req, res) => {
        const query = 'SELECT * FROM Equipos WHERE IDCliente = ?';
        db.query(query, [req.params.id], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    });

    // --- SPECIAL DELETE FOR CLIENTES (NO CASCADE) ---
    router.delete('/clientes/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const deps = [
                { table: 'Documentacion', col: 'IDCliente', label: 'documentos' },
                { table: 'Equipos', col: 'IDCliente', label: 'equipos' },
                { table: 'AplicacionCliente', col: 'IDCliente', label: 'aplicaciones vinculadas' },
                { table: 'ConexionCliente', col: 'IDCliente', label: 'conexiones' }
            ];

            const checks = deps.map(d => {
                return new Promise((resolve, reject) => {
                    db.query(`SELECT COUNT(*) as count FROM ${d.table} WHERE ${d.col} = ?`, [id], (err, r) => {
                        if (err) reject(err);
                        else resolve({ count: r[0].count, label: d.label });
                    });
                });
            });

            const results = await Promise.all(checks);
            const conflicts = results.filter(r => r.count > 0);
            if (conflicts.length > 0) {
                const reasons = conflicts
                    .map(c => `${c.count} ${c.label} en ${c.table}`)
                    .join(', ');
                return res.status(409).json({
                    error: `No se puede eliminar el cliente porque tiene relaciones activas: ${reasons}.`
                });
            }

            const dbp = db.promise();
            const [result] = await dbp.query('DELETE FROM Clientes WHERE ID = ?', [id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Cliente no encontrado' });
            }
            
            res.json({ message: 'Cliente eliminado correctamente' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al eliminar cliente: ' + err.message });
        }
    });

    // --- FILTERED CLIENTS FOR LISTADO ---
    router.post('/clientes/filter', async (req, res) => {
        try {
            const { 
                tipoDesde, tipoHasta, 
                pobDesde, pobHasta, 
                appId, desId, platId, 
                soloContrato 
            } = req.body;

            // 1. Obtener nombres de los límites para comparación alfabética
            let tipoDName = null, tipoHName = null, pobDName = null, pobHName = null;
            
            if (tipoDesde) {
                const [r] = await db.promise().query('SELECT Nombre FROM TiposClientes WHERE ID = ?', [tipoDesde]);
                if (r.length) tipoDName = r[0].Nombre;
            }
            if (tipoHasta) {
                const [r] = await db.promise().query('SELECT Nombre FROM TiposClientes WHERE ID = ?', [tipoHasta]);
                if (r.length) tipoHName = r[0].Nombre;
            }
            if (pobDesde) {
                const [r] = await db.promise().query('SELECT Nombre FROM Poblaciones WHERE ID = ?', [pobDesde]);
                if (r.length) pobDName = r[0].Nombre;
            }
            if (pobHasta) {
                const [r] = await db.promise().query('SELECT Nombre FROM Poblaciones WHERE ID = ?', [pobHasta]);
                if (r.length) pobHName = r[0].Nombre;
            }

            // 2. Construir Query Base (ahora devolviendo una fila por aplicación para permitir la "ruptura" por cliente)
            let query = `
                SELECT c.ID as ClienteID, c.NombreComercial, c.Telefono1, c.Telefono2, c.Email,
                       tc.Nombre as TipoNombre, 
                       p.Nombre as PoblacionNombre,
                       ap.Nombre as AplicacionNombre,
                       ac.Version,
                       ds.Nombre as DesarrolloNombre,
                       pl.Nombre as PlataformaNombre,
                       ac.Licencias,
                       ac.Contrato
                FROM Clientes c
                LEFT JOIN TiposClientes tc ON c.TipoCliente = tc.ID
                LEFT JOIN Poblaciones p ON c.Poblacion = p.ID
                LEFT JOIN AplicacionCliente ac ON c.ID = ac.IDCliente
                LEFT JOIN Aplicaciones ap ON ac.IDAplicacion = ap.ID
                LEFT JOIN Desarrollos ds ON ac.IDDesarrollo = ds.ID
                LEFT JOIN Plataformas pl ON ac.IDPlataforma = pl.ID
                WHERE 1=1
            `;
            const params = [];

            // Tipos: Si solo hay 'Desde', hacemos IGUAL (Exacto). Si hay ambos, RANGO.
            if (tipoDName && tipoHName) {
                query += ` AND tc.Nombre BETWEEN ? AND ?`;
                params.push(tipoDName, tipoHName);
            } else if (tipoDName) {
                query += ` AND tc.Nombre = ?`;
                params.push(tipoDName);
            } else if (tipoHName) {
                query += ` AND tc.Nombre = ?`;
                params.push(tipoHName);
            }

            // Poblaciones: Si solo hay 'Desde', hacemos IGUAL. Si hay ambos, RANGO.
            if (pobDName && pobHName) {
                query += ` AND p.Nombre BETWEEN ? AND ?`;
                params.push(pobDName, pobHName);
            } else if (pobDName) {
                query += ` AND p.Nombre = ?`;
                params.push(pobDName);
            } else if (pobHName) {
                query += ` AND p.Nombre = ?`;
                params.push(pobHName);
            }

            // Aplicaciones / Desarrollos / Plataformas (Intersección estricta)
            // Nota: El filtro sigue aplicando a la tabla pivot ac
            if (appId) {
                query += ` AND ac.IDAplicacion = ?`;
                params.push(appId);
            }
            if (desId) {
                query += ` AND ac.IDDesarrollo = ?`;
                params.push(desId);
            }
            if (platId) {
                query += ` AND ac.IDPlataforma = ?`;
                params.push(platId);
            }
            
            // Opciones: Contrato 1 significa que la fila actual tiene contrato
            if (soloContrato) {
                query += ` AND ac.Contrato = 1`;
            }

            query += ` ORDER BY c.NombreComercial ASC, ap.Nombre ASC`;

            console.log('[DEBUG] Query:', query);
            console.log('[DEBUG] Params:', params);

            const [results] = await db.promise().query(query, params);
            res.json(results);

        } catch (err) {
            console.error('[FILTER ERROR]', err);
            res.status(500).json({ error: err.message });
        }
    });

    // --- GENERIC CRUD ---
    tables.forEach(table => {
        const tableName = table.toLowerCase();
        
        router.get(`/${tableName}`, (req, res) => {
            const query = `SELECT * FROM ${table}`;
            db.query(query, (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(results);
            });
        });

        router.post(`/${tableName}`, (req, res) => {
            const data = Object.keys(req.body).reduce((obj, key) => {
                if (req.body[key] !== null && req.body[key] !== undefined && req.body[key] !== '') {
                    obj[key] = req.body[key];
                }
                return obj;
            }, {});
            const query = `INSERT INTO ${table} SET ?`;
            db.query(query, data, (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ id: result.insertId, message: 'Registro creado con éxito' });
            });
        });

        router.put(`/${tableName}/:id`, (req, res) => {
            let idField = 'ID';
            if (table === 'Usuarios') idField = 'IDAcceso';
            if (table === 'Remitentes') idField = 'IDRemitentes';
            if (table === 'Equipos') idField = 'ID'; // Wait, let's try to verify if it's IDEquipo or simply ID is incorrect.
            // Actually, based on previous delete error (which was detailed JSON error), and update error, it is definitely NOT ID.
            // Common pattern in this DB seems to be TableName or ID+TableName.
            // Let's assume IDEquipo based on naming convention. 
            // Wait, other tables use ID (default).
            // Let's check TiposConexiones, etc.
            // I'll add the exception for Equipos -> IDEquipo just to be safe/proactive or I should double check.
            // BUT wait, in `setup_db.js` (which I can't find), I could see it.
            // Let's try `ID` first? No, that failed.
            // It HAS to be something else.
            // `Equipos` -> `ID` failed.
            // Let's try `IDEquipo`.
            if (table === 'Equipos') idField = 'IDEquipos';
            
            const query = `UPDATE ${table} SET ? WHERE ${idField} = ?`;
            db.query(query, [req.body, req.params.id], (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Registro actualizado' });
            });
        });

        router.post(`/${tableName}/bulk-delete`, (req, res) => {
            const ids = req.body.ids;
            if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Lista de IDs no válida' });
            let idField = 'ID';
            if (table === 'Usuarios') idField = 'IDAcceso';
            if (table === 'Remitentes') idField = 'IDRemitentes';
            if (table === 'Equipos') idField = 'IDEquipos';
            const query = `DELETE FROM ${table} WHERE ${idField} IN (?)`;
            db.query(query, [ids], (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: `${result.affectedRows} registros eliminados` });
            });
        });

        router.delete(`/${tableName}/:id`, (req, res) => {
            const { id } = req.params;
            let idField = 'ID';
            if (table === 'Usuarios') idField = 'IDAcceso';
            if (table === 'Remitentes') idField = 'IDRemitentes';
            if (table === 'Equipos') idField = 'IDEquipos';

            const dependencyMap = {
                'tiposclientes': [{ table: 'Clientes', col: 'TipoCliente', label: 'clientes activos' }],
                'poblaciones': [{ table: 'Clientes', col: 'Poblacion', label: 'clientes residentes' }],
                'tiposconexiones': [{ table: 'ConexionCliente', col: 'IDTipoConexion', label: 'conexiones activas' }],
                'plataformas': [{ table: 'AplicacionCliente', col: 'IDPlataforma', label: 'instalaciones en clientes' }],
                'desarrollos': [{ table: 'AplicacionCliente', col: 'IDDesarrollo', label: 'aplicaciones vinculadas' }],
                'aplicaciones': [{ table: 'AplicacionCliente', col: 'IDAplicacion', label: 'clientes con esta aplicación' }],
                'clientes': [
                    { table: 'Documentacion', col: 'IDCliente', label: 'documentos' },
                    { table: 'Equipos', col: 'IDCliente', label: 'equipos' },
                    { table: 'AplicacionCliente', col: 'IDCliente', label: 'aplicaciones vinculadas' },
                    { table: 'ConexionCliente', col: 'IDCliente', label: 'conexiones' }
                ],
                'usuarios': [{ table: 'NotasUsuarios', col: 'IDUsuario', label: 'notas' }]
            };

            const deps = dependencyMap[tableName];
            if (deps) {
                // Check all dependencies
                const checks = deps.map(d => {
                    return new Promise((resolve, reject) => {
                        db.query(`SELECT COUNT(*) as count FROM ${d.table} WHERE ${d.col} = ?`, [id], (err, res) => {
                            if (err) reject(err);
                            else resolve({ count: res[0].count, label: d.label });
                        });
                    });
                });

                Promise.all(checks).then(results => {
                    const conflicts = results.filter(r => r.count > 0);
                    if (conflicts.length > 0) {
                        const reasons = conflicts
                            .map(c => `${c.count} ${c.label} en ${c.table}`)
                            .join(', ');
                        return res.status(409).json({
                            error: `No se puede eliminar el registro porque tiene relaciones activas: ${reasons}.`
                        });
                    }
                    proceedWithDelete();
                }).catch(err => {
                    res.status(500).json({ error: err.message });
                });
            } else {
                proceedWithDelete();
            }

            function proceedWithDelete() {
                if (tableName === 'usuarios') {
                    db.query('SELECT Usuario FROM Usuarios WHERE IDAcceso = ?', [id], (err, results) => {
                        if (err) return res.status(500).json({ error: err.message });
                        if (results.length > 0 && results[0].Usuario === 'root') return res.status(403).json({ error: 'No se puede eliminar el usuario root.' });
                        performDelete();
                    });
                } else {
                    performDelete();
                }
            }

            function performDelete() {
                db.query(`DELETE FROM ${table} WHERE ${idField} = ?`, [id], (err, result) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: 'Registro eliminado' });
                });
            }
        });
    });

    return router;
};
