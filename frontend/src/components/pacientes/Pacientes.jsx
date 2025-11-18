import React, { useState, useEffect, useCallback } from 'react';
import { FaUserPlus, FaSearch, FaEdit, FaTrash } from 'react-icons/fa';
import styles from './Pacientes.module.css'; 
import PatientModal from './PatientModal.jsx'; 

// Hook customizado para "atrasar" a busca
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
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

  // --- FUNÇÃO PARA BUSCAR PACIENTES ---
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Usuário não autenticado. Faça login novamente.');

      const url = new URL('http://localhost:3001/api/patients');
      if (debouncedSearchQuery) {
        url.searchParams.append('search', debouncedSearchQuery);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao buscar pacientes.');
      }
      const data = await response.json();
      setPatients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery]); 

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Funções para controlar o Modal
  const handleOpenModal = (patient = null) => {
    setSelectedPatient(patient); 
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPatient(null);
  };

  // --- FUNÇÃO PARA SALVAR (CRIAR/EDITAR) PACIENTE ---
  const handleSavePatient = async (patientData) => {
    const token = localStorage.getItem('token');
    const isEditing = !!patientData.id; 
    
    const url = isEditing
      ? `http://localhost:3001/api/patients/${patientData.id}`
      : 'http://localhost:3001/api/patients';
    
    const method = isEditing ? 'PUT' : 'POST';

    const dataToSend = {
      ...patientData,
      convenioId: patientData.convenioId === 'particular' ? null : parseInt(patientData.convenioId),
      birthDate: patientData.birthDate ? new Date(patientData.birthDate).toISOString() : null,
    };

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, 
        },
        body: JSON.stringify(dataToSend), 
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao salvar paciente.');
      }

      fetchPatients(); 
      handleCloseModal(); 
    } catch (err) {
      alert(`Erro: ${err.message}`); 
    }
  };

  // --- FUNÇÃO PARA DELETAR PACIENTE ---
  const handleDeletePatient = async (patientId) => {
    if (!window.confirm("Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita e pode falhar se o paciente tiver agendamentos.")) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/patients/${patientId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`, 
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Falha ao excluir paciente.');
      }

      fetchPatients(); // Atualiza a lista
    } catch (err) {
      alert(`Erro: ${err.message}`); 
      // A LINHA COM A DATA FOI REMOVIDA DAQUI
    }
  };

  return (
    <div className="page-content"> 
      <div className={styles.patientHeader}>
        <div className={styles.searchContainer}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou email..." 
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className={styles.addButton} onClick={() => handleOpenModal(null)}>
          <FaUserPlus /> Adicionar Paciente
        </button>
      </div>

      {loading && <p>Carregando pacientes...</p>}
      {error && <p className={styles.errorText}>{error}</p>}
      
      {!loading && !error && (
        <div className={styles.patientListContainer}>
          <table className={styles.patientTable}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Telefone</th>
                <th>Convênio</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {patients.length > 0 ? (
                patients.map((patient) => (
                  <tr key={patient.id}>
                    <td>{patient.name}</td>
                    <td>{patient.cpf || 'N/A'}</td>
                    <td>{patient.phone || 'N/A'}</td>
                    <td>{patient.convenio ? patient.convenio.name : 'Particular'}</td>
                    <td className={styles.actionsCell}>
                      <button className={styles.actionButton} onClick={() => handleOpenModal(patient)}>
                        <FaEdit />
                      </button>
                      <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => handleDeletePatient(patient.id)}>
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className={styles.noPatients}>Nenhum paciente encontrado.</td>
                </tr>
              )}
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
        />
      )}
    </div>
  );
};

export default Pacientes;