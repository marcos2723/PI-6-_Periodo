// frontend/src/components/Financeiro/Orcamentos.jsx

import React, { useState, useEffect, useCallback } from 'react';
import styles from './Orcamentos.module.css';
import { FaPlus } from 'react-icons/fa';
import BudgetModal from './BudgetModal.jsx'; // Modal de CRIAR
import BudgetViewModal from './BudgetViewModal.jsx'; // NOVO: Modal de VER

const Orcamentos = () => {
  const [budgets, setBudgets] = useState([]);
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // --- NOVOS ESTADOS PARA O MODAL DE VISUALIZAÇÃO ---
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Não autenticado');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [budgetsRes, patRes, servRes] = await Promise.all([
        fetch('http://localhost:3001/api/budgets', { headers }),
        fetch('http://localhost:3001/api/patients', { headers }),
        fetch('http://localhost:3001/api/services', { headers })
      ]);
      
      if (!budgetsRes.ok) throw new Error('Falha ao buscar orçamentos');

      setBudgets(await budgetsRes.json());
      setPatients(await patRes.json());
      setServices(await servRes.json());
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- NOVAS FUNÇÕES PARA O MODAL DE VISUALIZAÇÃO ---
  const handleOpenViewModal = (budget) => {
    setSelectedBudget(budget); // Guarda o orçamento que foi clicado
    setIsViewModalOpen(true); // Abre o modal
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedBudget(null);
  };

  return (
    <div className="page-content">
      {isCreateModalOpen && (
        <BudgetModal 
          onClose={() => setIsCreateModalOpen(false)}
          onSaveSuccess={fetchData}
          patients={patients}
          services={services}
        />
      )}

      {/* --- RENDERIZA O NOVO MODAL DE VISUALIZAÇÃO --- */}
      {isViewModalOpen && (
        <BudgetViewModal
          budget={selectedBudget}
          onClose={handleCloseViewModal}
        />
      )}
      
      <div className={styles.header}>
        <h2>Orçamentos</h2>
        <button className={styles.addButton} onClick={() => setIsCreateModalOpen(true)}>
          <FaPlus /> Criar Orçamento
        </button>
      </div>

      {loading && <p>Carregando...</p>}
      {error && <p className={styles.errorText}>{error}</p>}
      
      {!loading && !error && (
        <div className={styles.listContainer}>
          <table className={styles.listTable}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Paciente</th>
                <th>Total (R$)</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {budgets.length > 0 ? (
                budgets.map((o) => (
                  <tr key={o.id}>
                    <td>{new Date(o.date).toLocaleDateString('pt-BR')}</td>
                    <td>{o.patient?.name || 'N/A'}</td>
                    <td>{o.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td><span className={styles[o.status]}>{o.status}</span></td>
                    <td>
                      {/* --- BOTÃO "VER" AGORA É FUNCIONAL --- */}
                      <button 
                        className={styles.actionButton} 
                        onClick={() => handleOpenViewModal(o)}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className={styles.noItems}>Nenhum orçamento encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Orcamentos;