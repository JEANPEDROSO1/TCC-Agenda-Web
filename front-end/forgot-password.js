// Fluxo de Recuperação de Senha (Email -> OTP -> Nova Senha)
const etapas = document.querySelectorAll('.step-card');
const formEmail = document.getElementById('email-step-form');
const emailInput = document.getElementById('recovery-email'); // Precisamos garantir que esse input exista
const btnVerificar = document.getElementById('verify-code-button');
const formReset = document.getElementById('reset-password-form');
const novaSenha = document.getElementById('new-password');
const confirmaSenha = document.getElementById('confirm-new-password');
const msgFeedback = document.getElementById('password-feedback');
const regras = document.querySelectorAll('.password-checker li');
const camposCodigo = Array.from(document.querySelectorAll('.code-digit'));

let emailRecuperacao = ''; // Guarda o email entre as etapas

function mostrarEtapa(nome) {
    etapas.forEach(e => e.classList.toggle('active', e.dataset.step === nome));
}

function avaliarSenha(val) {
    const checks = { length: val.length >= 8, uppercase: /[A-Z]/.test(val), lowercase: /[a-z]/.test(val), number: /\d/.test(val), special: /[@#$%&!]/.test(val) };
    regras.forEach(r => {
        const ok = checks[r.dataset.rule];
        r.classList.toggle('valid', ok);
        r.classList.toggle('invalid', !ok && val.length > 0);
    });
    return Object.values(checks).every(Boolean);
}

// Etapa 1: Enviar Email
formEmail.addEventListener('submit', async (e) => { 
    e.preventDefault(); 
    
    // Fallback: se não tiver o ID, pega o primeiro input do tipo email no form
    const emailField = document.getElementById('recovery-email') || formEmail.querySelector('input[type="email"]');
    emailRecuperacao = emailField.value;

    try {
        const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailRecuperacao })
        });
        const data = await res.json();
        
        // Se a requisição der erro (500)
        if (!res.ok) {
            alert(data.erro || 'Erro ao enviar e-mail.');
            return;
        }

        mostrarEtapa('code'); 
    } catch (error) {
        alert('Erro de conexão.');
        console.error(error);
    }
});

// Etapa 2: Verificar Código OTP
btnVerificar.addEventListener('click', async () => {
    const codigo = camposCodigo.map(c => c.value.trim()).join('');
    
    if (codigo.length < 6) {
        msgFeedback.textContent = 'Preencha os 6 dígitos.';
        msgFeedback.classList.remove('success');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/auth/verify-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailRecuperacao, codigo })
        });
        const data = await res.json();

        if (!res.ok) {
            msgFeedback.textContent = data.erro || 'Código inválido.';
            msgFeedback.classList.remove('success');
            return;
        }

        // Se válido, vai para a última etapa
        msgFeedback.textContent = '';
        mostrarEtapa('reset');
    } catch (error) {
        msgFeedback.textContent = 'Erro de conexão.';
        console.error(error);
    }
});

camposCodigo.forEach((c, i) => {
    c.addEventListener('input', (e) => {
        const v = e.target.value.replace(/\D/g, '').slice(0, 1);
        e.target.value = v;
        if (v && i < camposCodigo.length - 1) camposCodigo[i + 1].focus();
    });
    c.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !c.value && i > 0) { camposCodigo[i - 1].focus(); camposCodigo[i - 1].value = ''; }
        else if (e.key === 'Enter') btnVerificar.click();
    });
    c.addEventListener('focus', () => c.select());
});

// Navegação de Voltar
document.getElementById('back-arrow').addEventListener('click', () => window.location.href = 'login.html');
document.getElementById('botao-voltar').addEventListener('click', () => mostrarEtapa('email'));
document.getElementById('botao-voltar-reset').addEventListener('click', () => mostrarEtapa('code'));

// Etapa 3: Redefinir a Senha
function attFeedback() {
    const valida = avaliarSenha(novaSenha.value);
    const iguais = confirmaSenha.value.length > 0 && novaSenha.value === confirmaSenha.value;
    
    if (!valida) { msgFeedback.textContent = 'A senha deve ter pelo menos 8 caracteres (A, a, 1, @).'; msgFeedback.classList.remove('success'); }
    else if (!iguais) { msgFeedback.textContent = 'As senhas não coincidem.'; msgFeedback.classList.remove('success'); }
    else { msgFeedback.textContent = 'Senha atende os requisitos.'; msgFeedback.classList.add('success'); }
}

novaSenha.addEventListener('input', attFeedback);
confirmaSenha.addEventListener('input', attFeedback);

formReset.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!avaliarSenha(novaSenha.value) || novaSenha.value !== confirmaSenha.value) {
        msgFeedback.textContent = 'Verifique os requisitos.';
        msgFeedback.classList.remove('success');
        return;
    }

    const codigo = camposCodigo.map(c => c.value.trim()).join('');

    try {
        const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailRecuperacao, codigo, novaSenha: novaSenha.value })
        });
        const data = await res.json();

        if (!res.ok) {
            msgFeedback.textContent = data.erro || 'Erro ao redefinir a senha.';
            msgFeedback.classList.remove('success');
            return;
        }

        document.getElementById('success-message').classList.add('show');
        msgFeedback.textContent = 'Senha redefinida com sucesso!';
        msgFeedback.classList.add('success');
        setTimeout(() => window.location.replace('login.html'), 2000);
    } catch (error) {
        msgFeedback.textContent = 'Erro de conexão.';
        console.error(error);
    }
});