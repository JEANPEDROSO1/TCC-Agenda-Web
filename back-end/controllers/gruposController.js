const pool = require('../db');

exports.criarGrupo = async (req, res) => {
    const { nome, descricao } = req.body;
    const admin_id = req.user.id;

    if (!nome) return res.status(400).json({ erro: "O nome do grupo é obrigatório." });

    try {
        const [result] = await pool.execute(
            'INSERT INTO grupos (nome, descricao, admin_id) VALUES (?, ?, ?)',
            [nome, descricao || null, admin_id]
        );
        const grupo_id = result.insertId;

        // Adiciona o criador como admin do grupo na tabela de membros
        await pool.execute(
            'INSERT INTO grupo_membros (grupo_id, usuario_id, papel, status) VALUES (?, ?, ?, ?)',
            [grupo_id, admin_id, 'admin', 'aceito']
        );

        res.status(201).json({ mensagem: "Grupo criado com sucesso!", id: grupo_id });
    } catch (error) {
        console.error("Erro ao criar grupo:", error);
        res.status(500).json({ erro: "Erro ao criar o grupo." });
    }
};

exports.listarMeusGrupos = async (req, res) => {
    const usuario_id = req.user.id;

    try {
        const [grupos] = await pool.execute(`
            SELECT g.id, g.nome, g.descricao, g.admin_id, gm.papel 
            FROM grupos g
            JOIN grupo_membros gm ON g.id = gm.grupo_id
            WHERE gm.usuario_id = ? AND gm.status = 'aceito'
            ORDER BY g.created_at DESC
        `, [usuario_id]);

        res.json(grupos);
    } catch (error) {
        console.error("Erro ao listar grupos:", error);
        res.status(500).json({ erro: "Erro ao listar grupos." });
    }
};

exports.obterGrupo = async (req, res) => {
    const { id } = req.params;
    const usuario_id = req.user.id;

    try {
        // Verifica se o usuário pertence ao grupo
        const [membrosValida] = await pool.execute(
            "SELECT papel FROM grupo_membros WHERE grupo_id = ? AND usuario_id = ? AND status = 'aceito'",
            [id, usuario_id]
        );

        if (membrosValida.length === 0) {
            return res.status(403).json({ erro: "Você não tem acesso a este grupo." });
        }

        const [grupos] = await pool.execute('SELECT * FROM grupos WHERE id = ?', [id]);
        if (grupos.length === 0) return res.status(404).json({ erro: "Grupo não encontrado." });

        const [membros] = await pool.execute(`
            SELECT u.id, u.nome, u.email, gm.papel, gm.created_at, gm.status
            FROM grupo_membros gm
            JOIN usuarios u ON gm.usuario_id = u.id
            WHERE gm.grupo_id = ? AND gm.status = 'aceito'
            ORDER BY FIELD(gm.papel, 'admin', 'membro', 'comum'), u.nome ASC
        `, [id]);

        const [convites] = await pool.execute(`
            SELECT u.id, u.nome, u.email, gm.papel, gm.created_at, gm.status
            FROM grupo_membros gm
            JOIN usuarios u ON gm.usuario_id = u.id
            WHERE gm.grupo_id = ? AND gm.status = 'pendente'
            ORDER BY u.nome ASC
        `, [id]);

        res.json({ grupo: grupos[0], meu_papel: membrosValida[0].papel, membros, convites });
    } catch (error) {
        console.error("Erro ao obter grupo:", error);
        res.status(500).json({ erro: "Erro SQL: " + error.message });
    }
};

exports.adicionarMembro = async (req, res) => {
    const { id } = req.params;
    const { email, papel } = req.body;
    const usuario_id = req.user.id;

    if (!email || !papel) return res.status(400).json({ erro: "Email e papel são obrigatórios." });

    try {
        // Verifica permissão (apenas admin pode adicionar)
        const [adminValida] = await pool.execute(
            'SELECT papel FROM grupo_membros WHERE grupo_id = ? AND usuario_id = ? AND papel = ?',
            [id, usuario_id, 'admin']
        );
        if (adminValida.length === 0) return res.status(403).json({ erro: "Apenas administradores podem adicionar membros." });

        // Encontra o usuário pelo e-mail
        const [usuarios] = await pool.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (usuarios.length === 0) return res.status(404).json({ erro: "Usuário não encontrado com este e-mail." });
        const novo_membro_id = usuarios[0].id;

        // Verifica se já é membro
        const [existente] = await pool.execute('SELECT * FROM grupo_membros WHERE grupo_id = ? AND usuario_id = ?', [id, novo_membro_id]);
        if (existente.length > 0) return res.status(400).json({ erro: "Usuário já é membro deste grupo." });

        await pool.execute(
            'INSERT INTO grupo_membros (grupo_id, usuario_id, papel, status) VALUES (?, ?, ?, "pendente")',
            [id, novo_membro_id, papel]
        );

        res.status(201).json({ mensagem: "Convite enviado com sucesso!" });
    } catch (error) {
        console.error("Erro ao adicionar membro:", error);
        res.status(500).json({ erro: error.message || "Erro ao adicionar membro." });
    }
};

