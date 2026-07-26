document.addEventListener('DOMContentLoaded', () => {
    const email = sessionStorage.getItem('emailVerificacao');
    
    if (!email) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('displayEmail').textContent = email;

    const codeInputs = document.querySelectorAll('.code-digit');
    const verifyButton = document.getElementById('verify-code-button');
    const resendButton = document.getElementById('resend-button');

    // Lógica dos inputs do código (mesma do forgot-password)
    codeInputs.forEach((input, index) => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value && index < codeInputs.length - 1) {
                codeInputs[index + 1].focus();
            }
            checkInputs();
        });

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value && index > 0) {
                codeInputs[index - 1].focus();
            }
        });
        
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            const text = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
            for(let i=0; i<text.length; i++) {
                if(codeInputs[i]) codeInputs[i].value = text[i];
            }
            if(text.length > 0) {
                const nextIndex = Math.min(text.length, 5);
                codeInputs[nextIndex].focus();
            }
            checkInputs();
        });
    });

    function checkInputs() {
        const allFilled = Array.from(codeInputs).every(input => input.value);
        verifyButton.disabled = !allFilled;
    }

    function getCode() {
        return Array.from(codeInputs).map(input => input.value).join('');
    }

    verifyButton.addEventListener('click', async () => {
        const codigo = getCode();
        if (codigo.length !== 6) return;
        
        verifyButton.disabled = true;
        verifyButton.textContent = 'Verificando...';

        try {
            const response = await fetch(`${API_BASE_URL}/auth/verify-account`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, codigo }),
                credentials: 'include' // Para salvar o cookie do JWT gerado
            });

            const data = await response.json();

            if (response.ok) {
                showToast(data.mensagem || 'Conta verificada!');
                
                // Salvar dados no localStorage
                localStorage.setItem('agendaWeb_cargo', data.usuario.cargo);
                localStorage.setItem('agendaWeb_nome', data.usuario.nome);
                if(data.usuario.foto) localStorage.setItem('agendaWeb_foto', data.usuario.foto);
                
                sessionStorage.removeItem('emailVerificacao');
                
                setTimeout(() => {
                    window.location.href = data.usuario.cargo === 'admin' ? 'admin.html' : 'dashboard.html';
                }, 1500);
            } else {
                showToast(data.erro, 'erro');
                verifyButton.disabled = false;
                verifyButton.textContent = 'Verificar e Entrar';
            }
        } catch (error) {
            showToast('Erro de conexão.', 'erro');
            verifyButton.disabled = false;
            verifyButton.textContent = 'Verificar e Entrar';
        }
    });

    resendButton.addEventListener('click', async () => {
        resendButton.disabled = true;
        resendButton.textContent = 'Enviando...';

        try {
            const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            
            if (response.ok) {
                showToast(data.mensagem);
                codeInputs.forEach(input => input.value = '');
                codeInputs[0].focus();
            } else {
                showToast(data.erro, 'erro');
            }
        } catch (error) {
            showToast('Erro de conexão.', 'erro');
        } finally {
            resendButton.disabled = false;
            resendButton.textContent = 'Reenviar Código';
        }
    });
});
