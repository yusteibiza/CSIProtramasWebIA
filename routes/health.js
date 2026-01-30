const express = require('express');
const router = express.Router();

module.exports = (db) => {
    router.get('/db', (req, res) => {
        db.query('SELECT 1 AS ok', (err, rows) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    error: err.code || err.message
                });
            }

            res.json({
                ok: true,
                result: rows && rows[0] && rows[0].ok
            });
        });
    });

    return router;
};
