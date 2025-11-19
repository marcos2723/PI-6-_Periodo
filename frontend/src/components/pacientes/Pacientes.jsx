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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null); 
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500); 

  // --- ESTADOS DO HISTÓRICO ---
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [patientHistory, setPatientHistory] = useState([]);
  const [historyPatientName, setHistoryPatientName] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Controle de expansão e upload
  const [expandedAppointmentId, setExpandedAppointmentId] = useState(null);
  const [uploading, setUploading] = useState(false);

  // --- BUSCAR PACIENTES ---
  const fetchPatients = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem('token');
      const url = new URL('http://localhost:3001/api/patients');
      if (debouncedSearchQuery) url.searchParams.append('search', debouncedSearchQuery);

      const response = await fetch(url.toString(), { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Falha ao buscar pacientes.');
      const data = await response.json();
      setPatients(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, [debouncedSearchQuery]); 

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const handleOpenModal = (patient = null) => { setSelectedPatient(patient); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setSelectedPatient(null); };

  // --- ABRIR HISTÓRICO ---
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

  // --- UPLOAD DE EXAMES ---
  const handleFileUpload = async (event, appointmentId) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/appointments/${appointmentId}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        // Atualiza lista
        const resHistory = await fetch(`http://localhost:3001/api/patients/${patients.find(p => p.name === historyPatientName).id}/history`, {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataHistory = await resHistory.json();
        setPatientHistory(dataHistory);
        alert('Exames anexados com sucesso!');
      } else {
        alert('Erro ao enviar arquivo.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao enviar.');
    } finally {
      setUploading(false);
    }
  };

  // --- DELETAR ANEXO (NOVA FUNÇÃO ADICIONADA) ---
  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm("Tem certeza que deseja excluir este anexo?")) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Atualiza a lista na tela
        const resHistory = await fetch(`http://localhost:3001/api/patients/${patients.find(p => p.name === historyPatientName).id}/history`, {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        const dataHistory = await resHistory.json();
        setPatientHistory(dataHistory);
      } else {
        alert('Erro ao excluir anexo.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir.');
    }
  };

  // --- CRUD PACIENTES ---
  const handleSavePatient = async (patientData) => {
    const token = localStorage.getItem('token');
    const isEditing = !!patientData.id; 
    const url = isEditing ? `http://localhost:3001/api/patients/${patientData.id}` : 'http://localhost:3001/api/patients';
    const method = isEditing ? 'PUT' : 'POST';
    const dataToSend = { ...patientData, convenioId: patientData.convenioId === 'particular' ? null : parseInt(patientData.convenioId), birthDate: patientData.birthDate ? new Date(patientData.birthDate).toISOString() : null };

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(dataToSend), 
      });
      if (!response.ok) throw new Error('Falha ao salvar.');
      fetchPatients(); handleCloseModal(); 
    } catch (err) { alert(err.message); }
  };

  const handleDeletePatient = async (patientId) => {
    if (!window.confirm("Deseja excluir?")) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/patients/${patientId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Falha ao excluir.');
      fetchPatients(); 
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
                  <td>{patient.convenio ? patient.convenio.name : 'Particular'}</td>
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

      {isModalOpen && <PatientModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSavePatient} patientData={selectedPatient} />}

      {/* --- MODAL DE HISTÓRICO --- */}
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
                                {/* Cabeçalho do Card */}
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

                                {/* Botão para expandir área de exames */}
                                <button 
                                    onClick={() => setExpandedAppointmentId(expandedAppointmentId === appointment.id ? null : appointment.id)}
                                    style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem' }}
                                >
                                    <FaPaperclip /> {appointment.attachments && appointment.attachments.length > 0 ? `${appointment.attachments.length} Anexo(s)` : 'Anexar Exames'}
                                </button>

                                {/* Área Expansível de Arquivos */}
                                {expandedAppointmentId === appointment.id && (
                                    <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px' }}>
                                        
                                        {/* Lista de Arquivos Já Enviados (ATUALIZADA COM BOTÃO EXCLUIR) */}
                                        {appointment.attachments && appointment.attachments.length > 0 && (
                                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px 0' }}>
                                                {appointment.attachments.map(file => (
                                                    <li key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px', fontSize: '0.9rem', padding: '5px', borderBottom: '1px solid #eee' }}>
                                                        <FaFileDownload color="#555" />
                                                        <a 
                                                            href={`http://localhost:3001/uploads/${file.filePath}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            style={{ color: '#333', textDecoration: 'none', flex: 1 }}
                                                        >
                                                            {file.fileName}
                                                        </a>
                                                        
                                                        {/* BOTÃO DE EXCLUIR AQUI */}
                                                        <button 
                                                            onClick={() => handleDeleteAttachment(file.id)}
                                                            title="Excluir anexo"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '5px', marginLeft: 'auto' }}
                                                        >
                                                            <FaTrash size={14} />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        {/* Input para Upload */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                            <label style={{ cursor: 'pointer', backgroundColor: '#e9ecef', padding: '5px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem' }}>
                                                <FaCloudUploadAlt /> Selecionar Arquivos
                                                <input 
                                                    type="file" 
                                                    multiple 
                                                    style={{ display: 'none' }} 
                                                    onChange={(e) => handleFileUpload(e, appointment.id)}
                                                />
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