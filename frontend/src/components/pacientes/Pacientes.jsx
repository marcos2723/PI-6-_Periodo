import React, { useState, useEffect, useCallback } from 'react';
import { FaUserPlus, FaSearch, FaEdit, FaTrash, FaHistory, FaPaperclip, FaCloudUploadAlt, FaFileDownload } from 'react-icons/fa';
import styles from './Pacientes.module.css'; 
import PatientModal from './PatientModal.jsx'; 

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const Pacientes = () => {
  const [patients, setPatients] = useState([]);
  
  // --- NOVO STATE PARA CONVÊNIOS ---
  const [convenios, setConvenios] = useState([]); 
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null); 
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500); 

  // Estados do Histórico
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [patientHistory, setPatientHistory] = useState([]);
  const [historyPatientName, setHistoryPatientName] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [expandedAppointmentId, setExpandedAppointmentId] = useState(null);
  const [uploading, setUploading] = useState(false);

  // --- BUSCAR DADOS INICIAIS (PACIENTES + CONVÊNIOS) ---
  const fetchData = useCallback(async () => {
    setLoading(true); 
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      // 1. Busca Pacientes
      const url = new URL('http://localhost:3001/api/patients');
      if (debouncedSearchQuery) url.searchParams.append('search', debouncedSearchQuery);
      const resPatients = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${token}` } });
      if (!resPatients.ok) throw new Error('Falha ao buscar pacientes.');
      const dataPatients = await resPatients.json();
      setPatients(dataPatients);

      // 2. Busca Convênios (Para passar pro modal)
      const resConvenios = await fetch('http://localhost:3001/api/convenios', { headers: { 'Authorization': `Bearer ${token}` } });
      if (resConvenios.ok) {
        const dataConvenios = await resConvenios.json();
        setConvenios(dataConvenios);
      }

    } catch (err) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  }, [debouncedSearchQuery]); 

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOpenModal = (patient = null) => { setSelectedPatient(patient); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setSelectedPatient(null); };

  // --- HISTÓRICO ---
  const handleOpenHistory = async (patient) => {
    setHistoryPatientName(patient.name);
    setHistoryModalOpen(true);
    setPatientHistory([]); 
    setLoadingHistory(true);
    setExpandedAppointmentId(null); 

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/patients/${patient.id}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPatientHistory(data);
      }
    } catch (error) { console.error(error); } 
    finally { setLoadingHistory(false); }
  };

  // --- UPLOAD ---
  const handleFileUpload = async (event, appointmentId) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) { formData.append('files', files[i]); }

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/appointments/${appointmentId}/upload`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
      });

      if (response.ok) {
        // Recarrega histórico
        const patId = patients.find(p => p.name === historyPatientName)?.id;
        if(patId) {
           const resH = await fetch(`http://localhost:3001/api/patients/${patId}/history`, { headers: { 'Authorization': `Bearer ${token}` } });
           if(resH.ok) setPatientHistory(await resH.json());
        }
        alert('Sucesso!');
      } else alert('Erro upload.');
    } catch (e) { console.error(e); alert('Erro.'); } 
    finally { setUploading(false); }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm("Excluir anexo?")) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/attachments/${attachmentId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
         const patId = patients.find(p => p.name === historyPatientName)?.id;
         if(patId) {
             const resH = await fetch(`http://localhost:3001/api/patients/${patId}/history`, { headers: { 'Authorization': `Bearer ${token}` } });
             if(resH.ok) setPatientHistory(await resH.json());
         }
      } else alert('Erro excluir.');
    } catch (e) { console.error(e); }
  };

  // --- SALVAR (CRIAR/EDITAR) PACIENTE ---
  const handleSavePatient = async (patientData) => {
    const token = localStorage.getItem('token');
    const isEditing = !!patientData.id; 
    const url = isEditing ? `http://localhost:3001/api/patients/${patientData.id}` : 'http://localhost:3001/api/patients';
    const method = isEditing ? 'PUT' : 'POST';
    
    // TRATAMENTO DE DADOS ANTES DE ENVIAR
    const dataToSend = { 
        ...patientData, 
        // Se for 'particular' ou vazio, manda null pro banco
        convenioId: (patientData.convenioId && patientData.convenioId !== 'particular') ? parseInt(patientData.convenioId) : null, 
        // Formata data se existir
        birthDate: patientData.birthDate ? new Date(patientData.birthDate).toISOString() : null,
        convenioValidity: patientData.convenioValidity ? new Date(patientData.convenioValidity).toISOString() : null
    };

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(dataToSend), 
      });
      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Falha ao salvar.');
      }
      fetchData(); // Recarrega lista
      handleCloseModal(); 
    } catch (err) { alert(err.message); }
  };

  const handleDeletePatient = async (patientId) => {
    if (!window.confirm("Deseja excluir?")) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/patients/${patientId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) {
          const d = await response.json();
          throw new Error(d.error || 'Falha ao excluir.');
      }
      fetchData(); 
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="page-content"> 
      <div className={styles.patientHeader}>
        <div className={styles.searchContainer}>
          <FaSearch className={styles.searchIcon} />
          <input type="text" placeholder="Buscar..." className={styles.searchInput} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <button className={styles.addButton} onClick={() => handleOpenModal(null)}> <FaUserPlus /> Adicionar Paciente </button>
      </div>

      {loading && <p>Carregando...</p>}
      
      {!loading && !error && (
        <div className={styles.patientListContainer}>
          <table className={styles.patientTable}>
            <thead>
              <tr><th>Nome</th><th>CPF</th><th>Telefone</th><th>Convênio</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td>{patient.name}</td>
                  <td>{patient.cpf || 'N/A'}</td>
                  <td>{patient.phone || 'N/A'}</td>
                  {/* Exibe o nome do convênio ou 'Particular' */}
                  <td>
                      <span style={{ 
                          backgroundColor: patient.convenio ? '#e3f2fd' : '#f8f9fa', 
                          color: patient.convenio ? '#0d6efd' : '#6c757d',
                          padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500'
                      }}>
                        {patient.convenio ? patient.convenio.name : 'Particular'}
                      </span>
                  </td>
                  <td className={styles.actionsCell}>
                    <button className={styles.actionButton} onClick={() => handleOpenHistory(patient)} title="Histórico"><FaHistory /></button>
                    <button className={styles.actionButton} onClick={() => handleOpenModal(patient)}><FaEdit /></button>
                    <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => handleDeletePatient(patient.id)}><FaTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
          <PatientModal 
            isOpen={isModalOpen} 
            onClose={handleCloseModal} 
            onSave={handleSavePatient} 
            patientData={selectedPatient}
            // PASSANDO A LISTA DE CONVÊNIOS PARA O MODAL
            conveniosList={convenios} 
          />
      )}

      {/* MODAL HISTÓRICO MANTIDO IGUAL... */}
      {historyModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '700px', maxWidth: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h2 style={{margin: 0}}>Histórico: {historyPatientName}</h2>
                    <button onClick={() => setHistoryModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✖</button>
                </div>

                {loadingHistory ? <p>Carregando...</p> : patientHistory.length === 0 ? <p>Nenhuma consulta.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {patientHistory.map((appointment) => (
                            <div key={appointment.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '15px', backgroundColor: '#f9f9f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <div>
                                        <strong>{new Date(appointment.date).toLocaleDateString('pt-BR')}</strong> - {new Date(appointment.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                                        <br/><span style={{color: '#666', fontSize: '0.9em'}}>{appointment.serviceName} com {appointment.doctorName}</span>
                                    </div>
                                    <div style={{textAlign: 'right'}}>
                                        <span style={{ 
                                            padding: '4px 8px', borderRadius: '12px', fontSize: '0.8em', fontWeight: 'bold',
                                            backgroundColor: appointment.status === 'Finalizado' ? '#d4edda' : appointment.status === 'Cancelado' ? '#f8d7da' : '#fff3cd',
                                            color: appointment.status === 'Finalizado' ? '#155724' : appointment.status === 'Cancelado' ? '#721c24' : '#856404'
                                        }}>
                                            {appointment.status === 'Finalizado' ? 'Concluída' : appointment.status}
                                        </span>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => setExpandedAppointmentId(expandedAppointmentId === appointment.id ? null : appointment.id)}
                                    style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem' }}
                                >
                                    <FaPaperclip /> {appointment.attachments && appointment.attachments.length > 0 ? `${appointment.attachments.length} Anexo(s)` : 'Anexar Exames'}
                                </button>

                                {expandedAppointmentId === appointment.id && (
                                    <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px' }}>
                                        {appointment.attachments && appointment.attachments.length > 0 && (
                                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px 0' }}>
                                                {appointment.attachments.map(file => (
                                                    <li key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px', fontSize: '0.9rem', padding: '5px', borderBottom: '1px solid #eee' }}>
                                                        <FaFileDownload color="#555" />
                                                        <a href={`http://localhost:3001/uploads/${file.filePath}`} target="_blank" rel="noopener noreferrer" style={{ color: '#333', textDecoration: 'none', flex: 1 }}>
                                                            {file.fileName}
                                                        </a>
                                                        <button onClick={() => handleDeleteAttachment(file.id)} title="Excluir" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '5px', marginLeft: 'auto' }}>
                                                            <FaTrash size={14} />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                            <label style={{ cursor: 'pointer', backgroundColor: '#e9ecef', padding: '5px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem' }}>
                                                <FaCloudUploadAlt /> Selecionar Arquivos
                                                <input type="file" multiple style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, appointment.id)} />
                                            </label>
                                            {uploading && <span style={{fontSize: '0.8rem', color: '#666'}}>Enviando...</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <button onClick={() => setHistoryModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Fechar</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Pacientes;