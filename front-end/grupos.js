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
        try {
            const res = await fetch(`${API_BASE_URL}/grupos`, { method: 'GET', credentials: 'include' });
            if (res.ok) {
                grupos = await res.json();
                renderizarListaGrupos();
            }
        } catch (error) {
            console.error("Erro ao carregar grupos:", error);
        }
    }

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
                mostrarDetalhesGrupo(dados.grupo, dados.meu_papel, dados.membros);
            }
        } catch (error) {
            console.error("Erro ao carregar detalhes do grupo:", error);
        }
    }

    function mostrarDetalhesGrupo(grupo, meuPapel, membros) {
        meuPapelSelecionado = meuPapel;
        detalhesGrupoEl.style.display = 'block';
        grupoNomeTitulo.textContent = grupo.nome;
        grupoDescricaoDesc.textContent = grupo.descricao || 'Sem descrição';
        
        meuPapelBadge.textContent = meuPapel;
        meuPapelBadge.className = `badge-papel papel-${meuPapel}`;

        // Permissões
        if (meuPapel === 'admin') {
            areaAdicionarMembro.style.display = 'block';
            if (grupo.admin_id === window.usuarioLogadoId) {
                btnExcluirGrupo.style.display = 'inline-block';
            } else {
                btnExcluirGrupo.style.display = 'none';
            }
        } else {
            areaAdicionarMembro.style.display = 'none';
            btnExcluirGrupo.style.display = 'none';
        }

        renderizarMembros(membros, grupo.admin_id);
    }

    function renderizarMembros(membros, adminIdOriginal) {
        listaMembrosEl.innerHTML = '';
        
        membros.forEach(m => {
            const div = document.createElement('div');
            div.className = 'item-membro';
            
            const isAdminGeral = m.id === adminIdOriginal;
            const badge = `<span class="badge-papel papel-${m.papel}" style="margin-top:0;">${isAdminGeral ? 'Criador' : m.papel}</span>`;
            
            let acoesHtml = '';
            
            // Só admin pode editar os outros (e não a si mesmo no select, nem o criador)
            if (meuPapelSelecionado === 'admin' && !isAdminGeral && m.id !== window.usuarioLogadoId) {
                acoesHtml = `
                    <div class="acoes-membro">
                        <select onchange="window.alterarPapel(${m.id}, this.value)">
                            <option value="comum" ${m.papel === 'comum' ? 'selected' : ''}>Comum</option>
                            <option value="membro" ${m.papel === 'membro' ? 'selected' : ''}>Membro</option>
                            <option value="admin" ${m.papel === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                        <button onclick="window.removerMembro(${m.id})" class="btn-secundario" style="color:#ef4444; border-color:#ef4444; padding:4px 8px; font-size:0.8rem;">Remover</button>
                    </div>
                `;
            } else if (m.id === window.usuarioLogadoId && !isAdminGeral) {
                // Eu mesmo posso sair do grupo (se não for o criador)
                acoesHtml = `<button onclick="window.removerMembro(${m.id})" class="btn-secundario" style="color:#ef4444; border-color:#ef4444; padding:4px 8px; font-size:0.8rem;">Sair do Grupo</button>`;
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
        });
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

    window.removerMembro = async (usuarioId) => {
        if (!confirm("Tem certeza que deseja remover este membro?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/grupos/${grupoSelecionadoId}/membros/${usuarioId}`, {
                method: 'DELETE', credentials: 'include'
            });
            if (res.ok) {
                showToast("Membro removido!");
                if (usuarioId === window.usuarioLogadoId) {
                    detalhesGrupoEl.style.display = 'none';
                    carregarGrupos();
                } else {
                    carregarDetalhesGrupo(grupoSelecionadoId);
                }
            } else {
                const err = await res.json();
                showToast(err.erro || "Erro ao remover", 'erro');
            }
        } catch (e) { console.error(e); }
    };

    // Eventos DOM
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
                showToast("Membro adicionado!");
                formAdicionarMembro.reset();
                carregarDetalhesGrupo(grupoSelecionadoId);
            } else {
                const err = await res.json();
                showToast(err.erro || "Erro ao adicionar", 'erro');
            }
        } catch (e) { console.error(e); }
    });

    btnExcluirGrupo.addEventListener('click', async () => {
        if (!confirm("CUIDADO: Tem certeza que deseja excluir o grupo inteiro? Todos os compromissos dele serão perdidos para todos os membros.")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/grupos/${grupoSelecionadoId}`, {
                method: 'DELETE', credentials: 'include'
            });
            if (res.ok) {
                showToast("Grupo excluído com sucesso!");
                detalhesGrupoEl.style.display = 'none';
                carregarGrupos();
            } else {
                const err = await res.json();
                showToast(err.erro || "Erro ao excluir", 'erro');
            }
        } catch (e) { console.error(e); }
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
