// script.js - Configurações globais e tema
(function() {
    const COR_PADRAO = '#2563eb';
    const temaEscuro = localStorage.getItem('agendaWeb_temaEscuro') === 'true';
    const corPrincipal = localStorage.getItem('agendaWeb_corPrincipal') || COR_PADRAO;

    if (temaEscuro) document.documentElement.classList.add('dark-mode');
    else document.documentElement.classList.remove('dark-mode');

    if (corPrincipal !== COR_PADRAO) {
        document.documentElement.style.setProperty('--primary-color', corPrincipal);
        document.documentElement.style.setProperty('--primary-hover', corPrincipal);
    }

    // --- Injeção do Preloader Global ---
    const navEntries = performance.getEntriesByType("navigation");
    const navType = navEntries.length > 0 ? navEntries[0].type : '';
    const appStarted = sessionStorage.getItem('agendaWeb_appStarted');
    
    let showPreloader = false;
    if (navType === 'reload' || !appStarted) {
        showPreloader = true;
        sessionStorage.setItem('agendaWeb_appStarted', 'true');
    }

    if (showPreloader) {
        const preloaderStyle = document.createElement('style');
        preloaderStyle.innerHTML = `
            body.loading { overflow: hidden; }
            #global-preloader {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: #ffffff; /* Tema Claro */
                z-index: 999999;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                transition: opacity 0.5s ease;
            }
            .dark-mode #global-preloader { background: #0f172a; } /* Tema Escuro */
            #global-preloader img { width: 120px; height: auto; margin-bottom: 20px; }
            #global-preloader h1 { font-size: 28px; margin: 0 0 5px 0; color: #1f2937; font-family: sans-serif; }
            .dark-mode #global-preloader h1 { color: #f1f5f9; }
            #global-preloader p { font-size: 14px; margin: 0; color: #64748b; font-family: sans-serif; }
            .dark-mode #global-preloader p { color: #94a3b8; }
            
            .progress-container {
                width: 200px; height: 4px;
                background: rgba(0, 0, 0, 0.1);
                border-radius: 4px; margin-top: 20px; overflow: hidden;
                position: relative;
            }
            .dark-mode .progress-container { background: rgba(255, 255, 255, 0.1); }
            .progress-bar {
                width: 30%; height: 100%;
                background: var(--primary-color, #2563eb);
                position: absolute; left: 0; top: 0; border-radius: 4px;
                animation: moveProgress 1.5s ease-in-out infinite;
            }
            @keyframes moveProgress {
                0% { left: -30%; }
                100% { left: 100%; }
            }
        `;
        document.head.appendChild(preloaderStyle);

        document.addEventListener("DOMContentLoaded", () => {
            document.body.classList.add('loading');
            document.body.insertAdjacentHTML('afterbegin', `
                <div id="global-preloader">
                    <img src="IMG/LOGO AGENDA WEB BORDA.png" alt="Logo Agenda Web">
                    <h1>Agenda Web</h1>
                    <p>Desenvolvido por Jean Pedroso</p>
                    <div class="progress-container">
                        <div class="progress-bar"></div>
                    </div>
                </div>
            `);
        });

        window.addEventListener('load', () => {
            setTimeout(() => {
                const p = document.getElementById('global-preloader');
                if(p) {
                    p.style.opacity = '0';
                    setTimeout(() => {
                        p.remove();
                        document.body.classList.remove('loading');
                    }, 500);
                }
            }, 600); // 600ms extra para dar o "charme" da tela de load
        });
    }

})();

