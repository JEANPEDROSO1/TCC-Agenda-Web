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
                const dados = await res.json();
                compromissos = dados.map(c => ({
                    ...c,
                    data: c.data.split('T')[0] // Garante formato YYYY-MM-DD
                }));
                renderizarCalendario(mesAtual, anoAtual);
                renderizarLista();
            }
        } catch (e) { console.error('Erro ao carregar compromissos:', e); }
    }

    async function carregarGruposSelect() {
        const compGrupoId = document.getElementById('compGrupoId');
        if (!compGrupoId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/grupos`, { method: 'GET', credentials: 'include' });
            if (res.ok) {
                const grupos = await res.json();
                compGrupoId.innerHTML = '<option value="">Nenhum (Pessoal)</option>';
                grupos.forEach(g => {
                    // Apenas admin ou membro podem vincular (comum só visualiza)
                    if (g.papel === 'admin' || g.papel === 'membro') {
                        compGrupoId.innerHTML += `<option value="${g.id}">${g.nome}</option>`;
                    }
                });
            }
        } catch (e) {}
    }

    // Renderiza a lista de "Próximos Compromissos"
    function renderizarLista() {
        listaCompromissosEl.innerHTML = '';
        
        // Filtra os que pertencem ao mês selecionado no calendário, considerando as repetições
        let ativos = [];
        const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
        compromissos.forEach(c => {
            for (let i = 1; i <= diasNoMes; i++) {
                const dataStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                if (window.ocorreNaData(c, dataStr)) {
                    ativos.push({...c, data: dataStr});
                }
            }
        });
        
        ativos.sort((a, b) => new Date(a.data) - new Date(b.data));
        
        if (ativos.length === 0) {
            listaCompromissosEl.innerHTML = `<div class="estado-vazio"><p class="mensagem-vazia">Nenhum compromisso pendente para este mês.</p></div>`;
            return;
        }

        ativos.slice(0, 5).forEach(comp => {
            const div = document.createElement('div');
            div.className = 'item-proximo-compromisso';
            const partes = comp.data.split('-');
            const dataFmt = partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : comp.data;
            
            // Verifica se o compromisso já passou no frontend (para aquela data específica)
            const dataCompromisso = new Date(`${comp.data}T${comp.hora}:00`);
            const jaPassou = dataCompromisso < new Date();
            
            const isDesativado = comp.status === 'desativado' || jaPassou;
            let cor = isDesativado ? '#94a3b8' : (comp.urgencia === 'urgente' ? '#ef4444' : 'var(--primary-color)');
            let badgeHtml = '';
            if (comp.grupo_id && !isDesativado) {
                cor = '#10b981'; // Verde para grupos
                badgeHtml = `<span style="background: rgba(16, 185, 129, 0.2); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-left: 5px;">Grupo</span>`;
            }

            const opacity = isDesativado ? '0.6' : '1';
            const extra = isDesativado ? ' <i>(Finalizado)</i>' : '';
            
            div.style.opacity = opacity;
            div.innerHTML = `<strong style="color:${cor}; display:flex; align-items:center;">${comp.titulo}${extra}${badgeHtml}</strong><span style="font-size:0.85rem;color:var(--text-muted)">📅 ${dataFmt} - ⏰ ${comp.hora}</span>`;
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
            
            const eventos = compromissos.filter(c => window.ocorreNaData(c, dataStr));
            let htmlEventos = eventos.length > 0 ? `<div style="display:flex;flex-direction:column;gap:2px;">${eventos.map(c => {
                const dataCompromisso = new Date(`${dataStr}T${c.hora}:00`);
                const jaPassou = dataCompromisso < new Date();
                const isDesativado = c.status === 'desativado' || jaPassou;
                let clazz = isDesativado ? 'desativado' : (c.urgencia === 'urgente' ? 'urgente' : 'normal');
                if (c.grupo_id && !isDesativado) clazz = 'grupo'; // Classe CSS para verde
                return `<div class="evento-calendario ${clazz}">${c.hora} - ${c.titulo}</div>`;
            }).join('')}</div>` : '';

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
        document.getElementById('compTempoLembrete').value = "30";
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
            tempo_lembrete: parseInt(document.getElementById('compTempoLembrete').value),
            grupo_id: document.getElementById('compGrupoId')?.value || null,
            status: 'ativo'
        };

        try {
            const res = await fetch(`${API_BASE_URL}/compromissos`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(novoComp)
            });
            if (res.ok) {
                showToast("Compromisso criado com sucesso!");
            } else {
                const data = await res.json();
                showToast(data.erro || "Erro ao criar compromisso.", 'erro');
            }
            fecharModal();
            carregarCompromissos();
        } catch (error) { console.error(error); }
    });

    // Inicialização
    carregarCompromissos();
    carregarGruposSelect();

    // RADAR LOCAL (Notificações Visuais em Tempo Real)
    let alertasMostrados = [];
    
    setInterval(() => {
        if (compromissos.length === 0) return;
        const agora = new Date();
        
        const dataHojeStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
        
        compromissos.forEach(comp => {
            if (comp.status !== 'ativo' || comp.tempo_lembrete < 0) return;
            
            if (!window.ocorreNaData(comp, dataHojeStr)) return;

            const dataComp = new Date(`${dataHojeStr}T${comp.hora}:00`);
            const diffMinutos = Math.round((dataComp - agora) / 60000);
            
            // Lembrete Antecipado
            if (comp.tempo_lembrete > 0 && diffMinutos === comp.tempo_lembrete) {
                const alertKey = `antecipado_${comp.id}`;
                if (!alertasMostrados.includes(alertKey)) {
                    showToast(`Lembrete: Faltam ${comp.tempo_lembrete} minutos para "${comp.titulo}"!`, 'sucesso');
                    alertasMostrados.push(alertKey);
                }
            }
            
            // Lembrete Na Hora
            if (diffMinutos === 0) {
                const alertKey = `hora_${comp.id}`;
                if (!alertasMostrados.includes(alertKey)) {
                    showToast(`O compromisso "${comp.titulo}" começou!`, 'sucesso');
                    alertasMostrados.push(alertKey);
                }
            }
        });
    }, 30000); // Checa a cada 30 segundos
});
