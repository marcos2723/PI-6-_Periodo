import React, { useState, useEffect, useCallback } from 'react';
import styles from './Lancamentos.module.css';
import { FaPlus, FaFilter } from 'react-icons/fa';

// O Modal/Formulário será parte deste componente para simplificar
const LancamentoForm = ({ onSave, patients, services, onClose }) => {
  const [formData, setFormData] = useState({
    description: '', amount: '', type: 'RECEITA', paymentMethod: 'Pix', 
    status: 'Pago', patientId: '', serviceId: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Falha ao salvar lançamento');
      onSave(); // Atualiza a lista
      onClose(); // Fecha o formulário
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <form className={styles.modalContent} onSubmit={handleSubmit}>
        <h2>Novo Lançamento</h2>
        
        <div className={styles.formGroup}>
          <label>Tipo *</label>
          <select name="type" value={formData.type} onChange={handleChange}>
            <option value="RECEITA">Receita</option>
            <option value="DESPESA">Despesa</option>
          </select>
        </div>
        
        <div className={styles.formGroup}>
          <label>Descrição *</label>
          <input type="text" name="description" value={formData.description} onChange={handleChange} required />
        </div>
        
        <div className={styles.formGroup}>
          <label>Valor (R$) *</label>
          <input type="number" step="0.01" name="amount" value={formData.amount} onChange={handleChange} required 
                 placeholder={formData.type === 'DESPESA' ? 'Ex: 150.00 (sempre positivo)' : 'Ex: 500.00'} />
        </div>
        
        <div className={styles.formGroup}>
          <label>Paciente (Opcional)</label>
          <select name="patientId" value={formData.patientId} onChange={handleChange}>
            <option value="">Nenhum</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        
        <div className={styles.formGroup}>
          <label>Serviço (Opcional)</label>
          <select name="serviceId" value={formData.serviceId} onChange={handleChange}>
            <option value="">Nenhum</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        
        <div className={styles.formGroup}>
          <label>Método Pgto. *</label>
          <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
            <option value="Pix">Pix</option>
            <option value="Cartão de Crédito">Cartão de Crédito</option>
            <option value="Cartão de Débito">Cartão de Débito</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Convênio">Convênio</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
        
        <div className={styles.formGroup}>
          <label>Status *</label>
          <select name="status" value={formData.status} onChange={handleChange}>
            <option value="Pago">Pago</option>
            <option value="Pendente">Pendente</option>
          </select>
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>Cancelar</button>
          <button type="submit" className={styles.saveButton}>Salvar</button>
        </div>
      </form>
    </div>
  );
};


const Lancamentos = () => {
  const [transactions, setTransactions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Não autenticado');
      const headers = { 'Authorization': `Bearer ${token}` };

      const url = new URL('http://localhost:3001/api/transactions');
      if (filterType) url.searchParams.append('type', filterType);
      if (filterStatus) url.searchParams.append('status', filterStatus);

      const [transRes, patRes, servRes] = await Promise.all([
        fetch(url.toString(), { headers }),
        fetch('http://localhost:3001/api/patients', { headers }),
        fetch('http://localhost:3001/api/services', { headers })
      ]);
      
      if (!transRes.ok) throw new Error('Falha ao buscar transações');
      
      setTransactions(await transRes.json());
      setPatients(await patRes.json());
      setServices(await servRes.json());
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="page-content">
      {isModalOpen && (
        <LancamentoForm 
          onClose={() => setIsModalOpen(false)} 
          onSave={fetchData}
          patients={patients}
          services={services}
        />
      )}
      
      <div className={styles.header}>
        <h2>Lançamentos</h2>
        <button className={styles.addButton} onClick={() => setIsModalOpen(true)}>
          <FaPlus /> Adicionar Lançamento
        </button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.formGroup}>
          <label><FaFilter /> Tipo</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">Todos</option>
            <option value="RECEITA">Receita</option>
            <option value="DESPESA">Despesa</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="Pago">Pago</option>
            <option value="Pendente">Pendente</option>
          </select>
        </div>
      </div>

      {loading && <p>Carregando...</p>}
      {error && <p className={styles.errorText}>{error}</p>}

      {!loading && !error && (
        <div className={styles.listContainer}>
          <table className={styles.listTable}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Paciente</th>
                <th>Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length > 0 ? (
                transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                    <td>{t.description}</td>
                    <td><span className={styles[t.type]}>{t.type}</span></td>
                    <td><span className={styles[t.status]}>{t.status}</span></td>
                    <td>{t.patient?.name || 'N/A'}</td>
                    <td className={t.type === 'RECEITA' ? styles.RECEITA : styles.DESPESA}>
                      {t.type === 'DESPESA' ? '-' : ''}
                      {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className={styles.noItems}>Nenhum lançamento encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Lancamentos;