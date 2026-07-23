const pool = require('../db');

exports.obterEstatisticas = async (req, res) => {
    try {
        // Verifica se o usuário logado é admin
        if (req.user.cargo !== 'admin') {
            return res.status(403).json({ erro: 'Acesso negado. Apenas administradores.' });
        }

        // Obtém todos os usuários
        const [usuarios] = await pool.execute('SELECT id_usuario AS id, nome, email, role AS cargo FROM usuarios');
        
        // Obtém estatísticas de compromissos
        const [compromissosCount] = await pool.execute('SELECT COUNT(*) as total FROM compromissos');
        const [compromissos] = await pool.execute('SELECT data, hora FROM compromissos'); // para os gráficos

        res.json({
            usuarios,
            totalCompromissos: compromissosCount[0].total,
            compromissosData: compromissos // envia apenas data e hora para não pesar
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao buscar estatísticas do admin.' });
    }
};

exports.alternarCargo = async (req, res) => {
    try {
        if (req.user.cargo !== 'admin') return res.status(403).json({ erro: 'Acesso negado.' });
        const { id } = req.params;
        
        const [users] = await pool.execute('SELECT role AS cargo FROM usuarios WHERE id_usuario = ?', [id]);
        if (users.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado.' });
        
        const novoCargo = users[0].cargo === 'admin' ? 'user' : 'admin';
        await pool.execute('UPDATE usuarios SET role = ? WHERE id_usuario = ?', [novoCargo, id]);
        
        res.json({ mensagem: `Cargo atualizado para ${novoCargo} com sucesso!` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao alterar cargo.' });
    }
};

exports.deletarUsuario = async (req, res) => {
    try {
        if (req.user.cargo !== 'admin') return res.status(403).json({ erro: 'Acesso negado.' });
        const { id } = req.params;
        
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ erro: 'Você não pode deletar a si mesmo.' });
        }

        await pool.execute('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
        res.json({ mensagem: 'Usuário deletado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao deletar usuário.' });
    }
};
