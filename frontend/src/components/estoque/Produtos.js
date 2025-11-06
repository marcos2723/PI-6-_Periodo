// frontend/src/components/estoque/Produtos.js
import React, { useState, useEffect } from 'react';
import './Produtos.css'; 
import InspectProductModal from './InspectProductModal.jsx'; // <-- 1. IMPORTAR O MODAL

function Produtos() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({ /* ... (seu código existente) ... */
    name: '', sku: '', category: '', unitMeasure: 'UN', minStockLevel: 0, location: '',
  });

  // 2. ESTADO PARA O MODAL
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);


  // 1. FUNÇÃO PARA BUSCAR OS PRODUTOS (existente)
  const fetchProducts = async () => {
    setIsLoading(true);
    // (Não resetar o 'error' aqui para o modal não o limpar)
    const token = localStorage.getItem('token');
    if (!token) {
      setError("Sessão expirada. Por favor, faça login novamente.");
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch('http://localhost:3001/api/products', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Falha ao buscar produtos');
      }
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. BUSCAR DADOS QUANDO O COMPONENTE CARREGAR (existente)
  useEffect(() => {
    fetchProducts();
  }, []); 

  // 3. FUNÇÕES DO FORMULÁRIO (existente)
  const handleChange = (e) => {
    // ... (seu código existente)
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // ... (seu código existente, com 'fetchProducts()' no final)
    setError(null);
    const token = localStorage.getItem('token');
    if (!token) { setError("Sessão expirada."); return; }
    try {
      const response = await fetch('http://localhost:3001/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Falha ao criar produto');
      }
      alert('Produto cadastrado com sucesso!');
      setFormData({ name: '', sku: '', category: '', unitMeasure: 'UN', minStockLevel: 0, location: '' });
      fetchProducts(); // Recarrega a lista
    } catch (err) {
      setError(err.message);
    }
  };
  
  // 4. FUNÇÕES PARA CONTROLAR O MODAL (Novo)
  const handleOpenInspectModal = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    // Não precisamos recarregar a lista aqui, 
    // o modal chama 'onRefresh' (fetchProducts) se algo mudar.
  };


  // 5. RENDERIZAÇÃO (Atualizada)
  return (
    <div className="produtos-container">
      <h1>Gestão de Produtos (Catálogo)</h1>
      {/* ... (o <p> e o <form-card> de cadastro não mudam) ... */}
      <p>Cadastre aqui os itens que farão parte do seu estoque (medicamentos, seringas, etc.).</p>
      
      <div className="form-card">
        <h3>Cadastrar Novo Produto</h3>
        <form onSubmit={handleSubmit} className="produtos-form">
          {/* ... (todos os seus inputs do formulário) ... */}
          <div className="form-group">
            <label>Nome do Produto</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Ex: Seringa Descartável 5ml" required />
          </div>
          <div className="form-group">
            <label>Código (SKU)</label>
            <input type="text" name="sku" value={formData.sku} onChange={handleChange} placeholder="Ex: SRG-005" required />
          </div>
          <div className="form-group">
            <label>Categoria</label>
            <input type="text" name="category" value={formData.category} onChange={handleChange} placeholder="Ex: Medicamento, Material de Consumo" />
          </div>
          <div className="form-group">
            <label>Unidade de Medida</label>
            <select name="unitMeasure" value={formData.unitMeasure} onChange={handleChange}>
              <option value="UN">Unidade (UN)</option>
              <option value="CX">Caixa (CX)</option>
              <option value="ML">Mililitro (ML)</option>
              <option value="MG">Miligrama (MG)</option>
              <option value="FR">Frasco (FR)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Estoque Mínimo</label>
            <input type="number" name="minStockLevel" value={formData.minStockLevel} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Localização</label>
            <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="Ex: Prateleira A-01" />
          </div>
          <div className="form-group full-width">
            <button type="submit" className="btn-submit">Salvar Produto</button>
          </div>
        </form>
        {error && <p className="error-message">{error}</p>}
      </div>

      {/* SEÇÃO DA TABELA (ATUALIZADA) */}
      <div className="list-card">
        <h3>Produtos Cadastrados</h3>
        {isLoading ? (
          <p>Carregando produtos...</p>
        ) : (
          <table className="produtos-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>SKU</th>
                <th>Categoria</th>
                <th>Unidade</th>
                <th>Estoque Mín.</th>
                <th>Localização</th>
                <th>Ações</th> {/* <-- NOVA COLUNA */}
              </tr>
            </thead>
            <tbody>
              {products.length > 0 ? (
                products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.sku}</td>
                    <td>{product.category}</td>
                    <td>{product.unitMeasure}</td>
                    <td>{product.minStockLevel}</td>
                    <td>{product.location}</td>
                    <td>
                      {/* <-- NOVO BOTÃO */}
                      <button 
                        className="btn-inspect" 
                        onClick={() => handleOpenInspectModal(product)}
                      >
                        Inspecionar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">Nenhum produto cadastrado.</td> {/* <-- Atualizado para colSpan 7 */}
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 6. RENDERIZA O MODAL (se estiver aberto) */}
      {isModalOpen && (
        <InspectProductModal 
          product={selectedProduct} 
          onClose={handleCloseModal}
          onRefresh={fetchProducts} // Passa a função de recarregar a lista
        />
      )}
    </div>
  );
}

export default Produtos;