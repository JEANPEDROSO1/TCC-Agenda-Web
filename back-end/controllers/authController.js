const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { enviarCodigoRecuperacao } = require('../services/emailService');

// Cadastro
exports.register = async (req, res) => {
    const { nome, email, senha } = req.body;

    try {
        // Verifica se usuário existe
        const [users] = await pool.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (users.length > 0) {
            return res.status(400).json({ erro: 'Este e-mail já está em uso.' });
        }

        // Criptografa a senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        // Insere no banco
        await pool.execute(
            'INSERT INTO usuarios (nome, email, senha, cargo) VALUES (?, ?, ?, ?)',
            [nome, email, senhaHash, 'usuario']
        );

        res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
};

// Login
exports.login = async (req, res) => {
    const { email, senha } = req.body;

    try {
        // Busca usuário
        const [users] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
        const user = users[0];

        if (!user) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' });
        }

        // Verifica senha
        const isMatch = await bcrypt.compare(senha, user.senha);
        if (!isMatch) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' });
        }

        // Gera JWT
        const payload = { id: user.id, cargo: user.cargo, nome: user.nome };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

        // Envia Token em Cookie Seguro (HttpOnly previne XSS)
        // SameSite: 'None' é obrigatório para cross-domain (Vercel -> Render)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // true se estiver na Vercel/Render
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Strict',
            maxAge: 24 * 60 * 60 * 1000 // 24h
        });

        res.json({
            mensagem: 'Login efetuado com sucesso!',
            usuario: { id: user.id, nome: user.nome, email: user.email, cargo: user.cargo, foto: user.foto }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
};

// Gerar Código de Recuperação (Esqueci a Senha - Etapa 1)
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const [users] = await pool.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (users.length === 0) {
            // Retorna sucesso de qualquer forma para não vazar emails existentes (Prática de segurança)
            return res.json({ mensagem: 'Se o e-mail existir, um código foi enviado.' });
        }

        // Gera código de 6 dígitos
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Data de expiração (15 minutos)
        const expiracao = new Date(Date.now() + 15 * 60000);

        // Salva no banco
        await pool.execute(
            'UPDATE usuarios SET codigo_verificacao = ?, codigo_expiracao = ? WHERE email = ?',
            [codigo, expiracao, email]
        );

        // Envia E-mail (No Background)
        enviarCodigoRecuperacao(email, codigo).catch(err => console.error("Falha silenciosa ao enviar email:", err));

        res.json({ mensagem: 'Se o e-mail existir, um código foi enviado.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
};

// Verificar Código OTP (Esqueci a Senha - Etapa 2)
exports.verifyCode = async (req, res) => {
    const { email, codigo } = req.body;

    try {
        const [users] = await pool.execute(
            'SELECT id, codigo_expiracao FROM usuarios WHERE email = ? AND codigo_verificacao = ?',
            [email, codigo]
        );

        const user = users[0];

        if (!user) {
            return res.status(400).json({ erro: 'Código inválido.' });
        }

        if (new Date() > new Date(user.codigo_expiracao)) {
            return res.status(400).json({ erro: 'Código expirado. Solicite um novo.' });
        }

        // Sucesso
        res.json({ mensagem: 'Código verificado com sucesso!', token_reset: 'permitido' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
};

// Redefinir Senha (Esqueci a Senha - Etapa 3)
exports.resetPassword = async (req, res) => {
    const { email, codigo, novaSenha } = req.body;

    try {
        // Dupla verificação de segurança antes de mudar a senha
        const [users] = await pool.execute(
            'SELECT id, codigo_expiracao FROM usuarios WHERE email = ? AND codigo_verificacao = ?',
            [email, codigo]
        );

        const user = users[0];

        if (!user || new Date() > new Date(user.codigo_expiracao)) {
            return res.status(400).json({ erro: 'Solicitação inválida ou expirada.' });
        }

        // Criptografa nova senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(novaSenha, salt);

        // Atualiza a senha e ANULA (NULL) os códigos para eles não serem reusados
        await pool.execute(
            'UPDATE usuarios SET senha = ?, codigo_verificacao = NULL, codigo_expiracao = NULL WHERE email = ?',
            [senhaHash, email]
        );

        res.json({ mensagem: 'Senha redefinida com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
};

// Logout
exports.logout = (req, res) => {
    res.clearCookie('token');
    res.json({ mensagem: 'Deslogado com sucesso!' });
};

// Solicitar Troca de Senha (Usuário Autenticado)
exports.requestPasswordChange = async (req, res) => {
    try {
        console.log(`\n[ETAPA 1] Recebida solicitação de troca de senha. Buscando email do usuário ID: ${req.user.id}...`);
        const [users] = await pool.execute('SELECT email FROM usuarios WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            console.log(`[ERRO] Usuário ID ${req.user.id} não encontrado no banco.`);
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }
        
        const email = users[0].email;
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        const expiracao = new Date(Date.now() + 15 * 60000); // 15 mins

        await pool.execute(
            'UPDATE usuarios SET codigo_verificacao = ?, codigo_expiracao = ? WHERE id = ?',
            [codigo, expiracao, req.user.id]
        );
        console.log(`[ETAPA 2] Código OTP gerado e salvo no banco. Chamando serviço de email para: ${email}`);

        // Envia em background para não travar a resposta HTTP
        enviarCodigoRecuperacao(email, codigo).catch(err => console.error("[ETAPA 3 - FALHA FATAL] O background falhou ao enviar o e-mail:", err));

        res.json({ mensagem: 'Código de verificação enviado para o seu e-mail.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao solicitar troca de senha.' });
    }
};

// Verificar Código (Usuário Autenticado - Etapa 2)
exports.verifyCodeAuth = async (req, res) => {
    const { codigo } = req.body;
    try {
        const [users] = await pool.execute(
            'SELECT id, codigo_expiracao FROM usuarios WHERE id = ? AND codigo_verificacao = ?',
            [req.user.id, codigo]
        );

        const user = users[0];

        if (!user) {
            return res.status(400).json({ erro: 'Código inválido.' });
        }

        if (new Date() > new Date(user.codigo_expiracao)) {
            return res.status(400).json({ erro: 'Código expirado. Solicite um novo.' });
        }

        res.json({ mensagem: 'Código verificado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
};

// Verificar e Trocar Senha (Usuário Autenticado)
exports.verifyPasswordChange = async (req, res) => {
    const { codigo, novaSenha } = req.body;
    try {
        const [users] = await pool.execute(
            'SELECT codigo_expiracao FROM usuarios WHERE id = ? AND codigo_verificacao = ?',
            [req.user.id, codigo]
        );

        const user = users[0];
        if (!user || new Date() > new Date(user.codigo_expiracao)) {
            return res.status(400).json({ erro: 'Código inválido ou expirado.' });
        }

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(novaSenha, salt);

        await pool.execute(
            'UPDATE usuarios SET senha = ?, codigo_verificacao = NULL, codigo_expiracao = NULL WHERE id = ?',
            [senhaHash, req.user.id]
        );

        res.json({ mensagem: 'Senha alterada com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao alterar a senha.' });
    }
};

// Atualizar Perfil (Usuário Autenticado)
exports.updatePerfil = async (req, res) => {
    const { nome, foto } = req.body;
    
    if (!nome) {
        return res.status(400).json({ erro: 'O nome é obrigatório.' });
    }

    try {
        // Se foto foi enviada, atualiza ambos. Se não, apenas o nome.
        if (foto) {
            await pool.execute(
                'UPDATE usuarios SET nome = ?, foto = ? WHERE id = ?',
                [nome, foto, req.user.id]
            );
        } else {
            await pool.execute(
                'UPDATE usuarios SET nome = ? WHERE id = ?',
                [nome, req.user.id]
            );
        }

        res.json({ mensagem: 'Perfil atualizado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro interno ao atualizar perfil.' });
    }
};

// Retornar Dados Atuais do Usuário (Sincronização)
exports.me = async (req, res) => {
    try {
        const [users] = await pool.execute('SELECT nome, foto FROM usuarios WHERE id = ?', [req.user.id]);
        if (users.length > 0) {
            res.json({ nome: users[0].nome, foto: users[0].foto });
        } else {
            res.status(404).json({ erro: 'Usuário não encontrado' });
        }
    } catch (error) {
        res.status(500).json({ erro: 'Erro interno' });
    }
};
