const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Globais
app.use(cors({
    origin: (origin, callback) => {
        // Permite requisições sem origem (como ferramentas locais) ou vindas da origem definida no .env
        const allowedOrigin = process.env.FRONTEND_URL || 'http://127.0.0.1:5500';
        if (!origin || origin === allowedOrigin || origin === 'http://localhost:5500') {
            callback(null, true);
        } else {
            callback(new Error('Bloqueado pelo CORS'));
        }
    },
    credentials: true // Permite o envio de cookies no CORS (necessário para JWT)
}));
app.use(express.json());
app.use(cookieParser());

// Rotas
app.use('/api/auth', authRoutes);

// Rota raiz para teste
app.get('/', (req, res) => {
    res.send('Servidor Agenda Web rodando com sucesso!');
});

// Inicialização
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🌐 API disponivel em: http://localhost:${PORT}`);
});
