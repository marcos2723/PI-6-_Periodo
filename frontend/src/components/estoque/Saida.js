// frontend/src/components/estoque/Saida.js
import React, { useState, useEffect } from 'react';
import './Saida.css'; // Vamos criar este CSS

function SaidaEstoque() {
  // Estados
  const [products, setProducts] = useState([]); // Lista de todos os produtos
  const [availableLots, setAvailableLots] = useState([]); // Lista de lotes do produto selecionado
  const [formData, setFormData] = useState({
    productId: '',
    stockLotId: '',
    quantity: 1,
    reason: '',
  });
  
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingLots, setIsLoadingLots] = useState(false);
  const [error, setError] = useState(null);

  // 1. (AO CARREGAR) Buscar a lista de PRODUTOS para o primeiro dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      const token = localStorage.getItem('token');
      if (!token) { setError("Sessão expirada."); setIsLoadingProducts(false); return; }

      try {
        const response = await fetch('http://localhost:3001/api/products', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Falha ao buscar produtos');
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  // 2. (QUANDO MUDAR O PRODUTO) Buscar os LOTES daquele produto
  useEffect(() => {
    // Se nenhum produto está selecionado, limpa a lista de lotes
    if (!formData.productId) {
      setAvailableLots([]);
      setFormData(prev => ({ ...prev, stockLotId: '' })); // Reseta o lote selecionado
      return;
    }

    const fetchLots = async () => {
      setIsLoadingLots(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) { setError("Sessão expirada."); setIsLoadingLots(false); return; }

      try {
        // Chama a nova API que criamos
        const response = await fetch(`http://localhost:3001/api/stock/lots/${formData.productId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Falha ao buscar lotes do produto');
        const data = await response.json();
        setAvailableLots(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoadingLots(false);
      }
    };

    fetchLots();
  }, [formData.productId]); // Este Hook roda toda vez que 'formData.productId' mudar

  // 3. FUNÇÕES DO FORMULÁRIO
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.stockLotId || formData.quantity <= 0) {
      setError('Selecione um Lote e informe uma Quantidade (maior que 0).');
      return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) { setError("Sessão expirada."); return; }

    try {
      // Chama a API de Saída
      const response = await fetch('http://localhost:3001/api/stock/exit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          stockLotId: formData.stockLotId,
          quantity: formData.quantity,
          reason: formData.reason,
        }),
      });

      if (!response.ok) {
        const data = await response.json(); // Pega a mensagem de erro (ex: "Estoque insuficiente")
        throw new Error(data.error || 'Falha ao registrar saída');
      }
      
      alert('Saída de estoque registrada com sucesso!');

      // Limpa o formulário e recarrega os lotes (pois a quantidade mudou)
      setFormData({
        productId: formData.productId, // Mantém o produto selecionado
        stockLotId: '',
        quantity: 1,
        reason: '',
      });
      // Dispara o useEffect de lotes manualmente para atualizar a lista
      fetchLotsTrigger(); 
    } catch (err) {
      setError(err.message);
    }
  };

  // Função auxiliar para recarregar lotes após submit
  const fetchLotsTrigger = () => {
    const event = { target: { name: 'productId', value: formData.productId } };
    // Um pequeno "hack" para não duplicar a lógica de fetchLots
    if (formData.productId) {
      const fetchLots = async () => {
        setIsLoadingLots(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3001/api/stock/lots/${formData.productId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        setAvailableLots(data);
        setIsLoadingLots(false);
      };
      fetchLots();
    }
  };
  
  // Helper para formatar data (opcional)
  const formatDate = (dateString) => {
    if (!dateString) return 'S/ Vencimento';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };


  // 4. RENDERIZAÇÃO
  return (
    <div className="saida-container">
      <h1>Saída de Estoque (Uso Interno)</h1>
      <p>Registre aqui a retirada de materiais para uso em procedimentos ou pela equipe.</p>
      
      {isLoadingProducts && <p>Carregando lista de produtos...</p>}
      
      {!isLoadingProducts && (
        <div className="form-card-saida">
          <form onSubmit={handleSubmit} className="saida-form">
            
            {/* Dropdown 1: Produtos */}
            <div className="form-group full-width">
              <label>1. Selecione o Produto</label>
              <select name="productId" value={formData.productId} onChange={handleChange} required>
                <option value="">Selecione um produto...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} (SKU: {product.sku})
                  </option>
                ))}
              </select>
            </div>

            {/* Dropdown 2: Lotes (Dependente) */}
            <div className="form-group full-width">
              <label>2. Selecione o Lote (ordem por vencimento)</label>
              <select name="stockLotId" value={formData.stockLotId} onChange={handleChange} required disabled={isLoadingLots || availableLots.length === 0}>
                <option value="">{isLoadingLots ? "Buscando lotes..." : "Selecione um lote..."}</option>
                {availableLots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    Lote: {lot.lotNumber} (Vence: {formatDate(lot.expiryDate)}) - Restam: {lot.currentQuantity}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>3. Quantidade (Saída)</label>
              <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" required />
            </div>

            <div className="form-group">
              <label>Motivo/Observação (Opcional)</label>
              <input type="text" name="reason" value={formData.reason} onChange={handleChange} placeholder="Ex: Uso Dr. Ricardo" />
            </div>

            <div className="form-group full-width btn-container">
              <button type="submit" className="btn-submit-saida" disabled={!formData.stockLotId}>Registrar Saída</button>
            </div>
          </form>
          {error && <p className="error-message">{error}</p>}
        </div>
      )}
    </div>
  );
}

export default SaidaEstoque;