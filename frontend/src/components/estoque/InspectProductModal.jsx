// frontend/src/components/estoque/InspectProductModal.jsx
import React, { useState, useEffect } from 'react';
import './InspectProductModal.css'; // Vamos criar este CSS

function InspectProductModal({ product, onClose, onRefresh }) {
  // Estados para os dados
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para os campos editáveis
  const [location, setLocation] = useState(product.location || '');
  const [minStock, setMinStock] = useState(product.minStockLevel || 0);

  // Helper para formatar data
  const formatDate = (dateString) => {
    if (!dateString) return 'S/ Vencimento';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // 1. Buscar os detalhes (lotes e estoque total)
  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`http://localhost:3001/api/products/${product.id}/details`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Falha ao buscar detalhes do produto.');
        const data = await response.json();
        setDetails(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [product.id]);

  // 2. Salvar Edições (PUT)
  const handleSave = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:3001/api/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...product, // Envia os dados antigos
          location: location, // Envia o novo local
          minStockLevel: parseInt(minStock), // Envia o novo estoque mínimo
        }),
      });
      if (!response.ok) throw new Error('Falha ao salvar alterações.');
      alert('Produto atualizado!');
      onRefresh(); // Atualiza a lista na tela de Produtos
      onClose(); // Fecha o modal
    } catch (err) {
      setError(err.message);
    }
  };

  // 3. Excluir Produto (DELETE)
  const handleDelete = async () => {
    // Confirmação MUITO importante
    const confirmDelete = window.confirm(
      `ATENÇÃO: Deseja realmente excluir o produto "${product.name}"?\n\nEsta ação só é permitida se o produto não tiver NENHUM histórico de movimentação.`
    );

    if (!confirmDelete) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:3001/api/products/${product.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json(); // Pega o erro (ex: "possui histórico")
        throw new Error(data.error || 'Falha ao excluir produto.');
      }
      
      alert('Produto excluído com sucesso.');
      onRefresh(); // Atualiza a lista
      onClose(); // Fecha o modal

    } catch (err) {
      setError(err.message);
      alert(`Erro: ${err.message}`); // Mostra o erro da API (ex: "possui histórico")
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>×</button>
        
        <h2>{product.name}</h2>
        <span className="modal-subtitle">SKU: {product.sku}</span>
        
        {error && <p className="error-message">{error}</p>}
        {isLoading && <p>Carregando detalhes do estoque...</p>}

        {details && (
          <div className="modal-body">
            {/* Seção 1: Resumo do Estoque */}
            <div className="stock-summary">
              <h3>Estoque Atual</h3>
              <div className="total-stock">{details.totalQuantity}</div>
              <span>{product.unitMeasure} em estoque</span>
            </div>

            {/* Seção 2: Lotes (Breakdown) */}
            <div className="lot-breakdown">
              <h4>Lotes Disponíveis ({details.lotsBreakdown.length})</h4>
              <ul>
                {details.lotsBreakdown.length > 0 ? (
                  details.lotsBreakdown.map(lot => (
                    <li key={lot.id}>
                      <span>Lote: <strong>{lot.lotNumber}</strong></span>
                      <span>Val: {formatDate(lot.expiryDate)}</span>
                      <span>Qtd: <strong>{lot.currentQuantity}</strong></span>
                    </li>
                  ))
                ) : (
                  <li>Nenhum lote com estoque encontrado.</li>
                )}
              </ul>
            </div>

            {/* Seção 3: Edição */}
            <form className="edit-form" onSubmit={handleSave}>
              <h4>Editar Informações</h4>
              <div className="form-group">
                <label>Estoque Mínimo</label>
                <input 
                  type="number" 
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Localização (Prateleira)</label>
                <input 
                  type="text" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: A-01"
                />
              </div>
              <button type="submit" className="btn-save">Salvar Alterações</button>
            </form>

            {/* Seção 4: Exclusão */}
            <div className="delete-section">
              <h4>Zona de Perigo</h4>
              <p>Excluir o produto permanentemente. (Apenas se não houver histórico de estoque).</p>
              <button className="btn-delete" onClick={handleDelete}>Excluir Produto</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default InspectProductModal;