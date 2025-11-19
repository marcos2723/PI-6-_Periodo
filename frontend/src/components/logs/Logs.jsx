import React, { useState, useEffect } from 'react';
import { FaClipboardList, FaSearch, FaUserCircle } from 'react-icons/fa';
import styles from './Logs.module.css';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3001/api/logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setLogs(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="page-content">
      <div className={styles.header}>
        <h1><FaClipboardList /> Logs do Sistema</h1>
        <p>Histórico de atividades e auditoria</p>
      </div>

      {loading ? <p>Carregando...</p> : (
        <div className={styles.tableContainer}>
          <table className={styles.logTable}>
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td className={styles.dateCol}>
                    {new Date(log.createdAt).toLocaleDateString('pt-BR')} <br/>
                    <small>{new Date(log.createdAt).toLocaleTimeString('pt-BR')}</small>
                  </td>
                  <td>
                    <div className={styles.userCell}>
                        <FaUserCircle className={styles.userIcon} />
                        <div>
                            <strong>{log.user.name}</strong>
                            <span>{log.user.role}</span>
                        </div>
                    </div>
                  </td>
                  <td>
                    <span className={styles.actionBadge}>{log.action}</span>
                  </td>
                  <td className={styles.detailsCol}>{log.details || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Logs;