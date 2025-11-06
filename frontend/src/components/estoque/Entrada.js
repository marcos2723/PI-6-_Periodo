// frontend/src/components/estoque/Entrada.js
import React, { useState, useEffect } from 'react';
import './Entrada.css'; // Vamos criar este CSS

function EntradaEstoque() {
  // Estado para o dropdown de produtos
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado para o formulário de entrada
  const [formData, setFormData] = useState({
    productId: '',
    lotNumber: '',
    expiryDate: '',
    quantity: 0,
    reason: '',
  });

  // 1. BUSCAR OS PRODUTOS PARA O DROPDOWN
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Sessão expirada. Faça login novamente.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:3001/api/products', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Falha ao buscar produtos');
        
        const data = await response.json();
        setProducts(data);

      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []); // O [] vazio garante que isso rode apenas uma vez

  // 2. FUNÇÕES DO FORMULÁRIO
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

    // Validação simples
    if (!formData.productId || !formData.lotNumber || formData.quantity <= 0) {
      setError('Produto, Número do Lote e Quantidade (maior que 0) são obrigatórios.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError("Sessão expirada. Faça login novamente.");
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/stock/entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Falha ao registrar entrada');
      }
      
      alert('Entrada de estoque registrada com sucesso!');

      // Limpa o formulário
      setFormData({
        productId: '',
        lotNumber: '',
        expiryDate: '',
        quantity: 0,
        reason: '',
      });

    } catch (err) {
      setError(err.message);
    }
  };

  // 3. RENDERIZAÇÃO
  return (
    <div className="entrada-container">
      <h1>Entrada de Estoque</h1>
      <p>Registre aqui a entrada de novos lotes de produtos (compras de fornecedores).</p>

      {isLoading && <p>Carregando lista de produtos...</p>}
      
      {/* SEÇÃO DO FORMULÁRIO */}
      {!isLoading && (
        <div className="form-card-entrada">
          <form onSubmit={handleSubmit} className="entrada-form">
            
            <div className="form-group full-width">
              <label>Produto</label>
              <select 
                name="productId" 
                value={formData.productId} 
                onChange={handleChange} 
                required
              >
                <option value="">Selecione um produto...</option>
                {products.length > 0 ? (
                  products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (SKU: {product.sku})
                    </option>
                  ))
                ) : (
                  <option disabled>Nenhum produto cadastrado</option>
                )}
              </select>
            </div>

            <div className="form-group">
              <label>Número do Lote</label>
              <input type="text" name="lotNumber" value={formData.lotNumber} onChange={handleChange} placeholder="Lote do fabricante" required />
            </div>
            
            <div className="form-group">
              <label>Data de Validade</label>
              <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Quantidade (Entrada)</label>
              <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" required />
            </div>

            <div className="form-group full-width">
              <label>Motivo/Observação (Opcional)</label>
              <input type="text" name="reason" value={formData.reason} onChange={handleChange} placeholder="Ex: Compra NF-123" />
            </div>

            <div className="form-group full-width btn-container">
              <button type="submit" className="btn-submit-entrada">Registrar Entrada</button>
            </div>
          </form>
          {error && <p className="error-message">{error}</p>}
        </div>
      )}
    </div>
  );
}

export default EntradaEstoque;