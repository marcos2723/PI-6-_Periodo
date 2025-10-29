import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './Dashboard.module.css';
import { FaRegCalendarAlt, FaUserClock, FaDollarSign, FaListAlt, FaCheckCircle, FaHourglassHalf, FaArrowRight } from 'react-icons/fa';

// Componente para os cards de indicadores (KPIs)
const KpiCard = ({ icon, title, value, color }) => (
  <div className={styles.kpiCard} style={{ '--card-color': color }}>
    <div className={styles.kpiIcon}>{icon}</div>
    <div className={styles.kpiInfo}>
      <span className={styles.kpiValue}>{value}</span>
      <span className={styles.kpiTitle}>{title}</span>
    </div>
  </div>
);

const Dashboard = () => {
  // Estados para guardar os dados vindos do backend
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // useEffect para buscar os dados quando o componente carregar
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Pega o token do localStorage para futuras rotas protegidas
        const token = localStorage.getItem('token'); 

        const response = await fetch('http://localhost:3001/api/dashboard-data', {
          headers: {
             'Authorization': `Bearer ${token}` // Descomente quando proteger a rota
          },
        });

        if (!response.ok) {
          throw new Error('Não foi possível carregar os dados do dashboard.');
        }

        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="page-content"><h2>Carregando...</h2></div>;
  }

  if (error) {
    return <div className="page-content"><h2>Erro: {error}</h2></div>;
  }

  return (
    <div className="page-content">
      {/* Seção de Indicadores Principais (KPIs) */}
      <div className={styles.kpiGrid}>
        <KpiCard icon={<FaListAlt />} title="Consultas Hoje" value={dashboardData?.kpis.totalAppointments} color="#0d6efd" />
        <KpiCard icon={<FaUserClock />} title="Na Sala de Espera" value={dashboardData?.kpis.waitingCount} color="#ffc107" />
        <KpiCard icon={<FaDollarSign />} title="Faturamento do Dia" value={dashboardData?.kpis.todayRevenue} color="#198754" />
      </div>

      {/* Grid principal com as listas */}
      <div className={styles.mainGrid}>
        {/* Card de Próximos Agendamentos */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3><FaRegCalendarAlt /> Próximos Agendamentos</h3>
            <Link to="/agenda" className={styles.seeAllButton}>Ver Agenda Completa <FaArrowRight /></Link>
          </div>
          
          <div className={styles.cardBody}>
            {dashboardData?.nextAppointments.length > 0 ? (
              <ul className={styles.appointmentList}>
                {dashboardData.nextAppointments.map(app => (
                  <li key={app.id} className={styles.appointmentItem}>
                    <span className={styles.appointmentTime}>{app.time}</span>
                    <span className={styles.appointmentPatient}>{app.patient.name}</span>
                    <span className={`${styles.statusBadge} ${styles['status' + app.status]}`}>
                      {app.status === 'Confirmado' && <FaCheckCircle />}
                      {app.status === 'Aguardando' && <FaHourglassHalf />}
                      {app.status === 'Chegou' && <FaUserClock />}
                      {app.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyMessage}>Nenhum agendamento para hoje.</p>
            )}
          </div>
        </div>

        {/* Card de Atividades Recentes */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Atividades Recentes</h3>
          </div>
          <div className={styles.cardBody}>
             {dashboardData?.recentActivities.length > 0 ? (
              <ul className={styles.activityList}>
                {dashboardData.recentActivities.map(act => (
                  <li key={act.id} className={styles.activityItem}>
                    <p>{act.description}</p>
                    <small>{act.time}</small>
                  </li>
                ))}
              </ul>
            ) : (
               <p className={styles.emptyMessage}>Nenhuma atividade recente.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;