// Lógica Global de Logout
document.addEventListener('DOMContentLoaded', () => {
    const linkSair = document.querySelector('a[href="sair.html"]');
    if (linkSair) {
        linkSair.addEventListener('click', (e) => {
            e.preventDefault();
            const isDark = document.documentElement.classList.contains('dark-mode');
            const bg = isDark ? 'var(--card-bg)' : '#ffffff';
            const txt = isDark ? 'var(--text-muted)' : '#64748b';
            const btnNaoBg = isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9';
            const btnNaoTxt = isDark ? 'var(--text-color)' : '#475569';
            
            const modalHtml = `
                <div id="modalSairGlobal" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(15,23,42,0.6);backdrop-filter:blur(5px);display:flex;justify-content:center;align-items:center;z-index:99999;">
                    <div style="background:${bg};width:90%;max-width:400px;border-radius:20px;padding:30px;text-align:center;">
                        <h2 style="color:var(--primary-color);">Saindo do Sistema?</h2>
                        <p style="color:${txt};margin-bottom:24px;">Tem certeza que deseja sair?</p>
                        <div style="display:flex;gap:12px;">
                            <button id="btnNaoSair" style="flex:1;padding:12px;background:${btnNaoBg};color:${btnNaoTxt};border:none;border-radius:8px;cursor:pointer;">Não, ficar aqui</button>
                            <button id="btnSimSair" style="flex:1;padding:12px;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;">Sim, sair</button>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            document.getElementById('btnNaoSair').addEventListener('click', () => document.getElementById('modalSairGlobal').remove());
            document.getElementById('btnSimSair').addEventListener('click', async () => {
                document.getElementById('btnSimSair').textContent = 'Saindo...';
                if (typeof API_BASE_URL !== 'undefined') {
                    try {
                        await fetch(API_BASE_URL + '/auth/logout', { method: 'POST', credentials: 'include' });
                    } catch(e) {}
                }
                // Limpa apenas os dados de sessão da agenda
                Object.keys(localStorage).forEach(key => {
                    if(key.startsWith('agendaWeb_') && key !== 'agendaWeb_temaEscuro' && key !== 'agendaWeb_corPrincipal') {
                        localStorage.removeItem(key);
                    }
                });
                sessionStorage.clear();
                window.location.href = 'index.html';
            });
        });
    }

    // Mostra aba Administrador apenas se for admin
    const cargo = localStorage.getItem('agendaWeb_cargo');
    const itensAdmin = document.querySelectorAll('.admin-nav-item');
    if (cargo === 'admin') {
        itensAdmin.forEach(item => item.style.display = 'block');
    }
});

// Sistema de Toast Global
window.showToast = function(mensagem, tipo = 'sucesso') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + tipo;
    toast.innerHTML = (tipo === 'sucesso' ? '✅ ' : '❌ ') + mensagem;
    
    container.appendChild(toast);
    
    // For�a o reflow para a anima��o CSS funcionar
    toast.offsetHeight;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// Sincronizacao de perfil e Proteção de Rotas
document.addEventListener('DOMContentLoaded', async () => {
    const paginasProtegidas = ['dashboard.html', 'admin.html', 'compromissos.html', 'perfil.html', 'configuracoes.html'];
    const paginaAtual = window.location.pathname.split('/').pop() || '';

    if (typeof API_BASE_URL !== 'undefined') {
        try {
            const res = await fetch(API_BASE_URL + '/auth/me', { method: 'GET', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                
                // Proteção para Admin
                if (paginaAtual === 'admin.html' && data.cargo !== 'admin') {
                    window.location.href = 'dashboard.html';
                    return;
                }

                // Auto-login se acessar index/login/cadastro estando logado
                const paginasPublicas = ['index.html', '', 'login.html', 'register.html', 'verificacao.html', 'forgot-password.html'];
                if (paginasPublicas.includes(paginaAtual)) {
                    window.location.href = 'dashboard.html';
                    return;
                }

                if (data.nome) localStorage.setItem('agendaWeb_nome', data.nome);
                if (data.cargo) localStorage.setItem('agendaWeb_cargo', data.cargo);
                if (data.foto) {
                    localStorage.setItem('agendaWeb_foto', data.foto);
                    const imgPerfil = document.getElementById('imagemPerfilPreview');
                    if (imgPerfil && !imgPerfil.src.startsWith('blob:')) imgPerfil.src = data.foto;
                    const imgConfig = document.getElementById('imagemPreview');
                    if (imgConfig && !imgConfig.src.startsWith('blob:')) imgConfig.src = data.foto;
                }
            } else {
                // Se não estiver logado e tentar acessar página protegida
                if (paginasProtegidas.includes(paginaAtual)) {
                    window.location.href = 'index.html';
                }
            }
        } catch (e) {
            if (paginasProtegidas.includes(paginaAtual)) {
                window.location.href = 'index.html';
            }
        }
    }
});
