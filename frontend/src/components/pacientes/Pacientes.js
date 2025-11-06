import React, { useState, useEffect, useCallback } from 'react';
import { FaUserPlus, FaSearch, FaEdit, FaTrash } from 'react-icons/fa';
import styles from './Pacientes.module.css'; // Certifique-se que este arquivo CSS existe
import PatientModal from './PatientModal.jsx'; // Importa o modal de Paciente

// Hook customizado para "atrasar" a busca (evita uma chamada API a cada tecla digitada)
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
  const [selectedPatient, setSelectedPatient] = useState(null); // Para saber se está editando ou criando
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // Atraso de 500ms

  // --- FUNÇÃO PARA BUSCAR PACIENTES ---
  // useCallback evita que a função seja recriada em toda renderização
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Pega o token do localStorage
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Usuário não autenticado. Faça login novamente.');

      // Monta a URL para busca
      const url = new URL('http://localhost:3001/api/patients');
      if (debouncedSearchQuery) {
        url.searchParams.append('search', debouncedSearchQuery);
      }

      // 2. Adiciona o token no cabeçalho da requisição
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
  }, [debouncedSearchQuery]); // Só recria a função se o termo de busca (atrasado) mudar

  // Efeito que roda quando o componente carrega ou quando a busca muda
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Funções para controlar o Modal
  const handleOpenModal = (patient = null) => {
    setSelectedPatient(patient); // Se 'patient' for null, é um novo paciente. Se não, é edição.
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPatient(null);
  };

  // --- FUNÇÃO PARA SALVAR (CRIAR/EDITAR) PACIENTE ---
  const handleSavePatient = async (patientData) => {
    const token = localStorage.getItem('token');
    const isEditing = !!patientData.id; // !! transforma em booleano (true se tiver ID, false se não)
    
    const url = isEditing
      ? `http://localhost:3001/api/patients/${patientData.id}`
      : 'http://localhost:3001/api/patients';
    
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Envia o token
        },
        body: JSON.stringify(patientData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao salvar paciente.');
      }

      fetchPatients(); // Atualiza a lista na tela
      handleCloseModal(); // Fecha o modal
    } catch (err) {
      alert(`Erro: ${err.message}`); // Mostra um alerta com o erro
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
          'Authorization': `Bearer ${token}`, // Envia o token
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Falha ao excluir paciente.');
      }

      fetchPatients(); // Atualiza a lista
    } catch (err) {
      alert(`Erro: ${err.message}`); // Mostra o erro (ex: "paciente tem agendamentos")
    }
  };

  return (
    <div className="page-content">
      {/* Cabeçalho da página de pacientes (busca e botão) */}
      <div className={styles.patientHeader}>
        <div className={styles.searchContainer}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className={styles.addButton} onClick={() => handleOpenModal(null)}>
          <FaUserPlus /> Adicionar Paciente
        </button>
      </div>

      {/* Exibe o estado de carregamento */}
      {loading && <p>Carregando pacientes...</p>}
      
      {/* Exibe o estado de erro */}
      {error && <p className={styles.errorText}>{error}</p>}
      
      {/* Exibe a tabela se não estiver carregando e não houver erro */}
      {!loading && !error && (
        <div className={styles.patientListContainer}>
          <table className={styles.patientTable}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {patients.length > 0 ? (
                patients.map((patient) => (
                  <tr key={patient.id}>
                    <td>{patient.name}</td>
                    <td>{patient.email || 'N/A'}</td>
                    <td>{patient.phone || 'N/A'}</td>
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
                  <td colSpan="4" className={styles.noPatients}>Nenhum paciente encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* O Modal só é renderizado se isModalOpen for true */}
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