import React, { useState, useEffect } from 'react';
import { FaUserMd, FaSearch, FaEnvelope, FaPhone, FaHistory, FaListUl } from 'react-icons/fa';
import styles from './Medicos.module.css'; 

const Medicos = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // --- ESTADOS DO MODAL DE HISTÓRICO ---
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [doctorHistory, setDoctorHistory] = useState([]);
  const [selectedDoctorName, setSelectedDoctorName] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Busca a lista de médicos
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3001/api/doctors-stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Falha ao carregar médicos');
        
        const data = await response.json();
        setDoctors(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  // --- FUNÇÃO PARA ABRIR O HISTÓRICO ---
  const handleOpenHistory = async (doctor) => {
    setSelectedDoctorName(doctor.name);
    setHistoryModalOpen(true);
    setDoctorHistory([]); 
    setLoadingHistory(true);

    try {
      const token = localStorage.getItem('token');
      // Chama a nova rota que criamos
      const response = await fetch(`http://localhost:3001/api/doctors/${doctor.id}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDoctorHistory(data);
      }
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Filtro de busca
  const filteredDoctors = doctors.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.crm && doc.crm.includes(searchTerm))
  );

  return (
    <div className="page-content">
      <div className={styles.header}>
        <h1><FaUserMd /> Corpo Clínico</h1>
        <div className={styles.searchContainer}>
            <FaSearch className={styles.searchIcon} />
            <input 
                type="text" 
                placeholder="Buscar médico ou CRM..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {loading && <p>Carregando equipe...</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!loading && !error && (
        <div className={styles.gridContainer}>
          {filteredDoctors.length > 0 ? (
            filteredDoctors.map((doc) => (
              <div key={doc.id} className={styles.doctorCard}>
                <div className={styles.cardHeader}>
                    <div className={styles.avatar}>
                        <FaUserMd />
                    </div>
                    <div className={styles.info}>
                        <h3>{doc.name}</h3>
                        <span className={styles.crm}>CRM: {doc.crm || 'N/A'}</span>
                    </div>
                </div>
                
                <div className={styles.cardBody}>
                    <p><FaEnvelope /> {doc.email}</p>
                    <p><FaPhone /> {doc.phone || 'Sem telefone'}</p>
                </div>

                <div className={styles.cardFooter}>
                    {/* Estatística do Mês */}
                    <div className={styles.stat}>
                        <span>Mês Atual: <strong>{doc.consultationsMonth}</strong> consultas</span>
                    </div>
                    
                    {/* Botão de Histórico */}
                    <button 
                        className={styles.historyButton}
                        onClick={() => handleOpenHistory(doc)}
                    >
                        <FaHistory /> Ver últimas 7
                    </button>
                </div>
              </div>
            ))
          ) : (
            <p>Nenhum médico encontrado.</p>
          )}
        </div>
      )}

      {/* --- MODAL DE HISTÓRICO (Visual idêntico ao de Pacientes) --- */}
      {historyModalOpen && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '600px', maxWidth: '90%',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{margin: 0, fontSize: '1.25rem', color: '#333'}}>
                        <FaListUl style={{marginRight: '10px'}}/>
                        Últimas consultas: {selectedDoctorName}
                    </h2>
                    <button onClick={() => setHistoryModalOpen(false)} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '1.5rem' }}>✖</button>
                </div>

                {loadingHistory ? (
                    <p style={{textAlign: 'center', color: '#666'}}>Carregando histórico...</p>
                ) : doctorHistory.length === 0 ? (
                    <p style={{textAlign: 'center', color: '#666', padding: '20px'}}>Nenhuma consulta realizada recentemente.</p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left', color: '#555' }}>
                                <th style={{ padding: '10px' }}>Data</th>
                                <th style={{ padding: '10px' }}>Paciente</th>
                                <th style={{ padding: '10px' }}>Serviço</th>
                                <th style={{ padding: '10px' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {doctorHistory.map((apt) => (
                                <tr key={apt.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '10px' }}>
                                        {new Date(apt.date).toLocaleDateString('pt-BR')} <br/>
                                        <small style={{color: '#888'}}>{new Date(apt.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>
                                    </td>
                                    <td style={{ padding: '10px', fontWeight: '500' }}>{apt.patientName}</td>
                                    <td style={{ padding: '10px' }}>{apt.serviceName}</td>
                                    <td style={{ padding: '10px' }}>
                                        <span style={{ 
                                            padding: '4px 8px', borderRadius: '12px', fontSize: '0.8em', fontWeight: 'bold',
                                            backgroundColor: apt.status === 'Finalizado' ? '#d4edda' : 
                                                             apt.status === 'Cancelado' ? '#f8d7da' : '#fff3cd',
                                            color: apt.status === 'Finalizado' ? '#155724' : 
                                                   apt.status === 'Cancelado' ? '#721c24' : '#856404'
                                        }}>
                                            {apt.status === 'Finalizado' ? 'Concluída' : apt.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                
                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <button onClick={() => setHistoryModalOpen(false)} style={{ 
                        padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' 
                    }}>
                        Fechar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Medicos;