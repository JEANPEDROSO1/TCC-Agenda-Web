const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/estatisticas', adminController.obterEstatisticas);
router.put('/usuarios/:id/cargo', adminController.alternarCargo);
router.delete('/usuarios/:id', adminController.deletarUsuario);

module.exports = router;
