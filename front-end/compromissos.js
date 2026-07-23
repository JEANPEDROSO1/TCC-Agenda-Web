// Lógica da tela de Compromissos (Lista e Calendário)
document.addEventListener('DOMContentLoaded', () => {
    const btnNovoCompromisso = document.getElementById('btnNovoCompromisso');
    const modalCompromisso = document.getElementById('modalCompromisso');
    const btnFecharModal = document.getElementById('btnFecharModal');
    const btnCancelarModal = document.getElementById('btnCancelarModal');
    const formCompromisso = document.getElementById('formCompromisso');
    const modalTitulo = document.getElementById('modalTitulo');

    const btnViewLista = document.getElementById('btnViewLista');
    const btnViewCalendario = document.getElementById('btnViewCalendario');
    const viewLista = document.getElementById('viewLista');
    const viewCalendario = document.getElementById('viewCalendario');
    const listaCompromissosEl = document.getElementById('listaCompromissos');
    
    const filtroBusca = document.getElementById('filtroBusca');
    const filtroData = document.getElementById('filtroData');
    const filtroStatus = document.getElementById('filtroStatus');
    
    let compromissos = [];

    async function carregarCompromissos() {
        try {
            const res = await fetch(`${API_BASE_URL}/compromissos`, { method: 'GET', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
            if (res.ok) {
                const dados = await res.json();
                compromissos = dados.map(c => ({
                    ...c,
                    data: c.data.split('T')[0]
                }));
                renderizarLista();
                renderizarCalendario(calMesAtual, calAnoAtual);
            }
        } catch (e) { console.error('Erro ao carregar compromissos:', e); }
    }

    // Renderiza Lista
    function renderizarLista() {
        listaCompromissosEl.innerHTML = '';
        const rmAcentos = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
        const termoBusca = rmAcentos(filtroBusca.value.toLowerCase());
        
        const filtrados = compromissos.filter(comp => {
            const matchBusca = rmAcentos(comp.titulo.toLowerCase()).includes(termoBusca) || rmAcentos(comp.descricao.toLowerCase()).includes(termoBusca);
            if (termoBusca.trim() !== '') return matchBusca;

            const matchData = filtroData.value ? comp.data === filtroData.value : true;
            let matchStatus = true;
            if (filtroStatus.value === 'ativos') matchStatus = comp.status === 'ativo';
            if (filtroStatus.value === 'desativados') matchStatus = comp.status === 'desativado';

            return matchData && matchStatus;
        });

        if (filtrados.length === 0) {
            listaCompromissosEl.innerHTML = `<div class="estado-vazio" style="grid-column: 1 / -1;"><p>Nenhum compromisso encontrado.</p></div>`;
            return;
        }

        const agora = new Date();

        // Adiciona botão Excluir Todos se o filtro for Desativados
        if (filtroStatus.value === 'desativados' && filtrados.length > 0) {
            const btnExcluirTodos = document.createElement('button');
            btnExcluirTodos.textContent = 'Excluir Todos';
            btnExcluirTodos.className = 'btn-acao excluir';
            btnExcluirTodos.style.gridColumn = '1 / -1';
            btnExcluirTodos.style.marginBottom = '16px';
            btnExcluirTodos.onclick = async () => {
                if (confirm('Excluir todos os compromissos desativados?')) {
                    for (const comp of filtrados) {
                        await fetch(`${API_BASE_URL}/compromissos/${comp.id}`, { method: 'DELETE', credentials: 'include' });
                    }
                    carregarCompromissos();
                }
            };
            listaCompromissosEl.appendChild(btnExcluirTodos);
        }

        filtrados.forEach(comp => {
            const card = document.createElement('div');
            card.className = 'card-compromisso';
            
            const [a, m, d] = comp.data.split('-');
            const dataCompromisso = new Date(`${comp.data}T${comp.hora}:00`);
            const jaPassou = dataCompromisso < agora;

            if (comp.status === 'desativado' || jaPassou) {
                card.style.opacity = '0.6';
            }

            card.innerHTML = `
                <div class="card-header">
                    <h3>${comp.titulo}</h3>
                    <span class="tag-urgencia ${comp.urgencia}">${comp.urgencia}</span>
                </div>
                <div class="card-body">
                    <p>${comp.descricao || 'Sem descrição.'}</p>
                    <div class="card-meta">
                        <span>📅 ${d}/${m}/${a}</span>
                        <span>⏰ ${comp.hora}</span>
                        ${comp.repeticao !== 'nenhuma' ? `<span>🔄 ${comp.repeticao}</span>` : ''}
                        ${comp.status === 'desativado' ? `<span>❌ Desativado</span>` : (jaPassou ? `<span>⏳ Passou</span>` : '')}
                    </div>
                </div>
                <div class="card-actions">
                    ${!jaPassou && comp.status !== 'desativado' ? `<button class="btn-acao editar" onclick="editarCompromisso(${comp.id})">Editar</button>` : ''}
                    <button class="btn-acao excluir" onclick="excluirCompromisso(${comp.id})">Excluir</button>
                </div>
            `;
            listaCompromissosEl.appendChild(card);
        });
        
        renderizarCalendario(calMesAtual, calAnoAtual);
    }

    // Lógica do Modal (CRUD)
    function abrirModal(id = null) {
        if (id) {
            modalTitulo.textContent = 'Editar Compromisso';
            const comp = compromissos.find(c => c.id === id);
            document.getElementById('compId').value = comp.id;
            document.getElementById('compTitulo').value = comp.titulo;
            document.getElementById('compDescricao').value = comp.descricao;
            document.getElementById('compData').value = comp.data;
            document.getElementById('compHora').value = comp.hora;
            document.getElementById('compUrgencia').value = comp.urgencia;
            document.getElementById('compRepeticao').value = comp.repeticao;
        } else {
            modalTitulo.textContent = 'Novo Compromisso';
            formCompromisso.reset();
            document.getElementById('compId').value = '';
        }
        modalCompromisso.style.display = 'flex';
    }

    function fecharModal() { modalCompromisso.style.display = 'none'; }

    formCompromisso.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('compId').value;
        const data = document.getElementById('compData').value;
        const hora = document.getElementById('compHora').value;
        
        // Bloquear data passada
        const dataEscolhida = new Date(`${data}T${hora}:00`);
        if (dataEscolhida < new Date()) {
            showToast('Não é possível agendar um compromisso no passado.', 'erro');
            return;
        }

        const novoComp = {
            titulo: document.getElementById('compTitulo').value,
            descricao: document.getElementById('compDescricao').value,
            data: data,
            hora: hora,
            urgencia: document.getElementById('compUrgencia').value,
            repeticao: document.getElementById('compRepeticao').value,
            status: 'ativo'
        };

        try {
            let res;
            if (id) {
                const index = compromissos.findIndex(c => c.id === parseInt(id));
                if(index !== -1) { novoComp.status = compromissos[index].status; }
                res = await fetch(`${API_BASE_URL}/compromissos/${id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(novoComp)
                });
            } else {
                res = await fetch(`${API_BASE_URL}/compromissos`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(novoComp)
                });
            }
            if (res.ok) {
                showToast(id ? "Compromisso atualizado com sucesso!" : "Compromisso criado com sucesso!");
            } else {
                const data = await res.json();
                showToast(data.erro || "Erro ao salvar compromisso.", 'erro');
            }
            carregarCompromissos();
            fecharModal();
        } catch (error) { console.error(error); }
    });

    window.editarCompromisso = (id) => abrirModal(id);
    window.excluirCompromisso = async (id) => {
        if(confirm('Tem certeza que deseja excluir?')) {
            try {
                await fetch(`${API_BASE_URL}/compromissos/${id}`, { method: 'DELETE', credentials: 'include' });
                carregarCompromissos();
            } catch (error) { console.error(error); }
        }
    };

    btnNovoCompromisso.addEventListener('click', () => abrirModal());
    btnFecharModal.addEventListener('click', fecharModal);
    btnCancelarModal.addEventListener('click', fecharModal);

    filtroBusca.addEventListener('input', renderizarLista);
    filtroData.addEventListener('change', renderizarLista);
    filtroStatus.addEventListener('change', renderizarLista);

    // Alternar Visualizações
    btnViewLista.addEventListener('click', () => {
        btnViewLista.classList.add('ativo');
        btnViewCalendario.classList.remove('ativo');
        viewLista.style.display = 'block';
        viewCalendario.style.display = 'none';
    });

    btnViewCalendario.addEventListener('click', () => {
        btnViewCalendario.classList.add('ativo');
        btnViewLista.classList.remove('ativo');
        viewLista.style.display = 'none';
        viewCalendario.style.display = 'block';
        renderizarCalendario(calMesAtual, calAnoAtual);
    });

    // Calendário
    const calendarioEl = document.getElementById('calendario');
    const mesEAnoEl = document.getElementById('mesEAno');
    
    let calDataAtual = new Date();
    let calMesAtual = calDataAtual.getMonth();
    let calAnoAtual = calDataAtual.getFullYear();
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    function renderizarCalendario(mes, ano) {
        calendarioEl.innerHTML = '';
        mesEAnoEl.textContent = `${meses[mes]} ${ano}`;

        const primeiroDia = new Date(ano, mes, 1).getDay();
        const diasNoMes = new Date(ano, mes + 1, 0).getDate();
        const diasNoMesAnterior = new Date(ano, mes, 0).getDate();

        for (let i = primeiroDia; i > 0; i--) {
            const div = document.createElement('div');
            div.className = 'dia-calendario inativo';
            div.innerHTML = `<span class="numero-dia">${diasNoMesAnterior - i + 1}</span>`;
            calendarioEl.appendChild(div);
        }

        const hoje = new Date();
        for (let i = 1; i <= diasNoMes; i++) {
            const diaEl = document.createElement('div');
            diaEl.className = 'dia-calendario';
            const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            
            const eventos = compromissos.filter(c => c.data === dataStr && c.status === 'ativo');
            let html = eventos.length > 0 ? `<div style="display:flex;flex-direction:column;gap:2px;">${eventos.map(c => `<div class="evento-calendario ${c.urgencia === 'urgente' ? 'urgente' : 'normal'}">${c.hora} - ${c.titulo}</div>`).join('')}</div>` : '';

            diaEl.innerHTML = `<span class="numero-dia">${i}</span>${html}`;
            if (i === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()) diaEl.classList.add('hoje');

            diaEl.addEventListener('click', () => {
                filtroData.value = dataStr;
                btnViewLista.click();
                renderizarLista();
            });

            calendarioEl.appendChild(diaEl);
        }

        const faltam = (7 - ((primeiroDia + diasNoMes) % 7)) % 7;
        for (let i = 1; i <= faltam; i++) {
            const div = document.createElement('div');
            div.className = 'dia-calendario inativo';
            div.innerHTML = `<span class="numero-dia">${i}</span>`;
            calendarioEl.appendChild(div);
        }
    }

    document.getElementById('mesAnterior').addEventListener('click', () => {
        if (--calMesAtual < 0) { calMesAtual = 11; calAnoAtual--; }
        renderizarCalendario(calMesAtual, calAnoAtual);
    });

    document.getElementById('proximoMes').addEventListener('click', () => {
        if (++calMesAtual > 11) { calMesAtual = 0; calAnoAtual++; }
        renderizarCalendario(calMesAtual, calAnoAtual);
    });

    carregarCompromissos();
    renderizarCalendario(calMesAtual, calAnoAtual);
});