exports.alterarPapelMembro = async (req, res) => {
    const { id, membroId } = req.params;
    const { papel } = req.body;
    const usuario_id = req.user.id;

    if (!papel) return res.status(400).json({ erro: "O papel é obrigatório." });

    try {
        const [adminValida] = await pool.execute(
            'SELECT papel FROM grupo_membros WHERE grupo_id = ? AND usuario_id = ? AND papel = ?',
            [id, usuario_id, 'admin']
        );
        if (adminValida.length === 0) return res.status(403).json({ erro: "Apenas administradores podem alterar papéis." });

        // Impede que o próprio admin altere seu papel ou remova seu admin se for o único, mas simplificaremos para: não alterar o criador original.
        const [grupo] = await pool.execute('SELECT admin_id FROM grupos WHERE id = ?', [id]);
        if (grupo[0].admin_id == membroId) {
            return res.status(400).json({ erro: "Não é possível alterar o papel do criador do grupo." });
        }

        await pool.execute(
            'UPDATE grupo_membros SET papel = ? WHERE grupo_id = ? AND usuario_id = ?',
            [papel, id, membroId]
        );

        res.json({ mensagem: "Papel atualizado com sucesso!" });
    } catch (error) {
        console.error("Erro ao alterar papel:", error);
        res.status(500).json({ erro: "Erro ao alterar papel do membro." });
    }
};

exports.removerMembro = async (req, res) => {
    const { id, membroId } = req.params;
    const usuario_id = req.user.id;

    try {
        // Admin removendo alguém, OU a própria pessoa saindo
        const isAdmin = await pool.execute(
            'SELECT papel FROM grupo_membros WHERE grupo_id = ? AND usuario_id = ? AND papel = ?',
            [id, usuario_id, 'admin']
        ).then(([rows]) => rows.length > 0);

        if (!isAdmin && usuario_id != membroId) {
            return res.status(403).json({ erro: "Você não tem permissão para remover este membro." });
        }

        const [grupo] = await pool.execute('SELECT admin_id FROM grupos WHERE id = ?', [id]);
        if (grupo[0].admin_id == membroId) {
            return res.status(400).json({ erro: "Não é possível remover o criador do grupo. Exclua o grupo inteiro se desejar." });
        }

        await pool.execute('DELETE FROM grupo_membros WHERE grupo_id = ? AND usuario_id = ?', [id, membroId]);

        res.json({ mensagem: "Membro removido com sucesso!" });
    } catch (error) {
        console.error("Erro ao remover membro:", error);
        res.status(500).json({ erro: "Erro ao remover membro." });
    }
};

exports.excluirGrupo = async (req, res) => {
    const { id } = req.params;
    const usuario_id = req.user.id;

    try {
        const [grupo] = await pool.execute('SELECT admin_id FROM grupos WHERE id = ?', [id]);
        
        if (grupo.length === 0) return res.status(404).json({ erro: "Grupo não encontrado." });
        
        if (grupo[0].admin_id != usuario_id) {
            return res.status(403).json({ erro: "Apenas o criador do grupo pode excluí-lo." });
        }

        // O CASCADE no MySQL vai apagar grupo_membros e compromissos vinculados a este grupo automaticamente.
        await pool.execute('DELETE FROM grupos WHERE id = ?', [id]);

        res.json({ mensagem: "Grupo excluído com sucesso!" });
    } catch (error) {
        console.error("Erro ao excluir grupo:", error);
        res.status(500).json({ erro: "Erro ao excluir grupo." });
    }
};

exports.listarConvitesPendentes = async (req, res) => {
    const usuario_id = req.user.id;
    try {
        const [convites] = await pool.execute(`
            SELECT g.id, g.nome, g.descricao, gm.papel, gm.created_at as data_convite
            FROM grupos g
            JOIN grupo_membros gm ON g.id = gm.grupo_id
            WHERE gm.usuario_id = ? AND gm.status = 'pendente'
            ORDER BY gm.created_at DESC
        `, [usuario_id]);
        res.json(convites);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao listar convites." });
    }
};

exports.aceitarConvite = async (req, res) => {
    const { id } = req.params;
    const usuario_id = req.user.id;
    try {
        const [result] = await pool.execute(
            "UPDATE grupo_membros SET status = 'aceito' WHERE grupo_id = ? AND usuario_id = ? AND status = 'pendente'",
            [id, usuario_id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ erro: "Convite não encontrado ou já aceito." });
        res.json({ mensagem: "Convite aceito com sucesso!" });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao aceitar convite." });
    }
};

exports.recusarConvite = async (req, res) => {
    const { id } = req.params;
    const usuario_id = req.user.id;
    try {
        const [result] = await pool.execute(
            'DELETE FROM grupo_membros WHERE grupo_id = ? AND usuario_id = ? AND status = ?',
            [id, usuario_id, 'pendente']
        );
        if (result.affectedRows === 0) return res.status(404).json({ erro: "Convite não encontrado." });
        res.json({ mensagem: "Convite recusado." });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao recusar convite." });
    }
};
