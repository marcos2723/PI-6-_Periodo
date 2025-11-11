import React, { useState, useEffect } from 'react';
import styles from './VisaoGeral.module.css';
import { FaDollarSign, FaArrowUp, FaArrowDown, FaExclamationTriangle } from 'react-icons/fa';

// Componente para os cards
const KpiCard = ({ title, value, icon, color }) => (
  <div className={styles.kpiCard} style={{ '--card-color': color }}>
    <div className={styles.kpiIcon}>{icon}</div>
    <div className={styles.kpiInfo}>
      <span className={styles.kpiTitle}>{title}</span>
      <span className={styles.kpiValue}>{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
    </div>
  </div>
);

const VisaoGeral = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Não autenticado');
        
        const response = await fetch('http://localhost:3001/api/financial-summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Falha ao buscar resumo financeiro');
        
        const data = await response.json();
        setSummary(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) return <div className="page-content"><p>Carregando...</p></div>;
  if (error) return <div className="page-content"><p className={styles.errorText}>{error}</p></div>;
  if (!summary) return null;

  return (
    <div className="page-content">
      <div className={styles.kpiGrid}>
        <KpiCard title="Receita (Pago)" value={summary.totalRevenue} icon={<FaArrowUp />} color="#198754" />
        <KpiCard title="Despesas (Pago)" value={summary.totalExpenses} icon={<FaArrowDown />} color="#dc3545" />
        <KpiCard title="Saldo Líquido" value={summary.netIncome} icon={<FaDollarSign />} color="#0d6efd" />
        <KpiCard title="A Receber (Pendente)" value={summary.pendingReceivables} icon={<FaExclamationTriangle />} color="#ffc107" />
      </div>
      
      <div className={styles.chartContainer}>
        <h3>Demonstrativo</h3>
        <p>Em breve: Gráficos de receita por período, médico e convênio.</p>
        {/* Adicionar <Recharts> aqui no futuro */}
      </div>
    </div>
  );
};

export default VisaoGeral;