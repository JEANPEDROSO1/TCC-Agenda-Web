// Lógica do painel principal (Dashboard)
document.addEventListener('DOMContentLoaded', () => {
    const calendarioEl = document.getElementById('calendario');
    const mesEAnoEl = document.getElementById('mesEAno');
    const btnAnterior = document.getElementById('mesAnterior');
    const btnProximo = document.getElementById('proximoMes');
    const listaCompromissosEl = document.getElementById('listaCompromissos');
    const modalCompromisso = document.getElementById('modalCompromisso');
    const formCompromisso = document.getElementById('formCompromisso');

    let dataAtual = new Date();
    let mesAtual = dataAtual.getMonth();
    let anoAtual = dataAtual.getFullYear();
    let dataSelecionada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dataAtual.getDate()).padStart(2, '0')}`;

    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    let compromissos = JSON.parse(localStorage.getItem('agendaWeb_compromissos')) || [];

    // Renderiza a lista de "Próximos Compromissos"
    function renderizarLista() {
        listaCompromissosEl.innerHTML = '';
        const ativos = compromissos.filter(c => c.status === 'ativo').sort((a, b) => new Date(a.data) - new Date(b.data));
        
        if (ativos.length === 0) {
            listaCompromissosEl.innerHTML = `<div class="estado-vazio"><p>Nenhum compromisso pendente.</p></div>`;
            return;
        }

        ativos.slice(0, 5).forEach(comp => {
            const div = document.createElement('div');
            div.className = 'item-proximo-compromisso';
            const partes = comp.data.split('-');
            const dataFmt = partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : comp.data;
            const cor = comp.urgencia === 'urgente' ? '#ef4444' : 'var(--primary-color)';
            
            div.innerHTML = `<strong style="color:${cor};">${comp.titulo}</strong><span style="font-size:0.85rem;color:var(--text-muted)">📅 ${dataFmt} - ⏰ ${comp.hora}</span>`;
            listaCompromissosEl.appendChild(div);
        });
    }

    // Desenha o calendário do mês atual
    function renderizarCalendario(mes, ano) {
        calendarioEl.innerHTML = '';
        mesEAnoEl.textContent = `${meses[mes]} ${ano}`;

        const primeiroDia = new Date(ano, mes, 1).getDay();
        const diasNoMes = new Date(ano, mes + 1, 0).getDate();
        const diasNoMesAnterior = new Date(ano, mes, 0).getDate();

        // Preenche dias do mês anterior
        for (let i = primeiroDia; i > 0; i--) {
            const div = document.createElement('div');
            div.className = 'dia-calendario inativo';
            div.innerHTML = `<span class="numero-dia">${diasNoMesAnterior - i + 1}</span>`;
            calendarioEl.appendChild(div);
        }

        // Preenche dias do mês atual
        const hoje = new Date();
        for (let i = 1; i <= diasNoMes; i++) {
            const diaEl = document.createElement('div');
            diaEl.className = 'dia-calendario';
            const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            
            const eventos = compromissos.filter(c => c.data === dataStr && c.status === 'ativo');
            let htmlEventos = eventos.length > 0 ? `<div style="display:flex;flex-direction:column;gap:2px;">${eventos.map(c => `<div class="evento-calendario ${c.urgencia === 'urgente' ? 'urgente' : 'normal'}">${c.hora} - ${c.titulo}</div>`).join('')}</div>` : '';

            diaEl.innerHTML = `<span class="numero-dia">${i}</span>${htmlEventos}`;
            
            if (i === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()) diaEl.classList.add('hoje');
            if (dataStr === dataSelecionada) diaEl.classList.add('selecionado');

            diaEl.addEventListener('click', () => {
                dataSelecionada = dataStr;
                renderizarCalendario(mes, ano);
            });

            calendarioEl.appendChild(diaEl);
        }

        // Preenche dias do próximo mês
        const diasFaltantes = (7 - ((primeiroDia + diasNoMes) % 7)) % 7;
        for (let i = 1; i <= diasFaltantes; i++) {
            const div = document.createElement('div');
            div.className = 'dia-calendario inativo';
            div.innerHTML = `<span class="numero-dia">${i}</span>`;
            calendarioEl.appendChild(div);
        }
    }

    // Navegação de meses
    btnAnterior.addEventListener('click', () => {
        if (--mesAtual < 0) { mesAtual = 11; anoAtual--; }
        renderizarCalendario(mesAtual, anoAtual);
    });

    btnProximo.addEventListener('click', () => {
        if (++mesAtual > 11) { mesAtual = 0; anoAtual++; }
        renderizarCalendario(mesAtual, anoAtual);
    });

    // Modal de Novo Compromisso
    function fecharModal() { modalCompromisso.style.display = 'none'; }

    document.getElementById('botaoNovoCompromissoMobile')?.addEventListener('click', () => {
        formCompromisso.reset();
        document.getElementById('compId').value = '';
        document.getElementById('compData').value = dataSelecionada;
        modalCompromisso.style.display = 'flex';
    });

    document.getElementById('btnFecharModal')?.addEventListener('click', fecharModal);
    document.getElementById('btnCancelarModal')?.addEventListener('click', fecharModal);

    formCompromisso?.addEventListener('submit', (e) => {
        e.preventDefault();
        const novoComp = {
            id: Date.now(),
            titulo: document.getElementById('compTitulo').value,
            descricao: document.getElementById('compDescricao').value,
            data: document.getElementById('compData').value,
            hora: document.getElementById('compHora').value,
            urgencia: document.getElementById('compUrgencia').value,
            repeticao: document.getElementById('compRepeticao').value,
            status: 'ativo'
        };

        compromissos.push(novoComp);
        localStorage.setItem('agendaWeb_compromissos', JSON.stringify(compromissos));
        
        fecharModal();
        renderizarLista();
        
        const [a, m] = novoComp.data.split('-');
        mesAtual = parseInt(m) - 1;
        anoAtual = parseInt(a);
        dataSelecionada = novoComp.data;
        renderizarCalendario(mesAtual, anoAtual);
    });

    // Inicialização
    renderizarCalendario(mesAtual, anoAtual);
    renderizarLista();
});
