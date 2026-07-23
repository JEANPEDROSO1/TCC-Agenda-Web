document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.auth-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Cria um elemento de erro se não existir
    let errorMsg = document.getElementById('login-error');
    if (!errorMsg) {
        errorMsg = document.createElement('small');
        errorMsg.id = 'login-error';
        errorMsg.style.color = '#ef4444';
        errorMsg.style.fontWeight = 'bold';
        errorMsg.style.display = 'none';
        errorMsg.style.marginTop = '8px';
        passwordInput.parentElement.appendChild(errorMsg);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const senha = passwordInput.value;

        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, senha })
            });

            const data = await res.json();

            if (!res.ok) {
                errorMsg.textContent = data.erro || "Credenciais inválidas.";
                errorMsg.style.display = 'block';
                return;
            }

            // Salva dados locais se necessário (não salvar a senha!)
            localStorage.setItem('agendaWeb_nome', data.usuario.nome);
            localStorage.setItem('agendaWeb_cargo', data.usuario.cargo);
            if (data.usuario.foto) {
                localStorage.setItem('agendaWeb_foto', data.usuario.foto);
            }

            errorMsg.style.display = 'none';
            // Sucesso! Vai para o dashboard
            window.location.href = "dashboard.html";

        } catch (error) {
            errorMsg.textContent = "Erro de conexão com o servidor.";
            errorMsg.style.display = 'block';
            console.error(error);
        }
    });
});
