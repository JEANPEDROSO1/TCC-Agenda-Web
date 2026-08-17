const pool = require('../db');

exports.listar = async (req, res) => {
    try {
        const [compromissos] = await pool.execute(`
            SELECT c.*, gm.papel as meu_papel_grupo, u.nome as criador_nome
            FROM compromissos c
            LEFT JOIN grupo_membros gm ON c.grupo_id = gm.grupo_id AND gm.usuario_id = ?
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            WHERE c.usuario_id = ? OR c.grupo_id IN (SELECT grupo_id FROM grupo_membros WHERE usuario_id = ? AND status = 'aceito')
            ORDER BY c.data ASC, c.hora ASC
        `, [req.user.id, req.user.id, req.user.id]);
        
        res.json(compromissos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro interno no servidor ao listar compromissos.' });
    }
};

exports.criar = async (req, res) => {
    const { titulo, descricao, data, hora, urgencia, repeticao, status, tempo_lembrete, grupo_id } = req.body;
    try {
        let finalGrupoId = null;

        // Verifica permissão se for vinculado a um grupo
        if (grupo_id) {
            const [membro] = await pool.execute(
                'SELECT papel FROM grupo_membros WHERE grupo_id = ? AND usuario_id = ?',
                [grupo_id, req.user.id]
            );
            if (membro.length === 0 || membro[0].papel === 'comum') {
                return res.status(403).json({ erro: 'Você não tem permissão para criar eventos neste grupo.' });
            }
            finalGrupoId = grupo_id;
        }

        const [result] = await pool.execute(
            'INSERT INTO compromissos (usuario_id, grupo_id, titulo, descricao, data, hora, urgencia, repeticao, status, tempo_lembrete, lembrete_enviado, notificacao_hora_enviada) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)',
            [req.user.id, finalGrupoId, titulo, descricao || '', data, hora, urgencia || 'normal', repeticao || 'nenhuma', status || 'ativo', tempo_lembrete || 0]
        );
        res.status(201).json({ mensagem: 'Compromisso criado com sucesso!', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro interno ao criar compromisso.' });
    }
};

exports.atualizar = async (req, res) => {
    const { id } = req.params;
    const { titulo, descricao, data, hora, urgencia, repeticao, status, tempo_lembrete, grupo_id } = req.body;
    try {
        // Busca o compromisso atual
        const [rows] = await pool.execute('SELECT * FROM compromissos WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ erro: 'Compromisso não encontrado.' });
        
        const compAtual = rows[0];

        // Verifica permissão
        if (compAtual.grupo_id) {
            const [membro] = await pool.execute(
                'SELECT papel FROM grupo_membros WHERE grupo_id = ? AND usuario_id = ?',
                [compAtual.grupo_id, req.user.id]
            );
            if (membro.length === 0 || membro[0].papel === 'comum') {
                return res.status(403).json({ erro: 'Você não tem permissão para editar eventos deste grupo.' });
            }
        } else if (compAtual.usuario_id !== req.user.id) {
            return res.status(403).json({ erro: 'Este compromisso não pertence a você.' });
        }

        let finalGrupoId = compAtual.grupo_id;
        if (grupo_id !== undefined && grupo_id !== finalGrupoId) {
             if (grupo_id) {
                 const [membroDestino] = await pool.execute(
                    'SELECT papel FROM grupo_membros WHERE grupo_id = ? AND usuario_id = ?',
                    [grupo_id, req.user.id]
                 );
                 if (membroDestino.length === 0 || membroDestino[0].papel === 'comum') {
                     return res.status(403).json({ erro: 'Você não tem permissão para mover o evento para este grupo.' });
                 }
             }
             finalGrupoId = grupo_id || null;
        }

        await pool.execute(
            'UPDATE compromissos SET grupo_id=?, titulo=?, descricao=?, data=?, hora=?, urgencia=?, repeticao=?, status=?, tempo_lembrete=?, lembrete_enviado=0, notificacao_hora_enviada=0 WHERE id=?',
            [finalGrupoId, titulo, descricao || '', data, hora, urgencia, repeticao, status, tempo_lembrete || 0, id]
        );
        res.json({ mensagem: 'Compromisso atualizado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro interno ao atualizar compromisso.' });
    }
};

exports.deletar = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.execute('SELECT * FROM compromissos WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ erro: 'Compromisso não encontrado.' });

        const compAtual = rows[0];

        // Verifica permissão
        if (compAtual.grupo_id) {
            const [membro] = await pool.execute(
                'SELECT papel FROM grupo_membros WHERE grupo_id = ? AND usuario_id = ?',
                [compAtual.grupo_id, req.user.id]
            );
            if (membro.length === 0 || membro[0].papel === 'comum') {
                return res.status(403).json({ erro: 'Você não tem permissão para deletar eventos deste grupo.' });
            }
        } else if (compAtual.usuario_id !== req.user.id) {
            return res.status(403).json({ erro: 'Este compromisso não pertence a você.' });
        }

        await pool.execute('DELETE FROM compromissos WHERE id = ?', [id]);
        res.json({ mensagem: 'Compromisso deletado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro interno ao deletar compromisso.' });
    }
};
