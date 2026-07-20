// Tela de Registro de Usuários
document.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const form = document.querySelector('.auth-form');
    const errorMsg = document.getElementById('register-error');
    const rules = document.querySelectorAll('#register-password-checker li');

    // Validação de senha forte em tempo real
    passwordInput.addEventListener('input', (e) => {
        const val = e.target.value;
        const checks = {
            length: val.length >= 8,
            uppercase: /[A-Z]/.test(val),
            lowercase: /[a-z]/.test(val),
            number: /[0-9]/.test(val),
            special: /[@#$!%*?&]/.test(val)
        };

        rules.forEach(li => {
            const rule = li.getAttribute('data-rule');
            if (checks[rule]) li.className = 'valid';
            else if (val.length > 0) li.className = 'invalid';
            else li.className = '';
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = usernameInput.value;
        const email = emailInput.value;
        const p1 = passwordInput.value;
        const p2 = confirmPasswordInput.value;

        const isStrong = p1.length >= 8 && /[A-Z]/.test(p1) && /[a-z]/.test(p1) && /[0-9]/.test(p1) && /[@#$!%*?&]/.test(p1);

        if (!isStrong) {
            errorMsg.textContent = "A senha não atende a todos os requisitos de segurança.";
            errorMsg.style.display = 'block';
            return;
        }

        if (p1 !== p2) {
            errorMsg.textContent = "As senhas não coincidem.";
            errorMsg.style.display = 'block';
            return;
        }

        errorMsg.style.display = 'none';

        try {
            const res = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, senha: p1 })
            });
            const data = await res.json();

            if (!res.ok) {
                errorMsg.textContent = data.erro || "Erro ao cadastrar usuário.";
                errorMsg.style.display = 'block';
                return;
            }

            alert("Cadastro realizado com sucesso!");
            window.location.href = "login.html";
        } catch (error) {
            errorMsg.textContent = "Erro de conexão com o servidor.";
            errorMsg.style.display = 'block';
            console.error(error);
        }
    });
});
