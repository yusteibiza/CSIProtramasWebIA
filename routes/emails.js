const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

module.exports = (db, upload) => {
    // Enviar correos personalizados
    router.post('/send-email', upload.array('attachments'), (req, res) => {
        const { remitenteId, to, subject, html } = req.body;
        let recipients = [];
        
        try {
            recipients = JSON.parse(to);
        } catch (e) {
            recipients = [to];
        }
        
        if (!remitenteId || recipients.length === 0) {
            return res.status(400).json({ error: 'Faltan datos requeridos (remitente o destinatarios)' });
        }

        db.query('SELECT * FROM Remitentes WHERE IDRemitentes = ?', [remitenteId], async (err, results) => {
            if (err || results.length === 0) return res.status(404).json({ error: 'Remitente no encontrado' });

            const sender = results[0];
            const secure = sender.Autenticacion == 1;
            
            let transportConfig = {
                host: sender.ServidorSMTP,
                port: sender.Puerto,
                secure: secure,
                auth: { user: sender.Usuario, pass: sender.Password },
                tls: { rejectUnauthorized: false }
            };

            let transporter = nodemailer.createTransport(transportConfig);
            const files = req.files || [];
            const attachments = files.map(file => ({
                filename: file.originalname,
                content: file.buffer
            }));

            let successCount = 0;
            let failCount = 0;

            const sendPromises = recipients.map(recipient => {
                return transporter.sendMail({
                    from: `"${sender.Nombre}" <${sender.Remitente}>`,
                    to: recipient,
                    subject: subject,
                    html: html,
                    attachments: attachments
                })
                .then(() => { successCount++; })
                .catch(error => { 
                    console.error(`Error enviando a ${recipient}:`, error);
                    failCount++; 
                });
            });

            try {
                await Promise.all(sendPromises);
                res.json({ success: true, message: `Enviados: ${successCount}. Fallidos: ${failCount}.` });
            } catch (error) {
                console.error('Error general en envío:', error);
                res.status(500).json({ error: 'Error procesando envíos' });
            }
        });
    });

    return router;
};
