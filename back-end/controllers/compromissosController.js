const pool = require('../db');

exports.listar = async (req, res) => {
    try {
        const [compromissos] = await pool.execute(
            'SELECT * FROM compromissos WHERE usuario_id = ? ORDER BY data ASC, hora ASC',
            [req.user.id]
        );
        res.json(compromissos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro interno no servidor ao listar compromissos.' });
    }
};

exports.criar = async (req, res) => {
    const { titulo, descricao, data, hora, urgencia, repeticao, status } = req.body;
    try {
        const [result] = await pool.execute(
            'INSERT INTO compromissos (usuario_id, titulo, descricao, data, hora, urgencia, repeticao, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, titulo, descricao || '', data, hora, urgencia || 'normal', repeticao || 'nenhuma', status || 'ativo']
        );
        res.status(201).json({ mensagem: 'Compromisso criado com sucesso!', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro interno ao criar compromisso.' });
    }
};

exports.atualizar = async (req, res) => {
    const { id } = req.params;
    const { titulo, descricao, data, hora, urgencia, repeticao, status } = req.body;
    try {
        // Verifica posse
        const [rows] = await pool.execute('SELECT id FROM compromissos WHERE id = ? AND usuario_id = ?', [id, req.user.id]);
        if (rows.length === 0) return res.status(404).json({ erro: 'Compromisso não encontrado ou não pertence ao usuário.' });

        await pool.execute(
            'UPDATE compromissos SET titulo=?, descricao=?, data=?, hora=?, urgencia=?, repeticao=?, status=? WHERE id=?',
            [titulo, descricao || '', data, hora, urgencia, repeticao, status, id]
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
        const [rows] = await pool.execute('SELECT id FROM compromissos WHERE id = ? AND usuario_id = ?', [id, req.user.id]);
        if (rows.length === 0) return res.status(404).json({ erro: 'Compromisso não encontrado ou não pertence ao usuário.' });

        await pool.execute('DELETE FROM compromissos WHERE id = ?', [id]);
        res.json({ mensagem: 'Compromisso deletado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro interno ao deletar compromisso.' });
    }
};
