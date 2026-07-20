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

    if (!localStorage.getItem('agendaWeb_compromissos')) {
        const hoje = new Date();
        const anoStr = hoje.getFullYear();
        const mesStr = String(hoje.getMonth() + 1).padStart(2, '0');
        
        const mock = [
            { id: 1, titulo: 'Reunião de Alinhamento', descricao: 'Equipe', data: `${anoStr}-${mesStr}-15`, hora: '10:00', urgencia: 'normal', repeticao: 'semanal', status: 'ativo' },
            { id: 2, titulo: 'Entrega do TCC', descricao: 'Final', data: `${anoStr}-${mesStr}-20`, hora: '19:00', urgencia: 'urgente', repeticao: 'nenhuma', status: 'ativo' }
        ];
        localStorage.setItem('agendaWeb_compromissos', JSON.stringify(mock));
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
            document.getElementById('btnSimSair').addEventListener('click', () => window.location.href = 'index.html');
        });
    }
});
