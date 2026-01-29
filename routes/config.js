const express = require('express');
const router = express.Router();

const fs = require('fs');
const path = require('path');

// API para obtener la configuración inicial del tema
router.get('/theme', (req, res) => {
    res.json({ defaultTheme: process.env.DEFAULT_THEME || 'light' });
});

// API para obtener config del modal
router.get('/modal', (req, res) => {
    let layout = null;
    try {
        if (process.env.CLIENTE_MODAL_LAYOUT) {
            layout = JSON.parse(process.env.CLIENTE_MODAL_LAYOUT);
        }
    } catch (e) {
        console.error("Error parsing modal layout:", e);
    }
    res.json({ layout });
});

// API para guardar config del modal
router.post('/modal', (req, res) => {
    const layout = req.body;
    const value = layout ? JSON.stringify(layout) : '';
    
    // Update process.env immediatley
    if (layout) {
        process.env.CLIENTE_MODAL_LAYOUT = value;
    } else {
        delete process.env.CLIENTE_MODAL_LAYOUT;
    }

    // Persist to .env file
    const envPath = path.resolve(__dirname, '../.env');
    
    fs.readFile(envPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading .env:', err);
            return res.status(500).json({ error: 'Failed to read .env' });
        }

        const lines = data.split('\n');
        let found = false;
        const newLines = lines.map(line => {
            if (line.startsWith('CLIENTE_MODAL_LAYOUT=')) {
                found = true;
                return `CLIENTE_MODAL_LAYOUT=${value}`;
            }
            return line;
        });

        if (!found && layout) {
            newLines.push(`CLIENTE_MODAL_LAYOUT=${value}`);
        }

        fs.writeFile(envPath, newLines.join('\n'), (err) => {
            if (err) {
                console.error('Error writing .env:', err);
                return res.status(500).json({ error: 'Failed to write .env' });
            }
            res.json({ success: true, layout });
        });
    });
});

module.exports = router;
