// backend/routes/product.routes.js

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.js'); 

// 1. ATUALIZE A IMPORTAÇÃO
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  getProductDetails, // <-- Adicionado
  deleteProduct,     // <-- Adicionado
} = require('../controllers/product.controller.js');

// Rotas existentes
router.post('/products', authenticateToken, createProduct);
router.get('/products', authenticateToken, getProducts);
router.get('/products/:id', authenticateToken, getProductById); 
router.put('/products/:id', authenticateToken, updateProduct);  

// 2. ADICIONE AS NOVAS ROTAS
// Rota para buscar os detalhes (para o modal)
router.get('/products/:id/details', authenticateToken, getProductDetails);

// Rota para excluir o produto
router.delete('/products/:id', authenticateToken, deleteProduct);

module.exports = router;