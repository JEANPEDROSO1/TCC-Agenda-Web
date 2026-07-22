const express = require('express');
const router = express.Router();
const compromissosController = require('../controllers/compromissosController');
const authMiddleware = require('../middleware/authMiddleware');

// Todas as rotas de compromissos precisam de autenticação
router.use(authMiddleware);

router.get('/', compromissosController.listar);
router.post('/', compromissosController.criar);
router.put('/:id', compromissosController.atualizar);
router.delete('/:id', compromissosController.deletar);

module.exports = router;
