// backend/routes/stock.routes.js

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.js'); 

// 1. ATUALIZE A IMPORTAÇÃO
const {
  createStockEntry,
  createStockExit,
  getStockSummary,
  getLotsForProduct, // <-- ADICIONE ESTA
} = require('../controllers/stock.controller.js');

// Rota para a tela "Entrada de Estoque" (Já existe)
router.post('/stock/entry', authenticateToken, createStockEntry);

// Rota para a tela "Saída de Estoque" (Já existe)
router.post('/stock/exit', authenticateToken, createStockExit);

// Rota para a tela de "Listagem de Estoque" (Já existe)
router.get('/stock/summary', authenticateToken, getStockSummary);

// 2. ADICIONE A NOVA ROTA
// Rota para buscar lotes disponíveis de um produto específico
router.get('/stock/lots/:productId', authenticateToken, getLotsForProduct);


module.exports = router;