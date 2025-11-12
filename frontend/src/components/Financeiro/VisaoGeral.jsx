// frontend/src/components/Financeiro/VisaoGeral.jsx

import React, { useState, useEffect } from 'react';
import styles from './VisaoGeral.module.css';
import { FaDollarSign, FaArrowUp, FaArrowDown, FaExclamationTriangle } from 'react-icons/fa';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// Componente para os cards (sem alteração)
const KpiCard = ({ title, value, icon, color }) => (
  <div className={styles.kpiCard} style={{ '--card-color': color }}>
    <div className={styles.kpiIcon}>{icon}</div>
    <div className={styles.kpiInfo}>
      <span className={styles.kpiTitle}>{title}</span>
      <span className={styles.kpiValue}>
        {(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
      
    </div>
  </div>
);

// Formata o valor no eixo Y (ex: R$ 1.050,00)
const formatCurrency = (tickItem) => {
  return tickItem.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const VisaoGeral = () => {
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Não autenticado');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const [summaryRes, chartRes] = await Promise.all([
          fetch('http://localhost:3001/api/financial-summary', { headers }),
          fetch('http://localhost:3001/api/financial-chart-data', { headers })
        ]);
        
        if (!summaryRes.ok) throw new Error('Falha ao buscar resumo financeiro');
        if (!chartRes.ok) throw new Error('Falha ao buscar dados do gráfico');

        setSummary(await summaryRes.json());
        setChartData(await chartRes.json());
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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
      
      {/* Container do Gráfico (ATUALIZADO) */}
      <div className={styles.chartContainer}>
        <h3>Receita vs. Despesa (Últimos 30 dias)</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="name" stroke="#6c757d" />
              <YAxis stroke="#6c757d" tickFormatter={formatCurrency} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              {/* --- MUDANÇA AQUI: DUAS LINHAS --- */}
              <Line type="monotone" dataKey="Receita" stroke="#198754" strokeWidth={3} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="Despesa" stroke="#dc3545" strokeWidth={3} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p>Não há dados de receita ou despesa suficientes para exibir o gráfico.</p>
        )}
      </div>
    </div>
  );
};

export default VisaoGeral;