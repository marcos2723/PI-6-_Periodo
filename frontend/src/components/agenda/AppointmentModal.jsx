// frontend/src/components/AppointmentModal.jsx

import React, { useState, useEffect, useCallback } from 'react';
import styles from './AppointmentModal.module.css';

// Função para formatar a data para o input datetime-local (ex: "2025-11-10T14:30")
const formatDateTimeForInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // Ajusta para o fuso horário local
  return d.toISOString().slice(0, 16);
};

const AppointmentModal = ({ eventInfo, onClose, onSaveSuccess }) => {
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    date: formatDateTimeForInput(eventInfo?.start), // Usa a data clicada
    status: 'Aguardando',
  });
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState('');

  // Busca a lista de pacientes e médicos quando o modal abre
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Usuário não autenticado.');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const [patientsRes, doctorsRes] = await Promise.all([
          fetch('http://localhost:3001/api/patients', { headers }),
          fetch('http://localhost:3001/api/doctors', { headers }),
        ]);

        if (!patientsRes.ok || !doctorsRes.ok) {
          throw new Error('Falha ao carregar dados do formulário.');
        }

        const patientsData = await patientsRes.json();
        const doctorsData = await doctorsRes.json();
        
        setPatients(patientsData);
        setDoctors(doctorsData);

        // Se estiver editando, preenche o formulário
        if (eventInfo && !eventInfo.isNew) {
          setFormData({
            patientId: eventInfo.patientId || (await findPatientId(eventInfo.title)),
            doctorId: eventInfo.resourceId,
            date: formatDateTimeForInput(eventInfo.start),
            status: eventInfo.status || 'Aguardando',
          });
        }
      } catch (err) {
        setError(err.message);
      }
    };
    
    // Função auxiliar para encontrar o ID do paciente pelo nome (caso não tenhamos o ID)
    const findPatientId = async (title) => {
        // ... (esta lógica pode ser melhorada no futuro)
        return ''; 
    };

    fetchData();
  }, [eventInfo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- Função de Salvar (Criar/Editar) ---
  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    // Validação
    if (!formData.patientId || !formData.doctorId || !formData.date) {
      setError('Paciente, Médico e Data/Hora são obrigatórios.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const body = {
        patientId: parseInt(formData.patientId),
        doctorId: parseInt(formData.doctorId),
        date: new Date(formData.date).toISOString(), // Converte para o formato ISO
        status: formData.status,
      };

      const response = await fetch('http://localhost:3001/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao salvar agendamento.');
      }

      onSaveSuccess(); // Atualiza a agenda na tela principal
      onClose(); // Fecha o modal

    } catch (err) {
      setError(err.message);
    }
  };

  // --- Função de Deletar ---
  const handleDelete = async () => {
    if (!window.confirm("Tem certeza que deseja cancelar este agendamento?")) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/appointments/${eventInfo.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Falha ao deletar agendamento.');
      }

      onSaveSuccess();
      onClose();

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2>{eventInfo.isNew ? 'Novo Agendamento' : 'Editar Agendamento'}</h2>
        
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label htmlFor="patientId">Paciente *</label>
            <select
              id="patientId"
              name="patientId"
              value={formData.patientId}
              onChange={handleChange}
              required
            >
              <option value="" disabled>Selecione um paciente</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="doctorId">Médico *</label>
            <select
              id="doctorId"
              name="doctorId"
              value={formData.doctorId}
              onChange={handleChange}
              required
            >
              <option value="" disabled>Selecione um médico</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="date">Data e Hora *</label>
            <input
              type="datetime-local"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="Aguardando">Aguardando Confirmação</option>
              <option value="Confirmado">Confirmado</option>
              <option value="Chegou">Chegou (Sala de Espera)</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.modalActions}>
            {!eventInfo.isNew && (
              <button
                type="button"
                className={styles.deleteButton}
                onClick={handleDelete}
              >
                Cancelar Agendamento
              </button>
            )}
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Fechar
            </button>
            <button type="submit" className={styles.saveButton}>
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentModal;