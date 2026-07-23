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
    let compromissos = [];

    async function carregarCompromissos() {
        try {
            const res = await fetch(`${API_BASE_URL}/compromissos`, { method: 'GET', headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
            if (res.ok) {
                compromissos = await res.json();
                renderizarCalendario(mesAtual, anoAtual);
                renderizarLista();
            }
        } catch (e) { console.error('Erro ao carregar compromissos:', e); }
    }

    // Renderiza a lista de "Próximos Compromissos"
    function renderizarLista() {
        listaCompromissosEl.innerHTML = '';
        
        // Filtra os ativos e que pertencem ao mês selecionado no calendário
        const ativos = compromissos.filter(c => {
            if (c.status !== 'ativo') return false;
            const [a, m] = c.data.split('-');
            return parseInt(m) - 1 === mesAtual && parseInt(a) === anoAtual;
        }).sort((a, b) => new Date(a.data) - new Date(b.data));
        
        if (ativos.length === 0) {
            listaCompromissosEl.innerHTML = `<div class="estado-vazio"><p class="mensagem-vazia">Nenhum compromisso pendente para este mês.</p></div>`;
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
        renderizarLista();
    });

    btnProximo.addEventListener('click', () => {
        if (++mesAtual > 11) { mesAtual = 0; anoAtual++; }
        renderizarCalendario(mesAtual, anoAtual);
        renderizarLista();
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

    formCompromisso?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = document.getElementById('compData').value;
        const hora = document.getElementById('compHora').value;

        // Bloquear data passada
        const dataEscolhida = new Date(`${data}T${hora}:00`);
        if (dataEscolhida < new Date()) {
            alert('Não é possível agendar um compromisso no passado.');
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
            const res = await fetch(`${API_BASE_URL}/compromissos`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(novoComp)
            });
            if (res.ok) {
                alert("Compromisso criado com sucesso!");
            } else {
                const data = await res.json();
                alert(data.erro || "Erro ao criar compromisso.");
            }
            fecharModal();
            carregarCompromissos();
        } catch (error) { console.error(error); }
    });

    // Inicialização
    carregarCompromissos();
});
