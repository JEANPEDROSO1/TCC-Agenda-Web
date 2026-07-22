// Configurações e Perfil Básico
document.addEventListener('DOMContentLoaded', () => {
    const toggleTema = document.getElementById('toggleTema');
    const inputFoto = document.getElementById('inputFoto');
    const btnAlterarFoto = document.getElementById('btnAlterarFoto');
    const imagemPreview = document.getElementById('imagemPreview');
    const inputNome = document.getElementById('inputNome');
    const selectFuso = document.getElementById('selectFuso');
    const btnSalvarConfig = document.getElementById('btnSalvarConfig');
    const toastNotificacao = document.getElementById('toastNotificacao');

    function carregarConfiguracoes() {
        const modoEscuro = localStorage.getItem('agendaWeb_temaEscuro') === 'true';
        toggleTema.checked = modoEscuro;
        aplicarTemaEscuro(modoEscuro);
        
        inputNome.value = localStorage.getItem('agendaWeb_nome') || 'Usuário Padrão';
        
        let fusoSalvo = localStorage.getItem('agendaWeb_fuso');
        if (!fusoSalvo) {
            fusoSalvo = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
            localStorage.setItem('agendaWeb_fuso', fusoSalvo);
        }
        selectFuso.value = fusoSalvo;
        
        const fotoSalva = localStorage.getItem('agendaWeb_foto');
        if (fotoSalva) imagemPreview.src = fotoSalva;
    }

    function aplicarTemaEscuro(ativar) {
        if (ativar) document.documentElement.classList.add('dark-mode');
        else document.documentElement.classList.remove('dark-mode');
    }

    toggleTema.addEventListener('change', (e) => aplicarTemaEscuro(e.target.checked));
    btnAlterarFoto.addEventListener('click', () => inputFoto.click());

    inputFoto.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => imagemPreview.src = event.target.result;
            reader.readAsDataURL(file);
        }
    });

    btnSalvarConfig.addEventListener('click', () => {
        localStorage.setItem('agendaWeb_temaEscuro', toggleTema.checked);
        localStorage.setItem('agendaWeb_nome', inputNome.value);
        localStorage.setItem('agendaWeb_fuso', selectFuso.value);
        
        if (imagemPreview.src && !imagemPreview.src.includes('avatar-padrao.png')) {
            try { localStorage.setItem('agendaWeb_foto', imagemPreview.src); } 
            catch (err) { console.warn("Imagem grande demais."); }
        }

        toastNotificacao.classList.add('mostrar');
        setTimeout(() => toastNotificacao.classList.remove('mostrar'), 3000);
    });

    carregarConfiguracoes();
});
