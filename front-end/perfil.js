// Gerenciamento Avançado de Perfil e Senha
document.addEventListener('DOMContentLoaded', () => {
    const imagemPreview = document.getElementById('imagemPerfilPreview');
    const btnAlterarFoto = document.getElementById('btnAlterarFoto');
    const inputFotoPerfil = document.getElementById('inputFotoPerfil');
    const inputNome = document.getElementById('inputNomePerfil');
    const inputEmail = document.getElementById('inputEmailPerfil');
    const btnSalvarPerfil = document.getElementById('btnSalvarPerfil');
    const toastPerfil = document.getElementById('toastPerfil');

    const modalSenha = document.getElementById('modalSenha');
    const btnFecharModal = document.getElementById('btnFecharModal');
    const btnIniciarTrocaSenha = document.getElementById('btnIniciarTrocaSenha');
    
    const etapaVerificacao = document.getElementById('etapaVerificacao');
    const etapaNovaSenha = document.getElementById('etapaNovaSenha');
    const otpInputs = document.querySelectorAll('.input-otp');
    const btnVerificarCodigo = document.getElementById('btnVerificarCodigo');
    const erroCodigo = document.getElementById('erroCodigo');
    
    const inputNovaSenha = document.getElementById('inputNovaSenha');
    const inputConfirmaSenha = document.getElementById('inputConfirmaSenha');
    const btnSalvarNovaSenha = document.getElementById('btnSalvarNovaSenha');
    const erroSenha = document.getElementById('erroSenha');

    function carregarDados() {
        inputNome.value = localStorage.getItem('agendaWeb_nome') || 'Usuário Exemplo';
        inputEmail.value = 'usuario@email.com';
        const fotoSalva = localStorage.getItem('agendaWeb_foto');
        if (fotoSalva && !fotoSalva.includes('avatar-padrao')) imagemPreview.src = fotoSalva;
    }

    // Cropper de Foto
    let cropper = null;
    const modalCropFoto = document.getElementById('modalCropFoto');
    const imageToCrop = document.getElementById('imageToCrop');
    const btnCancelarCrop = document.getElementById('btnCancelarCrop');
    const btnConfirmarCrop = document.getElementById('btnConfirmarCrop');
    const modalVisualizarFoto = document.getElementById('modalVisualizarFoto');

    btnAlterarFoto.addEventListener('click', (e) => { e.stopPropagation(); inputFotoPerfil.click(); });
    document.querySelector('.container-imagem').addEventListener('click', (e) => {
        if (e.target.closest('#btnAlterarFoto') || e.target.closest('#inputFotoPerfil')) return;
        document.getElementById('imgViewer').src = imagemPreview.src;
        modalVisualizarFoto.classList.remove('hidden');
    });
    document.getElementById('btnFecharViewer').addEventListener('click', () => modalVisualizarFoto.classList.add('hidden'));

    inputFotoPerfil.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imageToCrop.src = event.target.result;
                modalCropFoto.classList.remove('hidden');
                if (cropper) cropper.destroy();
                cropper = new Cropper(imageToCrop, { aspectRatio: 1, viewMode: 1, dragMode: 'move', autoCropArea: 0.8, background: false });
            };
            reader.readAsDataURL(e.target.files[0]);
        }
        e.target.value = '';
    });

    btnCancelarCrop.addEventListener('click', () => { modalCropFoto.classList.add('hidden'); if(cropper) cropper.destroy(); });
    btnConfirmarCrop.addEventListener('click', () => {
        if (!cropper) return;
        imagemPreview.src = cropper.getCroppedCanvas({ width: 300, height: 300 }).toDataURL('image/jpeg');
        modalCropFoto.classList.add('hidden');
        cropper.destroy();
    });

    btnSalvarPerfil.addEventListener('click', () => {
        if (inputNome.value.trim()) localStorage.setItem('agendaWeb_nome', inputNome.value.trim());
        if (imagemPreview.src.startsWith('data:image')) {
            try { localStorage.setItem('agendaWeb_foto', imagemPreview.src); } catch(e) {}
        }
        mostrarToast("Informações atualizadas com sucesso!");
    });

    // Troca de Senha (Modal e OTP)
    function abrirModal() {
        modalSenha.classList.remove('hidden');
        etapaVerificacao.classList.remove('hidden');
        etapaNovaSenha.classList.add('hidden');
        otpInputs.forEach(input => input.value = '');
        erroCodigo.classList.add('hidden');
        setTimeout(() => otpInputs[0].focus(), 100);
    }
    function fecharModal() {
        modalSenha.classList.add('hidden');
        inputNovaSenha.value = inputConfirmaSenha.value = '';
        erroSenha.classList.add('hidden');
    }

    btnIniciarTrocaSenha.addEventListener('click', abrirModal);
    btnFecharModal.addEventListener('click', fecharModal);

    otpInputs.forEach((input, index) => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) otpInputs[index - 1].focus();
            else if (e.key === 'Enter') btnVerificarCodigo.click();
        });
        input.addEventListener('input', () => { if (input.value && index < otpInputs.length - 1) otpInputs[index + 1].focus(); });
    });

    btnVerificarCodigo.addEventListener('click', () => {
        const codigo = Array.from(otpInputs).map(i => i.value).join('');
        if (codigo === '123456') {
            erroCodigo.classList.add('hidden');
            etapaVerificacao.classList.add('hidden');
            etapaNovaSenha.classList.remove('hidden');
        } else erroCodigo.classList.remove('hidden');
    });

    // Validação de Senha Forte
    const rules = document.querySelectorAll('#perfil-password-checker li');
    inputNovaSenha.addEventListener('input', (e) => {
        const val = e.target.value;
        const checks = { length: val.length >= 8, uppercase: /[A-Z]/.test(val), lowercase: /[a-z]/.test(val), number: /[0-9]/.test(val), special: /[@#$!%*?&]/.test(val) };
        rules.forEach(li => {
            const rule = li.getAttribute('data-rule');
            if (checks[rule]) li.className = 'valid';
            else if (val.length > 0) li.className = 'invalid';
            else li.className = '';
        });
    });

    btnSalvarNovaSenha.addEventListener('click', () => {
        const s1 = inputNovaSenha.value;
        if (!(s1.length >= 8 && /[A-Z]/.test(s1) && /[a-z]/.test(s1) && /[0-9]/.test(s1) && /[@#$!%*?&]/.test(s1))) {
            erroSenha.textContent = "A senha não atende aos requisitos.";
            erroSenha.classList.remove('hidden');
            return;
        }
        if (s1 !== inputConfirmaSenha.value) {
            erroSenha.textContent = "As senhas não coincidem.";
            erroSenha.classList.remove('hidden');
            return;
        }
        erroSenha.classList.add('hidden');
        fecharModal();
        mostrarToast("Senha alterada com segurança!");
    });

    function mostrarToast(msg) {
        toastPerfil.textContent = msg;
        toastPerfil.classList.add('mostrar');
        setTimeout(() => toastPerfil.classList.remove('mostrar'), 3000);
    }

    window.addEventListener('click', (e) => {
        if (e.target === modalSenha) fecharModal();
        if (e.target === modalVisualizarFoto) modalVisualizarFoto.classList.add('hidden');
        if (e.target === modalCropFoto) btnCancelarCrop.click();
    });

    carregarDados();
});
