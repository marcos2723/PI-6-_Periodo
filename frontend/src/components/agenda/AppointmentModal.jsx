// frontend/src/components/AppointmentModal.jsx

import React, { useState, useEffect } from 'react';
import styles from './AppointmentModal.module.css';

// Função para formatar a data para o input datetime-local
const formatDateTimeForInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const AppointmentModal = ({ eventInfo, onClose, onSaveSuccess }) => {
  // --- 1. ADICIONADO: serviceId no estado inicial ---
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    serviceId: '', // Novo campo
    date: formatDateTimeForInput(eventInfo?.start),
    status: 'Aguardando',
  });

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]); // --- 2. ADICIONADO: Estado para lista de serviços ---
  const [error, setError] = useState('');

  // Busca a lista de pacientes, médicos e SERVIÇOS
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Usuário não autenticado.');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // --- 3. ADICIONADO: Busca serviços na API ---
        const [patientsRes, doctorsRes, servicesRes] = await Promise.all([
          fetch('http://localhost:3001/api/patients', { headers }),
          fetch('http://localhost:3001/api/doctors', { headers }),
          fetch('http://localhost:3001/api/services', { headers }), // Nova chamada
        ]);

        if (!patientsRes.ok || !doctorsRes.ok || !servicesRes.ok) {
          throw new Error('Falha ao carregar dados do formulário.');
        }

        const patientsData = await patientsRes.json();
        const doctorsData = await doctorsRes.json();
        const servicesData = await servicesRes.json(); // Dados dos serviços
        
        setPatients(patientsData);
        setDoctors(doctorsData);
        setServices(servicesData); // Salva no estado

        // Se estiver editando, preenche o formulário
        if (eventInfo && !eventInfo.isNew) {
          setFormData({
            patientId: eventInfo.patientId || '', 
            doctorId: eventInfo.resourceId,
            serviceId: eventInfo.serviceId || '', // Preenche se existir
            date: formatDateTimeForInput(eventInfo.start),
            status: eventInfo.status || 'Aguardando',
          });
        }
      } catch (err) {
        setError(err.message);
      }
    };
    
    fetchData();
  }, [eventInfo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- Função de Salvar ---
  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.patientId || !formData.doctorId || !formData.date) {
      setError('Paciente, Médico e Data/Hora são obrigatórios.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const body = {
        patientId: parseInt(formData.patientId),
        doctorId: parseInt(formData.doctorId),
        // --- 4. ADICIONADO: Envia o serviceId (ou null se vazio) ---
        serviceId: formData.serviceId ? parseInt(formData.serviceId) : null,
        date: new Date(formData.date).toISOString(),
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

      onSaveSuccess();
      onClose();

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

          {/* --- 5. ADICIONADO: Campo de Serviço --- */}
          <div className={styles.formGroup}>
            <label htmlFor="serviceId">Serviço / Procedimento</label>
            <select
              id="serviceId"
              name="serviceId"
              value={formData.serviceId}
              onChange={handleChange}
            >
              <option value="">Consulta (Padrão)</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} - {s.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </option>
              ))}
            </select>
          </div>
          {/* --------------------------------------- */}

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