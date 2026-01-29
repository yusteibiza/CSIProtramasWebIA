const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = 10;
const isBcryptHash = (value) => typeof value === 'string' && value.startsWith('$2');

module.exports = (db) => {
    // Login
    router.post('/login', (req, res) => {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
        }

        const query = 'SELECT * FROM Usuarios WHERE Usuario = ?';
        db.query(query, [username], async (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            
            if (results.length > 0) {
                const user = results[0];
                let valid = false;

                if (isBcryptHash(user.Password)) {
                    valid = await bcrypt.compare(password, user.Password);
                } else {
                    valid = user.Password === password;
                    if (valid) {
                        const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
                        db.query('UPDATE Usuarios SET Password = ? WHERE IDAcceso = ?', [hashed, user.IDAcceso], () => {});
                    }
                }

                if (valid) {
                    // Remove password from response
                    delete user.Password;
                    return res.json({ success: true, user: user });
                }
            }

            res.status(401).json({ error: 'Credenciales incorrectas' });
        });
    });

    // Recuperar contraseña
    router.post('/recover-password', (req, res) => {
        const { email } = req.body;
        
        if (!email) return res.status(400).json({ error: 'Usuario o Email requerido' });

        const checkQuery = 'SELECT * FROM Usuarios WHERE Email = ? OR Usuario = ?';
        db.query(checkQuery, [email, email], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            
            if (results.length === 0) {
                return res.status(404).json({ error: 'No existe usuario con ese nombre o email' });
            }

            const user = results[0];
            const newPassword = Math.random().toString(36).slice(-8);

            const createTransporter = async () => {
                const emailUser = process.env.EMAIL_USER;
                const isConfigured = emailUser && !emailUser.includes('tu_correo');

                if (isConfigured) {
                    if (process.env.EMAIL_SERVICE) {
                        return {
                            transporter: nodemailer.createTransport({
                                service: process.env.EMAIL_SERVICE,
                                auth: {
                                    user: process.env.EMAIL_USER,
                                    pass: process.env.EMAIL_PASS
                                }
                            }),
                            from: process.env.EMAIL_USER
                        };
                    }

                    return {
                        transporter: nodemailer.createTransport({
                            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                            port: parseInt(process.env.EMAIL_PORT) || 587,
                            secure: process.env.EMAIL_SECURE === 'true',
                            auth: {
                                user: process.env.EMAIL_USER,
                                pass: process.env.EMAIL_PASS
                            },
                            tls: {
                                rejectUnauthorized: false
                            }
                        }),
                        from: process.env.EMAIL_USER
                    };
                }

                const testAccount = await nodemailer.createTestAccount();
                return {
                    transporter: nodemailer.createTransport({
                        host: testAccount.smtp.host,
                        port: testAccount.smtp.port,
                        secure: testAccount.smtp.secure,
                        auth: {
                            user: testAccount.user,
                            pass: testAccount.pass
                        }
                    }),
                    from: testAccount.user
                };
            };

            createTransporter().then(async ({ transporter, from }) => {
                const mailOptions = {
                    from: from,
                    to: user.Email,
                    subject: 'Recuperación de Contraseña - CSI Gestión',
                    html: `
                        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                            <div style="background: #1a4a8e; padding: 30px 20px; text-align: center;">
                                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Recuperación de Acceso</h1>
                            </div>
                            <div style="padding: 40px 30px; background: white;">
                                <p style="color: #475569; font-size: 16px; margin-bottom: 20px;">Hola <strong>${user.Usuario}</strong>,</p>
                                <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                                    Hemos recibido una solicitud para restablecer tu contraseña. Utiliza la siguiente credencial temporal para acceder a tu cuenta:
                                </p>
                                <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 30px;">
                                    <span style="font-family: monospace; font-size: 32px; letter-spacing: 4px; color: #1a4a8e; font-weight: bold; display: block;">${newPassword}</span>
                                </div>
                                <p style="color: #64748b; font-size: 14px; text-align: center;">
                                    Te recomendamos cambiar esta contraseña inmediatamente después de iniciar sesión.
                                </p>
                            </div>
                            <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                                <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; 2024 CSI Programas. Todos los derechos reservados.</p>
                            </div>
                        </div>
                    `
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error('Error enviando email:', error);
                        return res.status(500).json({ 
                            error: 'Error al enviar el correo. La contraseña NO ha sido cambiada. Inténtalo más tarde.'
                        });
                    }
                    
                    bcrypt.hash(newPassword, BCRYPT_ROUNDS).then((hashed) => {
                        const updateQuery = 'UPDATE Usuarios SET Password = ? WHERE IDAcceso = ?';
                        db.query(updateQuery, [hashed, user.IDAcceso], (err) => {
                            if (err) {
                                console.error('Error DB post-email:', err);
                                return res.status(500).json({ 
                                    error: 'El correo se envió pero hubo un error actualizando tu contraseña. Contacta con soporte.'
                                });
                            }

                            const previewUrl = nodemailer.getTestMessageUrl(info);
                            if (previewUrl) {
                                console.log('ðŸ“§ EMAIL ENVIADO (MODO PRUEBA):', previewUrl);
                            }

                            res.json({ success: true, message: 'Correo enviado y contraseña actualizada.' });
                        });
                    }).catch((hashErr) => {
                        console.error('Error hashing password:', hashErr);
                        res.status(500).json({ error: 'Error interno en seguridad de contraseña' });
                    });
                });

            }).catch(err => {
                console.error('Error creando transporter:', err);
                res.status(500).json({ error: 'Error interno en servicio de correo' });
            });
        });
    });

    return router;
};
