const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ erro: 'Acesso negado. Nenhum token fornecido.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, cargo, nome }
        next();
    } catch (error) {
        res.status(400).json({ erro: 'Token inválido ou expirado.' });
    }
};
