import React, { useState, useEffect, useCallback } from 'react';
import styles from './ConfiguracoesFinanceiras.module.css';
import { FaSave } from 'react-icons/fa';

const ConfiguracoesFinanceiras = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Não autenticado');
      
      const response = await fetch('http://localhost:3001/api/services', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Falha ao buscar serviços');
      setServices(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleSaveService = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newName, price: newPrice })
      });
      if (!response.ok) throw new Error('Falha ao salvar serviço');
      
      setNewName('');
      setNewPrice('');
      fetchServices(); // Atualiza a lista
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="page-content">
      <h2>Configurações Financeiras</h2>
      
      <div className={styles.configSection}>
        <h3>Catálogo de Serviços e Procedimentos</h3>
        <p>Cadastre os serviços que a clínica oferece e seus preços padrão.</p>
        
        <form className={styles.serviceForm} onSubmit={handleSaveService}>
          <input 
            type="text" 
            placeholder="Nome do Serviço (ex: Consulta)" 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <input 
            type="number" 
            step="0.01"
            placeholder="Preço (ex: 350.00)" 
            value={newPrice} 
            onChange={(e) => setNewPrice(e.target.value)}
            required
          />
          <button type="submit" className={styles.saveButton}><FaSave /> Salvar Novo Serviço</button>
        </form>

        <div className={styles.listContainer}>
          <table className={styles.listTable}>
            <thead>
              <tr>
                <th>Nome do Serviço</th>
                <th>Preço Padrão (R$)</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="2">Carregando...</td></tr>}
              {error && <tr><td colSpan="2">{error}</td></tr>}
              {!loading && services.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className={styles.configSection}>
        <h3>Gestão de Convênios</h3>
        <p>Em breve: Cadastro e configuração de convênios.</p>
      </div>
    </div>
  );
};

export default ConfiguracoesFinanceiras;