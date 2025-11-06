// backend/controllers/product.controller.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Criar (Já existe, mantenha)
const createProduct = async (req, res) => {
  // ... (seu código existente, não precisa mudar)
  try {
    const { name, sku, category, unitMeasure, minStockLevel, location } = req.body;
    if (!name || !sku || !unitMeasure) {
      return res.status(400).json({ error: 'Nome, SKU e Unidade de Medida são obrigatórios.' });
    }
    const product = await prisma.product.create({
      data: { name, sku, category, unitMeasure, minStockLevel: parseInt(minStockLevel) || 0, location, controlsLot: true, controlsExpiry: true, },
    });
    res.status(201).json(product);
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target.includes('sku')) {
      return res.status(409).json({ error: 'Um produto com este SKU já existe.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
};

// 2. Listar (Já existe, mantenha)
const getProducts = async (req, res) => {
  // ... (seu código existente, não precisa mudar)
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
    });
    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
};

// 3. Obter um (Já existe, mantenha)
const getProductById = async (req, res) => {
  // ... (seu código existente, não precisa mudar)
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    });
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
};

// 4. Atualizar (Já existe, mantenha)
const updateProduct = async (req, res) => {
  // ... (seu código existente, não precisa mudar)
  try {
    const { id } = req.params;
    const { name, sku, category, unitMeasure, minStockLevel, location, controlsLot, controlsExpiry } = req.body;
    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: { name, sku, category, unitMeasure, minStockLevel: parseInt(minStockLevel), location, controlsLot, controlsExpiry, },
    });
    res.status(200).json(updatedProduct);
  } catch (error) {
    if (error.code === 'P2025') {
       return res.status(404).json({ error: 'Produto não encontrado' });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
};


// --- 5. (NOVA FUNÇÃO) Buscar Detalhes do Produto (para o Modal) ---
const getProductDetails = async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Busca as informações básicas do produto
    const productInfo = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    });

    if (!productInfo) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    // 2. Busca os lotes que ainda têm estoque
    const lotsWithStock = await prisma.stockLot.findMany({
      where: {
        productId: parseInt(id),
        currentQuantity: { gt: 0 },
      },
      orderBy: { expiryDate: 'asc' },
    });

    // 3. Calcula o estoque total somando os lotes
    const totalStock = lotsWithStock.reduce((sum, lot) => sum + lot.currentQuantity, 0);

    // 4. Retorna tudo
    res.status(200).json({
      ...productInfo, // (id, name, sku, location, minStockLevel, etc.)
      totalQuantity: totalStock,
      lotsBreakdown: lotsWithStock, // A lista de lotes com estoque
    });

  } catch (error) {
    console.error("Erro ao buscar detalhes do produto:", error);
    res.status(500).json({ error: 'Erro ao buscar detalhes do produto.' });
  }
};

// --- 6. (NOVA FUNÇÃO) Excluir Produto ---
const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    // Regra de Negócio: Não podemos excluir um produto que JÁ TEVE movimentação
    // ou que ainda tem lotes (mesmo que vazios) para manter a integridade.
    await prisma.$transaction(async (tx) => {
      const intId = parseInt(id);

      // 1. Verifica se há histórico de movimentação
      const movementCount = await tx.stockMovement.count({
        where: { productId: intId },
      });
      if (movementCount > 0) {
        throw new Error('Este produto possui histórico de movimentação e não pode ser excluído.');
      }

      // 2. Se não tem histórico, podemos apagar os lotes (que estão vazios, se houver)
      await tx.stockLot.deleteMany({
        where: { productId: intId },
      });

      // 3. Agora podemos apagar o produto
      await tx.product.delete({
        where: { id: intId },
      });
    });

    res.status(204).send(); // 204 = Sucesso, sem conteúdo

  } catch (error) {
    if (error.code === 'P2025') { // Erro do Prisma (não achou)
        return res.status(404).json({ error: 'Produto não encontrado.' });
    }
    if (error.message.includes('histórico')) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Erro ao excluir produto:", error);
    res.status(500).json({ error: 'Erro ao excluir produto.' });
  }
};


// --- ATUALIZE O MODULE.EXPORTS ---
module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  getProductDetails, // <-- Adicionado
  deleteProduct,     // <-- Adicionado
};