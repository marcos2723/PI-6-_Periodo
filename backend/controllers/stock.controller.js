// backend/controllers/stock.controller.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Dar ENTRADA (Esta função já existe, mantenha)
const createStockEntry = async (req, res) => {
  const { productId, lotNumber, expiryDate, quantity, reason } = req.body;
  const userId = req.user.userId; 

  if (!productId || !lotNumber || !quantity) {
    return res.status(400).json({ error: 'Produto, Lote e Quantidade são obrigatórios.' });
  }
  const intQuantity = parseInt(quantity);
  if (intQuantity <= 0) {
    return res.status(400).json({ error: 'A quantidade deve ser positiva.' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const newLot = await tx.stockLot.create({
        data: {
          productId: parseInt(productId),
          lotNumber,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          initialQuantity: intQuantity,
          currentQuantity: intQuantity, 
          entryDate: new Date(),
        },
      });
      const movement = await tx.stockMovement.create({
        data: {
          type: 'ENTRY',
          quantity: intQuantity,
          reason: reason || 'Entrada de material',
          productId: parseInt(productId),
          stockLotId: newLot.id, 
          userId: userId, 
        },
      });
      return { newLot, movement };
    });
    res.status(201).json(result);
  } catch (error) {
    console.error("Erro ao dar entrada no estoque:", error);
    if (error.code === 'P2003') {
       return res.status(404).json({ error: 'O ID do produto fornecido não existe.' });
    }
    res.status(500).json({ error: 'Erro ao processar entrada de estoque.' });
  }
};


// --- ATUALIZAÇÃO ABAIXO ---

// 2. Dar SAÍDA de um lote de produto (IMPLEMENTAÇÃO REAL)
const createStockExit = async (req, res) => {
  const { stockLotId, quantity, reason } = req.body;
  const userId = req.user.userId; // Vem do middleware

  if (!stockLotId || !quantity) {
    return res.status(400).json({ error: 'Lote e Quantidade são obrigatórios.' });
  }

  const intQuantity = parseInt(quantity);
  if (intQuantity <= 0) {
    return res.status(400).json({ error: 'A quantidade deve ser positiva.' });
  }

  try {
    // Usamos uma transação para garantir que a verificação e a
    // atualização do estoque aconteçam de forma segura (atômica)
    const result = await prisma.$transaction(async (tx) => {
      
      // Passo 1: Buscar o lote e VERIFICAR se tem estoque
      const lot = await tx.stockLot.findFirst({
        where: { id: parseInt(stockLotId) },
      });

      if (!lot) {
        throw new Error('Lote não encontrado.');
      }
      if (lot.currentQuantity < intQuantity) {
        throw new Error(`Estoque insuficiente. Lote ${lot.lotNumber} possui apenas ${lot.currentQuantity} unidades.`);
      }

      // Passo 2: Atualizar o estoque (Subtrair)
      const updatedLot = await tx.stockLot.update({
        where: { id: parseInt(stockLotId) },
        data: {
          currentQuantity: {
            decrement: intQuantity, // Decrementa a quantidade
          },
        },
      });

      // Passo 3: Registrar a movimentação de SAÍDA
      const movement = await tx.stockMovement.create({
        data: {
          type: 'EXIT', // Tipo SAÍDA
          quantity: intQuantity,
          reason: reason || 'Uso interno / Procedimento',
          productId: lot.productId, // Pega o ID do produto do lote
          stockLotId: lot.id,
          userId: userId,
        },
      });

      return { updatedLot, movement };
    });

    res.status(201).json(result);

  } catch (error) {
    console.error("Erro ao dar saída no estoque:", error);
    // Trata os erros específicos que criamos (ex: Estoque insuficiente)
    if (error.message.startsWith('Estoque insuficiente') || error.message.startsWith('Lote não encontrado')) {
        return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Erro ao processar saída de estoque.' });
  }
};

// 3. (Manter) Listar o estoque atual (agrupado por produto)
const getStockSummary = async (req, res) => {
    try {
        const productsWithStock = await prisma.product.findMany({
            include: {
                lots: {
                    where: { currentQuantity: { gt: 0 } }, 
                    select: { currentQuantity: true }
                }
            }
        });
        const summary = productsWithStock.map(p => {
            const totalQuantity = p.lots.reduce((sum, lot) => sum + lot.currentQuantity, 0);
            return {
                productId: p.id, name: p.name, sku: p.sku, unitMeasure: p.unitMeasure,
                minStockLevel: p.minStockLevel, totalQuantity: totalQuantity
            }
        });
        res.status(200).json(summary);
    } catch (error) {
        console.error("Erro ao buscar resumo do estoque:", error);
        res.status(500).json({ error: 'Erro ao buscar resumo do estoque.' });
    }
};

// 4. (NOVA FUNÇÃO) Listar lotes disponíveis para um produto
const getLotsForProduct = async (req, res) => {
  const { productId } = req.params;
  try {
    const lots = await prisma.stockLot.findMany({
      where: {
        productId: parseInt(productId),
        currentQuantity: { gt: 0 }, // Apenas lotes que TÊM estoque
      },
      orderBy: {
        expiryDate: 'asc', // FEFO: First Expired, First Out (Primeiro que Vence, Primeiro que Sai)
      },
    });
    res.status(200).json(lots);
  } catch (error) {
    console.error("Erro ao buscar lotes:", error);
    res.status(500).json({ error: 'Erro ao buscar lotes do produto.' });
  }
};


// Exportamos as funções
module.exports = {
  createStockEntry,
  createStockExit,    // Atualizado
  getStockSummary,
  getLotsForProduct,  // Novo
};