const express = require('express');
const router = express.Router();
const gruposController = require('../controllers/gruposController');
const authMiddleware = require('../middleware/authMiddleware');

// Rotas protegidas por autenticação
router.use(authMiddleware);

// Criar um novo grupo
router.post('/', gruposController.criarGrupo);

// Listar os grupos que o usuário participa
router.get('/', gruposController.listarMeusGrupos);

// Listar convites pendentes
router.get('/convites', gruposController.listarConvitesPendentes);

// Aceitar convite
router.put('/:id/aceitar', gruposController.aceitarConvite);

// Recusar convite
router.delete('/:id/recusar', gruposController.recusarConvite);

// Obter detalhes de um grupo (incluindo membros)
router.get('/:id', gruposController.obterGrupo);

// Adicionar membro ao grupo
router.post('/:id/membros', gruposController.adicionarMembro);

// Alterar papel do membro no grupo
router.put('/:id/membros/:membroId/papel', gruposController.alterarPapelMembro);

// Remover membro do grupo (ou sair do grupo)
router.delete('/:id/membros/:membroId', gruposController.removerMembro);

// Excluir grupo
router.delete('/:id', gruposController.excluirGrupo);

module.exports = router;
