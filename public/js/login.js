// Redundant function removed, now using main.js version

document.addEventListener('DOMContentLoaded', () => {
    // Check saved username for "Remember Me"
    const savedUser = localStorage.getItem('savedUsername');
    if (savedUser) {
        document.getElementById('username').value = savedUser;
        document.getElementById('rememberMe').checked = true;
    }

    const form = document.getElementById('loginForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const errorMsg = document.getElementById('loginError');
        const btn = form.querySelector('.btn-login');
        
        // Reset state
        errorMsg.style.display = 'none';
        btn.disabled = true;
        btn.textContent = 'Verificando...';

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('rememberMe').checked;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (data.success) {
                // 1. Guardar usuario globalmente (per user request)
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                
                // 2. Lógica "Recordar usuario"
                if (remember) {
                    localStorage.setItem('savedUsername', username);
                } else {
                    localStorage.removeItem('savedUsername');
                }

                // 3. Redireccionar al Dashboard
                window.location.href = '/dashboard.html'; 
            } else {
                showError(data.error || 'Usuario o contraseña incorrectos');
            }
        } catch (err) {
            console.error(err);
            showError('Error de conexión con el servidor');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Iniciar Sesión';
        }
    });

    function showError(msg) {
        const errorMsg = document.getElementById('loginError');
        errorMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;
        errorMsg.style.display = 'block';
    }
    
    // Forgot Password Logic with Modal
    const recoveryModal = document.getElementById('recoveryModal');
    const closeRecoveryBtn = document.getElementById('closeRecoveryBtn');
    const recoveryForm = document.getElementById('recoveryForm');
    const recoveryMsg = document.getElementById('recoveryMsg');

    document.getElementById('forgotBtn').addEventListener('click', (e) => {
        e.preventDefault();
        
        recoveryModal.style.display = 'flex';
        recoveryMsg.style.display = 'none';
        recoveryForm.style.display = 'block';

        // Always start empty, user must enter username manually
        const recoveryInput = document.getElementById('recoveryEmail');
        recoveryInput.value = '';
        
        // Focus the input
        setTimeout(() => recoveryInput.focus(), 100);
    });

    closeRecoveryBtn.addEventListener('click', () => {
        recoveryModal.style.display = 'none';
    });

    // Close on click outside
    recoveryModal.addEventListener('click', (e) => {
        if (e.target === recoveryModal) {
            recoveryModal.style.display = 'none';
        }
    });

    recoveryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('recoveryEmail').value;
        const btn = recoveryForm.querySelector('button');
        
        btn.disabled = true;
        btn.textContent = 'Enviando...';
        
        try {
            const res = await fetch('/api/recover-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            
            recoveryMsg.style.display = 'block';
            if (res.ok) {
                recoveryMsg.style.background = '#dcfce7';
                recoveryMsg.style.color = '#166534';
                recoveryMsg.innerHTML = `<i class="fas fa-check-circle"></i> ${data.message}`;
                setTimeout(() => {
                    recoveryModal.style.display = 'none';
                }, 3000);
            } else {
                recoveryMsg.style.background = '#fee2e2';
                recoveryMsg.style.color = '#ef4444';
                recoveryMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${data.error}`;
            }
        } catch (err) {
            console.error(err);
            recoveryMsg.style.display = 'block';
            recoveryMsg.innerHTML = 'Error de conexión';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Enviar Instrucciones';
        }
    });
});
