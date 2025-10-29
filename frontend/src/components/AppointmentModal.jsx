import React, { useState, useEffect } from 'react';
import styles from './AppointmentModal.module.css';
import format from 'date-fns/format';

const AppointmentModal = ({ eventInfo, onClose, onSaveSuccess }) => {
  // Estados para guardar os dados dos dropdowns e do formulário
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [error, setError] = useState('');

  // Busca as listas de pacientes e médicos quando o modal abre
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, doctorsRes] = await Promise.all([
          fetch('http://localhost:3001/api/patients'),
          fetch('http://localhost:3001/api/doctors')
        ]);
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

  // Função para salvar um novo agendamento
  const handleSave = async () => {
    setError('');
    if (!selectedPatient || !selectedDoctor) {
      setError('Por favor, selecione o paciente e o médico.');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Função para deletar um agendamento existente
  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja cancelar este agendamento?')) return;

    try {
        const response = await fetch(`http://localhost:3001/api/appointments/${eventInfo.id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Falha ao cancelar agendamento.');
        
        onSaveSuccess(); // Atualiza a agenda
        onClose();       // Fecha o modal
    } catch (err) {
        setError(err.message);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>{eventInfo.isNew ? 'Novo Agendamento' : 'Detalhes do Agendamento'}</h2>
        
        <div className={styles.formGroup}>
            <label>Horário:</label>
            <p>{`${format(eventInfo.start, 'dd/MM/yyyy HH:mm')} - ${format(eventInfo.end, 'HH:mm')}`}</p>
        </div>
        
        {/* Se for um novo agendamento, mostra os selects */}
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
            // Se for um agendamento existente, mostra apenas o nome
            <div className={styles.formGroup}>
                <label>Paciente:</label>
                <p>{eventInfo.title}</p>
            </div>
        )}

        {error && <p className={styles.error}>{error}</p>}
        
        <div className={styles.modalActions}>
          {/* Botão de deletar só aparece para eventos existentes */}
          {!eventInfo.isNew && (
            <button onClick={handleDelete} className={styles.deleteButton}>Cancelar Agendamento</button>
          )}
          <div style={{flex: 1}}></div> {/* Espaçador para empurrar os botões para a direita */}
          <button type="button" onClick={onClose} className={styles.cancelButton}>Fechar</button>
          {/* Botão de salvar só aparece para novos agendamentos */}
          {eventInfo.isNew && (
            <button onClick={handleSave} className={styles.saveButton}>Agendar</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;
