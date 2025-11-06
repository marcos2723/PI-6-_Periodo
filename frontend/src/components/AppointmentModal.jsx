import React, { useState, useEffect } from 'react';
import styles from './AppointmentModal.module.css'; // Certifique-se que este CSS existe
import format from 'date-fns/format';

const AppointmentModal = ({ eventInfo, onClose, onSaveSuccess }) => {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [error, setError] = useState('');

  // --- FUNÇÃO CORRIGIDA ---
  // Busca as listas de pacientes e médicos quando o modal abre
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token'); // 1. Pega o token
        if (!token) throw new Error('Usuário não autenticado.');

        // 2. Adiciona o token em TODAS as requisições
        const [patientsRes, doctorsRes] = await Promise.all([
          fetch('http://localhost:3001/api/patients', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:3001/api/doctors', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (!patientsRes.ok || !doctorsRes.ok) {
            throw new Error('Falha ao carregar dados de pacientes ou médicos.');
        }

        const patientsData = await patientsRes.json();
        const doctorsData = await doctorsRes.json();
        setPatients(patientsData);
        setDoctors(doctorsData);
      } catch (err) {
        setError('Falha ao carregar dados necessários.');
      }
    };
    fetchData();
  }, []);

  // --- FUNÇÃO CORRIGIDA ---
  // Função para salvar um novo agendamento
  const handleSave = async () => {
    setError('');
    if (!selectedPatient || !selectedDoctor) {
      setError('Por favor, selecione o paciente e o médico.');
      return;
    }

    try {
      const token = localStorage.getItem('token'); // 1. Pega o token
      const response = await fetch('http://localhost:3001/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // 2. Adiciona o token
        },
        body: JSON.stringify({
          patientId: selectedPatient,
          doctorId: selectedDoctor,
          date: eventInfo.start,
        }),
      });
      if (!response.ok) throw new Error('Falha ao salvar agendamento.');
      
      onSaveSuccess(); // Atualiza a agenda na tela principal
      onClose();       // Fecha o modal
    } catch (err) {
      setError(err.message);
    }
  };

  // --- FUNÇÃO CORRIGIDA ---
  // Função para deletar um agendamento existente
  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja cancelar este agendamento?')) return;

    try {
        const token = localStorage.getItem('token'); // 1. Pega o token
        const response = await fetch(`http://localhost:3001/api/appointments/${eventInfo.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}` // 2. Adiciona o token
            },
        });
        if (!response.ok) throw new Error('Falha ao cancelar agendamento.');
        
        onSaveSuccess(); // Atualiza a agenda
        onClose();       // Fecha o modal
    } catch (err) {
        setError(err.message);
    }
  };
  
  // (O 'return' do JSX continua o mesmo, pois a lógica de UI não mudou)
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>{eventInfo.isNew ? 'Novo Agendamento' : 'Detalhes do Agendamento'}</h2>
        
        <div className={styles.formGroup}>
            <label>Horário:</label>
            <p>{`${format(eventInfo.start, 'dd/MM/yyyy HH:mm')} - ${format(eventInfo.end, 'HH:mm')}`}</p>
        </div>
        
        {eventInfo.isNew ? (
          <>
            <div className={styles.formGroup}>
              <label htmlFor="patient">Paciente</label>
              <select id="patient" value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)}>
                <option value="" disabled>Selecione um paciente</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="doctor">Médico</label>
              <select id="doctor" value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}>
                <option value="" disabled>Selecione um médico</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </>
        ) : (
            <div className={styles.formGroup}>
                <label>Paciente:</label>
                <p>{eventInfo.title.replace('Consulta - ', '')}</p>
            </div>
        )}

        {error && <p className={styles.error}>{error}</p>}
        
        <div className={styles.modalActions}>
          {!eventInfo.isNew && (
            <button onClick={handleDelete} className={styles.deleteButton}>Cancelar Agendamento</button>
          )}
          <div style={{flex: 1}}></div>
          <button type="button" onClick={onClose} className={styles.cancelButton}>Fechar</button>
          {eventInfo.isNew && (
            <button onClick={handleSave} className={styles.saveButton}>Agendar</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;