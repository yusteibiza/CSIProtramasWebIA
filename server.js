const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const bcrypt = require('bcrypt');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// Multer Storage (In-memory)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// MySQL Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

db.connect((err) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
        return;
    }
    console.log('Conectado a la base de datos MySQL en ' + process.env.DB_HOST);
    ensureRootUser();
});

// Asegurar usuario root
function ensureRootUser() {
    const rootUser = {
        Usuario: 'root',
        Password: 'Csibiza2012',
        Email: 'csi@csibiza.com'
    };

    const checkIdx = 'SELECT * FROM Usuarios WHERE Usuario = ?';
    db.query(checkIdx, [rootUser.Usuario], async (err, results) => {
        if (err) return console.error('Error verificando root:', err);
        
        if (results.length === 0) {
            console.log('Creando usuario root por defecto...');
            const insert = 'INSERT INTO Usuarios (Usuario, Password, Email) VALUES (?, ?, ?)';
            const hashed = await bcrypt.hash(rootUser.Password, 10);
            db.query(insert, [rootUser.Usuario, hashed, rootUser.Email], (err) => {
                if (err) console.error('Error creando root:', err);
                else console.log('Usuario root creado correctamente.');
            });
        } else if (results[0].Password === rootUser.Password) {
            const hashed = await bcrypt.hash(rootUser.Password, 10);
            db.query('UPDATE Usuarios SET Password = ? WHERE IDAcceso = ?', [hashed, results[0].IDAcceso], (err) => {
                if (err) console.error('Error actualizando password root:', err);
            });
        }
    });
}

// --- IMPORT MODULES ---
const configRoutes = require('./routes/config');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const documentRoutes = require('./routes/documents');
const emailRoutes = require('./routes/emails');
const utilitiesRoutes = require('./routes/utilities');
const healthRoutes = require('./routes/health');
const notesRoutes = require('./routes/notes');

// --- MOUNT ROUTES ---
app.use('/api/config', configRoutes);
app.use('/api', authRoutes(db));
app.use('/api', apiRoutes(db));
app.use('/api/documentacion', documentRoutes(db, upload));
app.use('/api', emailRoutes(db, upload));
app.use('/api/utilidades', utilitiesRoutes(db));
app.use('/api/health', healthRoutes(db));
app.use('/api/notas', notesRoutes(db));

// Start server
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
