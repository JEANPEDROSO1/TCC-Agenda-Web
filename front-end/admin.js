// Lógica da página de Administração
document.addEventListener('DOMContentLoaded', () => {
    // Inicialização de dados
    if (!localStorage.getItem('agendaWeb_usuarios')) {
        const mockUsuarios = [
            { id: 101, nome: 'Jean Pedroso', email: 'jean.pedroso@email.com', cargo: 'admin', foto: '' },
            { id: 102, nome: 'Carlos Silva', email: 'carlos.s@email.com', cargo: 'usuario', foto: '' },
            { id: 103, nome: 'Maria Ferreira', email: 'maria.f@email.com', cargo: 'usuario', foto: '' },
            { id: 104, nome: 'Lucas Almeida', email: 'lucas.almeida@email.com', cargo: 'admin', foto: '' },
            { id: 105, nome: 'Juliana Costa', email: 'juli.costa@email.com', cargo: 'usuario', foto: '' }
        ];
        localStorage.setItem('agendaWeb_usuarios', JSON.stringify(mockUsuarios));
    }

    let usuarios = JSON.parse(localStorage.getItem('agendaWeb_usuarios')) || [];
    let compromissosGlobais = JSON.parse(localStorage.getItem('agendaWeb_compromissos')) || [];

    // Referências DOM
    const totalUsuariosEl = document.getElementById('totalUsuarios');
    const totalCompromissosEl = document.getElementById('totalCompromissos');
    const totalAdminsEl = document.getElementById('totalAdmins');
    const corpoTabelaUsuarios = document.getElementById('corpoTabelaUsuarios');

    // Configurações de tema para gráficos
    const ehDark = document.documentElement.classList.contains('dark-mode');
    const corTextoGrafico = ehDark ? '#f1f5f9' : '#1f2937';
    const corGridGrafico = ehDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const corPrincipalHex = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#2563eb';

    // Atualiza indicadores e gráficos
    function atualizarPainel() {
        totalUsuariosEl.textContent = usuarios.length;
        totalAdminsEl.textContent = usuarios.filter(u => u.cargo === 'admin').length;
        totalCompromissosEl.textContent = compromissosGlobais.length;

        renderizarTabelaUsuarios();
        atualizarGraficoUsuarios();
        atualizarGraficoCompromissos();
    }

    function salvarUsuarios() {
        localStorage.setItem('agendaWeb_usuarios', JSON.stringify(usuarios));
    }

    // Renderiza a tabela de usuários
    function renderizarTabelaUsuarios() {
        corpoTabelaUsuarios.innerHTML = '';
        usuarios.forEach(user => {
            const tr = document.createElement('tr');
            const svgIcon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NiZDVlMSI+PHBhdGggZD0iTTI0IDIwLjk5M1YyNGgtMjR2LTIuOTkzYy4wNDMtNC44NTIgMy45MDctOC43ODYgOC43NTktOC43ODYgMS4zMyAwIDIuNTg0LjMwNyAzLjcwMi44NDUgMS44NS0xLjMxNCAzLjAzNi0zLjQ4NyAzLjAzNi01LjkyNiAwLTMuOTAyLTMuMTM4LTcuMDY4LTcuMDM5LTcuMDY4cy03LjAzOSAzLjE2Ni03LjAzOSA3LjA2OGMwIDIuNDM5IDEuMTg2IDQuNjEyIDMuMDM2IDUuOTI2IDEuMTE4LS41MzggMi4zNzItLjg0NSAzLjcwMi0uODQ1IDQuODUzIDAgOC43MTYgMy45MzQgOC43NTkgOC43ODZ6Ii8+PC9zdmc+';

            tr.innerHTML = `
                <td>#${user.id}</td>
                <td>
                    <div class="usuario-identidade">
                        <img src="${user.foto || svgIcon}" class="usuario-avatar" alt="Avatar">
                        <span class="usuario-info-nome">${user.nome}</span>
                    </div>
                </td>
                <td>${user.email}</td>
                <td><span class="badge-cargo ${user.cargo}">${user.cargo === 'admin' ? 'Administrador' : 'Usuário'}</span></td>
                <td>
                    <div class="acoes-tabela">
                        <button class="btn-acao promover" onclick="alternarCargoUsuario(${user.id})" title="${user.cargo === 'admin' ? 'Remover Admin' : 'Tornar Admin'}">${user.cargo === 'admin' ? '⬇️' : '🛡️'}</button>
                        <button class="btn-acao delete" onclick="deletarUsuario(${user.id})" title="Excluir Usuário">🗑️</button>
                    </div>
                </td>
            `;
            corpoTabelaUsuarios.appendChild(tr);
        });
    }

    // Ações na tabela
    window.alternarCargoUsuario = (id) => {
        const index = usuarios.findIndex(u => u.id === id);
        if (index > -1) {
            usuarios[index].cargo = usuarios[index].cargo === 'admin' ? 'usuario' : 'admin';
            salvarUsuarios();
            atualizarPainel();
        }
    };

    window.deletarUsuario = (id) => {
        if (confirm("ATENÇÃO: Deseja realmente excluir este usuário do sistema?")) {
            usuarios = usuarios.filter(u => u.id !== id);
            salvarUsuarios();
            atualizarPainel();
        }
    };

    // Gráficos Chart.js
    let chartUsuarios = null;
    let chartCompromissos = null;

    function atualizarGraficoUsuarios() {
        const ctxUsuarios = document.getElementById('graficoUsuarios').getContext('2d');
        const countAdmin = usuarios.filter(u => u.cargo === 'admin').length;
        
        if (chartUsuarios) chartUsuarios.destroy();
        chartUsuarios = new Chart(ctxUsuarios, {
            type: 'doughnut',
            data: {
                labels: ['Administradores', 'Usuários Comuns'],
                datasets: [{
                    data: [countAdmin, usuarios.length - countAdmin],
                    backgroundColor: ['#f59e0b', corPrincipalHex],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { color: corTextoGrafico } } }
            }
        });
    }

    function atualizarGraficoCompromissos() {
        const ctx = document.getElementById('graficoCompromissos').getContext('2d');
        const filtro = document.getElementById('filtroGraficoAtividade').value;
        const hoje = new Date();
        let labels = [], contagemArray = [];
        
        const dataHojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

        if (filtro === 'dia') {
            labels = Array.from({length: 24}, (_, i) => `${String(i).padStart(2, '0')}:00`);
            contagemArray = new Array(24).fill(0);
            compromissosGlobais.filter(c => c.data === dataHojeStr).forEach(c => contagemArray[parseInt(c.hora.split(':')[0])]++;);
        } else if (filtro === 'mes') {
            const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
            labels = Array.from({length: diasNoMes}, (_, i) => `Dia ${i+1}`);
            contagemArray = new Array(diasNoMes).fill(0);
            compromissosGlobais.forEach(c => {
                const [a, m, d] = c.data.split('-');
                if (parseInt(a) === hoje.getFullYear() && parseInt(m) === hoje.getMonth() + 1) {
                    contagemArray[parseInt(d) - 1]++;
                }
            });
        } else {
            labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            contagemArray = new Array(12).fill(0);
            compromissosGlobais.forEach(c => {
                const [a, m] = c.data.split('-');
                if (parseInt(a) === hoje.getFullYear()) contagemArray[parseInt(m) - 1]++;
            });
        }

        if (chartCompromissos) chartCompromissos.destroy();
        chartCompromissos = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{ label: 'Compromissos Cadastrados', data: contagemArray, backgroundColor: corPrincipalHex, borderRadius: 4 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, color: corTextoGrafico }, grid: { color: corGridGrafico } },
                    x: { ticks: { color: corTextoGrafico }, grid: { display: false } }
                }
            }
        });
    }

    document.getElementById('filtroGraficoAtividade').addEventListener('change', atualizarGraficoCompromissos);
    atualizarPainel();
});
