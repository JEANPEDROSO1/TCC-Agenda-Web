document.addEventListener('DOMContentLoaded', () => {
    const listaGruposEl = document.getElementById('listaGrupos');
    const detalhesGrupoEl = document.getElementById('detalhesGrupo');
    const grupoNomeTitulo = document.getElementById('grupoNomeTitulo');
    const grupoDescricaoDesc = document.getElementById('grupoDescricaoDesc');
    const meuPapelBadge = document.getElementById('meuPapelBadge');
    const listaMembrosEl = document.getElementById('listaMembros');
    
    const btnNovoGrupo = document.getElementById('btnNovoGrupo');
    const modalCriarGrupo = document.getElementById('modalCriarGrupo');
    const formCriarGrupo = document.getElementById('formCriarGrupo');
    
    const areaAdicionarMembro = document.getElementById('areaAdicionarMembro');
    const formAdicionarMembro = document.getElementById('formAdicionarMembro');
    const btnExcluirGrupo = document.getElementById('btnExcluirGrupo');

    let grupos = [];
    let grupoSelecionadoId = null;
    let meuPapelSelecionado = null;

    async function carregarGrupos() {
        carregarConvites();
        try {
            const res = await fetch(`${API_BASE_URL}/grupos`, { method: 'GET', credentials: 'include' });
            if (res.ok) {
                grupos = await res.json();
                renderizarListaGrupos();
                
                const ultimoGrupo = localStorage.getItem('ultimoGrupoAberto');
                if (ultimoGrupo) {
                    carregarDetalhesGrupo(parseInt(ultimoGrupo));
                }
            }
        } catch (error) {
            console.error("Erro ao carregar grupos:", error);
        }
    }

    async function carregarConvites() {
        const secaoConvites = document.getElementById('secaoConvites');
        const listaConvites = document.getElementById('listaConvites');
        try {
            const res = await fetch(`${API_BASE_URL}/grupos/convites`, { method: 'GET', credentials: 'include' });
            if (res.ok) {
                const convites = await res.json();
                if (convites.length > 0) {
                    secaoConvites.style.display = 'block';
                    listaConvites.innerHTML = '';
                    convites.forEach(c => {
                        const div = document.createElement('div');
                        div.className = 'item-grupo';
                        div.innerHTML = `
                            <h3>${c.nome}</h3>
                            <p>${c.descricao || 'Sem descrição'}</p>
                            <span class="badge-papel papel-${c.papel}">Convite para: ${c.papel}</span>
                            <div style="margin-top: 10px; display: flex; gap: 10px;">
                                <button onclick="aceitarConvite(${c.id})" class="botao-principal-vidro" style="padding: 5px 10px; font-size: 0.8rem;">Aceitar</button>
                                <button onclick="recusarConvite(${c.id})" class="btn-secundario" style="color: #ef4444; border-color: #ef4444; padding: 5px 10px; font-size: 0.8rem;">Recusar</button>
                            </div>
                        `;
                        listaConvites.appendChild(div);
                    });
                } else {
                    secaoConvites.style.display = 'none';
                }
            }
        } catch (e) { console.error(e); }
    }

    window.aceitarConvite = async (id) => {
        try {
            const res = await fetch(`${API_BASE_URL}/grupos/${id}/aceitar`, { method: 'PUT', credentials: 'include' });
            if (res.ok) { showToast("Convite aceito!"); carregarGrupos(); }
            else showToast("Erro ao aceitar convite", "erro");
        } catch (e) { console.error(e); }
    };

    window.recusarConvite = async (id) => {
        if (!confirm("Recusar este convite?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/grupos/${id}/recusar`, { method: 'DELETE', credentials: 'include' });
            if (res.ok) { showToast("Convite recusado!"); carregarGrupos(); }
            else showToast("Erro ao recusar convite", "erro");
        } catch (e) { console.error(e); }
    };

    function renderizarListaGrupos() {
        listaGruposEl.innerHTML = '';
        if (grupos.length === 0) {
            listaGruposEl.innerHTML = '<p class="mensagem-vazia">Você não participa de nenhum grupo.</p>';
            return;
        }

        grupos.forEach(grupo => {
            const div = document.createElement('div');
            div.className = `item-grupo ${grupoSelecionadoId === grupo.id ? 'ativo' : ''}`;
            div.innerHTML = `
                <h3>${grupo.nome}</h3>
                <p>${grupo.descricao || 'Sem descrição'}</p>
                <span class="badge-papel papel-${grupo.papel}">${grupo.papel}</span>
            `;
            div.onclick = () => carregarDetalhesGrupo(grupo.id);
            listaGruposEl.appendChild(div);
        });
    }

    async function carregarDetalhesGrupo(id) {
        grupoSelecionadoId = id;
        renderizarListaGrupos(); // Atualiza a seleção visual
        
        try {
            const res = await fetch(`${API_BASE_URL}/grupos/${id}`, { method: 'GET', credentials: 'include' });
            if (res.ok) {
                const dados = await res.json();
                mostrarDetalhesGrupo(dados.grupo, dados.meu_papel, dados.membros, dados.convites);
                carregarCompromissosDoGrupo(id);
                
                document.querySelector('.grade-grupos').classList.add('grupo-aberto');
                document.getElementById('btnVoltarGrupos').style.display = 'inline-block';
                localStorage.setItem('ultimoGrupoAberto', id);
                
                // Em telas pequenas, rola a página para os detalhes do grupo
                if (window.innerWidth <= 768) {
                    setTimeout(() => {
                        detalhesGrupoEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                }
            } else {
                const err = await res.json();
                showToast(err.erro || "Erro ao abrir grupo.", 'erro');
            }
        } catch (error) {
            console.error("Erro ao carregar detalhes do grupo:", error);
            showToast("Falha na comunicação com o servidor.", 'erro');
        }
    }

    function mostrarDetalhesGrupo(grupo, meuPapel, membros, convites) {
        meuPapelSelecionado = meuPapel;
        detalhesGrupoEl.style.display = 'block';
        grupoNomeTitulo.textContent = grupo.nome;
        grupoDescricaoDesc.textContent = grupo.descricao || 'Sem descrição';
        
        meuPapelBadge.textContent = meuPapel;
        meuPapelBadge.className = `badge-papel papel-${meuPapel}`;

        // Permissões
        const btnNovoComp = document.getElementById('btnNovoCompromissoGrupo');
        if (meuPapel === 'admin' || meuPapel === 'membro') {
            btnNovoComp.style.display = 'block';
        } else {
            btnNovoComp.style.display = 'none';
        }

        if (meuPapel === 'admin') {
            areaAdicionarMembro.style.display = 'block';
            if (grupo.admin_id == window.usuarioLogadoId) {
                btnExcluirGrupo.style.display = 'inline-block';
            } else {
                btnExcluirGrupo.style.display = 'none';
            }
        } else {
            areaAdicionarMembro.style.display = 'none';
            btnExcluirGrupo.style.display = 'none';
        }

        renderizarMembros(membros, convites, grupo.admin_id);
    }

    function renderizarMembros(membros, convites, adminIdOriginal) {
        listaMembrosEl.innerHTML = '';
        
        // Primeiro os membros ativos
        membros.forEach(m => renderizarItemMembro(m, adminIdOriginal, false));
        
        // Depois os convites pendentes
        if (convites && convites.length > 0) {
            const divSeparador = document.createElement('div');
            divSeparador.innerHTML = '<h4 style="margin: 15px 0 5px 0; color: var(--text-muted);">Convites Pendentes</h4>';
            listaMembrosEl.appendChild(divSeparador);
            convites.forEach(c => renderizarItemMembro(c, adminIdOriginal, true));
        }
    }

    function renderizarItemMembro(m, adminIdOriginal, isConvite) {
        const div = document.createElement('div');
        div.className = 'item-membro';
        if (isConvite) div.style.opacity = '0.7';
        
        const isAdminGeral = m.id === adminIdOriginal;
        let txtBadge = isConvite ? `Convite: ${m.papel}` : (isAdminGeral ? 'Criador' : m.papel);
        const badge = `<span class="badge-papel papel-${m.papel}" style="margin-top:0;">${txtBadge}</span>`;
        
        let acoesHtml = '';
        
        // Só admin pode editar os outros (e não a si mesmo no select, nem o criador)
        if (meuPapelSelecionado === 'admin' && !isAdminGeral && m.id !== window.usuarioLogadoId) {
            acoesHtml = `
                <div class="acoes-membro">
                    ${!isConvite ? `
                    <select onchange="window.alterarPapel(${m.id}, this.value)">
                        <option value="comum" ${m.papel === 'comum' ? 'selected' : ''}>Comum</option>
                        <option value="membro" ${m.papel === 'membro' ? 'selected' : ''}>Membro</option>
                        <option value="admin" ${m.papel === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>` : ''}
                    <button onclick="window.removerMembro(${m.id}, '${isConvite ? 'cancelar' : 'remover'}')" class="btn-secundario" style="color:#ef4444; border-color:#ef4444; padding:4px 8px; font-size:0.8rem;">
                        ${isConvite ? 'Cancelar Convite' : 'Remover'}
                    </button>
                </div>
            `;
        } else if (m.id === window.usuarioLogadoId && !isAdminGeral && !isConvite) {
            // Eu mesmo posso sair do grupo (se não for o criador)
            acoesHtml = `<button onclick="window.removerMembro(${m.id}, 'sair')" class="btn-secundario" style="color:#ef4444; border-color:#ef4444; padding:4px 8px; font-size:0.8rem;">Sair do Grupo</button>`;
        }

        div.innerHTML = `
            <div>
                <strong style="display:block; color:white;">${m.nome} ${m.id === window.usuarioLogadoId ? '(Você)' : ''}</strong>
                <span style="font-size:0.8rem; color:var(--text-muted);">${m.email}</span>
            </div>
            <div style="display:flex; align-items:center; gap:15px;">
                ${badge}
                ${acoesHtml}
            </div>
        `;
        listaMembrosEl.appendChild(div);
    }

    // Ações Globais na Janela (para os botões inline)
    window.alterarPapel = async (usuarioId, novoPapel) => {
        try {
            const res = await fetch(`${API_BASE_URL}/grupos/${grupoSelecionadoId}/membros/${usuarioId}/papel`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ papel: novoPapel })
            });
            if (res.ok) {
                showToast("Papel alterado com sucesso!");
                carregarDetalhesGrupo(grupoSelecionadoId);
            } else {
                const err = await res.json();
                showToast(err.erro || "Erro ao alterar papel", 'erro');
            }
        } catch (e) { console.error(e); }
    };

    // Lógica do Modal Genérico de Confirmação
    const modalConfirmacaoGenerico = document.getElementById('modalConfirmacaoGenerico');
    const tituloConfirmacaoGenerico = document.getElementById('tituloConfirmacaoGenerico');
    const textoConfirmacaoGenerico = document.getElementById('textoConfirmacaoGenerico');
    const btnCancelarConfirmacaoGenerico = document.getElementById('btnCancelarConfirmacaoGenerico');
    const btnConfirmarAcaoGenerico = document.getElementById('btnConfirmarAcaoGenerico');
    let callbackConfirmacao = null;

    btnCancelarConfirmacaoGenerico.addEventListener('click', () => {
        modalConfirmacaoGenerico.style.display = 'none';
        callbackConfirmacao = null;
    });

    btnConfirmarAcaoGenerico.addEventListener('click', () => {
        modalConfirmacaoGenerico.style.display = 'none';
        if (callbackConfirmacao) callbackConfirmacao();
        callbackConfirmacao = null;
    });

    function solicitarConfirmacao(titulo, texto, onConfirm) {
        tituloConfirmacaoGenerico.textContent = titulo;
        textoConfirmacaoGenerico.textContent = texto;
        callbackConfirmacao = onConfirm;
        modalConfirmacaoGenerico.style.display = 'flex';
    }

    window.removerMembro = async (usuarioId, tipoAcao = 'remover') => {
        let titulo = "Remover Membro?";
        let texto = "Tem certeza que deseja remover este membro? Ele perderá o acesso ao grupo.";
        
        if (tipoAcao === 'cancelar') {
            titulo = "Cancelar Convite?";
            texto = "Tem certeza que deseja cancelar este convite pendente?";
        } else if (tipoAcao === 'sair') {
            titulo = "Sair do Grupo?";
            texto = "Tem certeza que deseja sair deste grupo? Você perderá o acesso aos compromissos.";
        }

        solicitarConfirmacao(titulo, texto, async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/grupos/${grupoSelecionadoId}/membros/${usuarioId}`, {
                    method: 'DELETE', credentials: 'include'
                });
                if (res.ok) {
                    showToast(tipoAcao === 'cancelar' ? "Convite cancelado!" : (tipoAcao === 'sair' ? "Você saiu do grupo!" : "Membro removido!"));
                    if (usuarioId === window.usuarioLogadoId) {
                        detalhesGrupoEl.style.display = 'none';
                        carregarGrupos();
                    } else {
                        carregarDetalhesGrupo(grupoSelecionadoId);
                    }
                } else {
                    const err = await res.json();
                    showToast(err.erro || "Erro ao executar ação", 'erro');
                }
            } catch (e) { console.error(e); }
        });
    };

    // Eventos DOM
    document.getElementById('btnVoltarGrupos').addEventListener('click', () => {
        document.querySelector('.grade-grupos').classList.remove('grupo-aberto');
        detalhesGrupoEl.style.display = 'none';
        grupoSelecionadoId = null;
        renderizarListaGrupos();
        document.getElementById('btnVoltarGrupos').style.display = 'none';
        localStorage.removeItem('ultimoGrupoAberto');
    });

    btnNovoGrupo.addEventListener('click', () => {
        formCriarGrupo.reset();
        modalCriarGrupo.style.display = 'flex';
    });

    document.getElementById('fecharModalGrupo').addEventListener('click', () => modalCriarGrupo.style.display = 'none');
    document.getElementById('btnCancelarGrupo').addEventListener('click', () => modalCriarGrupo.style.display = 'none');

    formCriarGrupo.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('nomeGrupo').value;
        const descricao = document.getElementById('descricaoGrupo').value;

        try {
            const res = await fetch(`${API_BASE_URL}/grupos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ nome, descricao })
            });
            if (res.ok) {
                showToast("Grupo criado com sucesso!");
                modalCriarGrupo.style.display = 'none';
                carregarGrupos();
            } else {
                const err = await res.json();
                showToast(err.erro || "Erro ao criar grupo", 'erro');
            }
        } catch (e) { console.error(e); }
    });

    formAdicionarMembro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('novoMembroEmail').value;
        const papel = document.getElementById('novoMembroPapel').value;

        try {
            const res = await fetch(`${API_BASE_URL}/grupos/${grupoSelecionadoId}/membros`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, papel })
            });
            if (res.ok) {
                showToast("Convite enviado!");
                formAdicionarMembro.reset();
                carregarDetalhesGrupo(grupoSelecionadoId);
            } else {
                const err = await res.json();
                showToast(err.erro || "Erro ao adicionar", 'erro');
            }
        } catch (e) { console.error(e); }
    });

    const modalExcluirGrupo = document.getElementById('modalExcluirGrupo');
    const btnCancelarExcluirGrupo = document.getElementById('btnCancelarExcluirGrupo');
    const btnConfirmarExcluirGrupo = document.getElementById('btnConfirmarExcluirGrupo');

    btnExcluirGrupo.addEventListener('click', () => {
        modalExcluirGrupo.style.display = 'flex';
    });

    btnCancelarExcluirGrupo.addEventListener('click', () => {
        modalExcluirGrupo.style.display = 'none';
    });

    btnConfirmarExcluirGrupo.addEventListener('click', async () => {
        modalExcluirGrupo.style.display = 'none';
        try {
            const res = await fetch(`${API_BASE_URL}/grupos/${grupoSelecionadoId}`, {
                method: 'DELETE', credentials: 'include'
            });
            if (res.ok) {
                showToast("Grupo excluído com sucesso!");
                document.querySelector('.grade-grupos').classList.remove('grupo-aberto');
                document.getElementById('btnVoltarGrupos').style.display = 'none';
                detalhesGrupoEl.style.display = 'none';
                grupoSelecionadoId = null;
                localStorage.removeItem('ultimoGrupoAberto');
                carregarGrupos();
            } else {
                const err = await res.json();
                showToast(err.erro || "Erro ao excluir", 'erro');
            }
        } catch (e) { console.error(e); }
    });

    // ----------------------------------------------------------------------
    // LÓGICA DE COMPROMISSOS DO GRUPO (CALENDÁRIO E LISTA)
    // ----------------------------------------------------------------------
    let compromissosGrupo = [];
    let calMesAtual = new Date().getMonth();
    let calAnoAtual = new Date().getFullYear();

    const viewCalendarioGrupo = document.getElementById('viewCalendarioGrupo');
    const viewMembrosGrupo = document.getElementById('viewMembrosGrupo');
    const btnTabCalendario = document.getElementById('btnTabCalendario');
    const btnTabMembros = document.getElementById('btnTabMembros');
    const listaCompromissosGrupo = document.getElementById('listaCompromissosGrupo');
    const calendarioGrupoEl = document.getElementById('calendarioGrupo');
    const mesEAnoEl = document.getElementById('mesEAno');

    btnTabCalendario.addEventListener('click', () => {
        btnTabCalendario.classList.add('ativo');
        btnTabMembros.classList.remove('ativo');
        viewCalendarioGrupo.style.display = 'block';
        viewMembrosGrupo.style.display = 'none';
        renderizarCalendarioGrupo(calMesAtual, calAnoAtual);
    });

    btnTabMembros.addEventListener('click', () => {
        btnTabMembros.classList.add('ativo');
        btnTabCalendario.classList.remove('ativo');
        viewMembrosGrupo.style.display = 'block';
        viewCalendarioGrupo.style.display = 'none';
    });

    async function carregarCompromissosDoGrupo(id) {
        try {
            const res = await fetch(`${API_BASE_URL}/compromissos`, { method: 'GET', credentials: 'include' });
            if (res.ok) {
                const dados = await res.json();
                compromissosGrupo = dados.filter(c => c.grupo_id === id).map(c => ({ ...c, data: c.data.split('T')[0] }));
                renderizarListaCompromissosGrupo();
                renderizarCalendarioGrupo(calMesAtual, calAnoAtual);
            }
        } catch (error) { console.error(error); }
    }

    function renderizarListaCompromissosGrupo() {
        listaCompromissosGrupo.innerHTML = '';
        const agora = new Date();
        
        const futuros = compromissosGrupo.filter(c => {
            const dataComp = new Date(`${c.data}T${c.hora}:00`);
            return dataComp >= agora || c.repeticao !== 'nenhuma';
        }).sort((a,b) => new Date(`${a.data}T${a.hora}:00`) - new Date(`${b.data}T${b.hora}:00`));

        if (futuros.length === 0) {
            listaCompromissosGrupo.innerHTML = '<p class="mensagem-vazia">Nenhum evento futuro no grupo.</p>';
            return;
        }

        futuros.forEach(comp => {
            const div = document.createElement('div');
            div.className = 'compromisso-item';
            div.style.background = 'rgba(16, 185, 129, 0.1)';
            div.style.borderLeft = '4px solid #10b981';
            
            const [a, m, d] = comp.data.split('-');
            const tagUrgencia = comp.urgencia === 'urgente' ? `<span style="color:#ef4444; font-size:0.7rem;">(Urgente)</span>` : '';
            
            const canEdit = meuPapelSelecionado === 'admin' || meuPapelSelecionado === 'membro';
            const editBtn = canEdit ? `<button onclick="editarCompromissoGrupo(${comp.id})" style="background:none; border:none; color:var(--primary-color); cursor:pointer;">✏️</button>` : '';

            const nomeCriador = comp.criador_nome ? ` <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal; margin-left: 5px;">(por ${comp.criador_nome})</span>` : '';
            div.innerHTML = `
                <div class="compromisso-info">
                    <strong>${comp.hora} - ${comp.titulo} ${tagUrgencia}${nomeCriador}</strong>
                    <span>${d}/${m}/${a} ${comp.repeticao !== 'nenhuma' ? '🔄 '+comp.repeticao : ''}</span>
                </div>
                ${editBtn}
            `;
            listaCompromissosGrupo.appendChild(div);
        });
    }

    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    function renderizarCalendarioGrupo(mes, ano) {
        calendarioGrupoEl.innerHTML = '';
        mesEAnoEl.textContent = `${meses[mes]} ${ano}`;

        const hoje = new Date();
        const dataHojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
        
        if (!window.dataSelecionadaCalendario) {
            window.dataSelecionadaCalendario = dataHojeStr;
        }

        const primeiroDia = new Date(ano, mes, 1).getDay();
        const diasNoMes = new Date(ano, mes + 1, 0).getDate();
        const diasNoMesAnterior = new Date(ano, mes, 0).getDate();

        for (let i = primeiroDia; i > 0; i--) {
            const div = document.createElement('div');
            div.className = 'dia-calendario inativo';
            div.innerHTML = `<span class="numero-dia">${diasNoMesAnterior - i + 1}</span>`;
            calendarioGrupoEl.appendChild(div);
        }

        for (let i = 1; i <= diasNoMes; i++) {
            const diaEl = document.createElement('div');
            diaEl.className = 'dia-calendario';
            const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            
            const eventos = compromissosGrupo.filter(c => {
                if (window.ocorreNaData) return window.ocorreNaData(c, dataStr);
                return c.data === dataStr;
            });

            let html = eventos.length > 0 ? `<div style="display:flex;flex-direction:column;gap:2px;">${eventos.map(c => {
                return `<div class="evento-calendario grupo">${c.hora} - ${c.titulo}</div>`;
            }).join('')}</div>` : '';

            diaEl.innerHTML = `<span class="numero-dia">${i}</span>${html}`;
            const dataAtual = new Date(ano, mes, i);
            const hojeData = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
            
            if (dataAtual < hojeData) {
                diaEl.classList.add('passado');
            } else if (dataAtual > hojeData) {
                diaEl.classList.add('futuro');
            }

            if (i === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()) diaEl.classList.add('hoje');
            if (dataStr === window.dataSelecionadaCalendario) diaEl.classList.add('selecionado');

            diaEl.classList.add('selecionavel');
            diaEl.onclick = () => {
                window.dataSelecionadaCalendario = dataStr;
                renderizarCalendarioGrupo(mes, ano);
            };

            calendarioGrupoEl.appendChild(diaEl);
        }
    }

    document.getElementById('mesAnterior').addEventListener('click', () => {
        if (--calMesAtual < 0) { calMesAtual = 11; calAnoAtual--; }
        renderizarCalendarioGrupo(calMesAtual, calAnoAtual);
    });

    document.getElementById('proximoMes').addEventListener('click', () => {
        if (++calMesAtual > 11) { calMesAtual = 0; calAnoAtual++; }
        renderizarCalendarioGrupo(calMesAtual, calAnoAtual);
    });

    // ----------------------------------------------------------------------
    // LÓGICA DO MODAL DE COMPROMISSO DO GRUPO
    // ----------------------------------------------------------------------
    const modalCompromisso = document.getElementById('modalCompromisso');
    const formCompromisso = document.getElementById('formCompromisso');

    document.getElementById('btnNovoCompromissoGrupo').addEventListener('click', () => {
        document.getElementById('modalTitulo').textContent = 'Novo Compromisso (Grupo)';
        formCompromisso.reset();
        document.getElementById('compId').value = '';
        document.getElementById('compGrupoId').value = grupoSelecionadoId;
        if (window.dataSelecionadaCalendario) {
            document.getElementById('compData').value = window.dataSelecionadaCalendario;
        }
        modalCompromisso.style.display = 'flex';
    });

    document.getElementById('btnFecharModal').addEventListener('click', () => modalCompromisso.style.display = 'none');
    document.getElementById('btnCancelarModal').addEventListener('click', () => modalCompromisso.style.display = 'none');

    window.editarCompromissoGrupo = (id) => {
        const comp = compromissosGrupo.find(c => c.id === id);
        if (!comp) return;
        document.getElementById('modalTitulo').textContent = 'Editar Compromisso (Grupo)';
        document.getElementById('compId').value = comp.id;
        document.getElementById('compGrupoId').value = comp.grupo_id;
        document.getElementById('compTitulo').value = comp.titulo;
        document.getElementById('compDescricao').value = comp.descricao;
        document.getElementById('compData').value = comp.data;
        document.getElementById('compHora').value = comp.hora;
        document.getElementById('compUrgencia').value = comp.urgencia;
        document.getElementById('compRepeticao').value = comp.repeticao;
        document.getElementById('compTempoLembrete').value = comp.tempo_lembrete !== undefined ? comp.tempo_lembrete : 30;
        modalCompromisso.style.display = 'flex';
    };

    formCompromisso.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('compId').value;
        const data = document.getElementById('compData').value;
        const hora = document.getElementById('compHora').value;
        
        const dataEscolhida = new Date(`${data}T${hora}:00`);
        const limitePassado = new Date();
        limitePassado.setMinutes(limitePassado.getMinutes() - 5);

        if (dataEscolhida < limitePassado) {
            showToast('Não agende compromissos no passado.', 'erro');
            return;
        }

        const novoComp = {
            titulo: document.getElementById('compTitulo').value,
            descricao: document.getElementById('compDescricao').value,
            data: data,
            hora: hora,
            urgencia: document.getElementById('compUrgencia').value,
            repeticao: document.getElementById('compRepeticao').value,
            grupo_id: document.getElementById('compGrupoId').value,
            tempo_lembrete: parseInt(document.getElementById('compTempoLembrete').value),
            status: 'ativo'
        };

        try {
            let res;
            if (id) {
                res = await fetch(`${API_BASE_URL}/compromissos/${id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(novoComp)
                });
            } else {
                res = await fetch(`${API_BASE_URL}/compromissos`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(novoComp)
                });
            }
            if (res.ok) {
                showToast(id ? "Atualizado!" : "Criado com sucesso!");
                modalCompromisso.style.display = 'none';
                carregarCompromissosDoGrupo(grupoSelecionadoId);
            } else {
                const err = await res.json();
                showToast(err.erro || "Erro ao salvar", 'erro');
            }
        } catch (error) { console.error(error); }
    });

    // Pega o ID do usuário logado para lógicas da UI
    fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' })
        .then(r => r.json())
        .then(u => {
            if (u.id) {
                window.usuarioLogadoId = u.id;
                carregarGrupos();
            }
        });
});
