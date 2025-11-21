// frontend/src/components/AppointmentModal.jsx
import React, { useState, useEffect } from 'react';
import styles from './AppointmentModal.module.css';
import { format } from 'date-fns';
import { 
  FaCalendarAlt, 
  FaMapMarkerAlt, 
  FaUserMd, 
  FaClock, 
  FaDoorOpen, 
  FaNotesMedical,
  FaUser
} from 'react-icons/fa';

const AppointmentModal = ({ eventInfo, onClose, onSaveSuccess }) => {
  // Estados para os dados do banco
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [error, setError] = useState('');

  // Estado do Formulário
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    serviceId: '',
    dateOnly: '',  // Data separada (AAAA-MM-DD)
    timeOnly: '',  // Hora separada (HH:MM)
    location: 'Matriz - Boa Viagem', // Valor padrão (exemplo da foto)
    room: 'Sala 01', // Valor padrão
    status: 'Aguardando',
  });

  // --- 1. Carregar Listas (Pacientes, Médicos, Serviços) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const [patRes, docRes, servRes] = await Promise.all([
          fetch('http://localhost:3001/api/patients', { headers }),
          fetch('http://localhost:3001/api/doctors', { headers }),
          fetch('http://localhost:3001/api/services', { headers }),
        ]);

        setPatients(await patRes.json());
        setDoctors(await docRes.json());
        setServices(await servRes.json());

        // --- 2. Preencher dados se for edição ou clique no calendário ---
        if (eventInfo) {
          const start = new Date(eventInfo.start);
          
          setFormData(prev => ({
            ...prev,
            patientId: eventInfo.patientId || '',
            doctorId: eventInfo.resourceId || '', // Pega o médico da coluna clicada
            serviceId: eventInfo.serviceId || '',
            // Separa Data e Hora do objeto Date
            dateOnly: format(start, 'yyyy-MM-dd'),
            timeOnly: format(start, 'HH:mm'),
            status: eventInfo.status || 'Aguardando'
          }));
        }
      } catch (err) {
        setError('Erro ao carregar dados.');
      }
    };
    fetchData();
  }, [eventInfo]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- 3. Salvar ---
  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!formData.patientId || !formData.doctorId || !formData.dateOnly || !formData.timeOnly) {
      setError('Preencha Paciente, Médico, Data e Hora.');
      return;
    }

    // Junta Data e Hora novamente para enviar pro Banco
    const combinedDateTime = new Date(`${formData.dateOnly}T${formData.timeOnly}:00`);

    try {
      const token = localStorage.getItem('token');
      const body = {
        patientId: parseInt(formData.patientId),
        doctorId: parseInt(formData.doctorId),
        serviceId: formData.serviceId ? parseInt(formData.serviceId) : null,
        date: combinedDateTime.toISOString(),
        status: formData.status
      };

      const response = await fetch('http://localhost:3001/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error('Erro ao salvar.');
      
      onSaveSuccess(); // Atualiza a agenda
      onClose();       // Fecha modal
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>AGENDAMENTO</h3>
          <button onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSave} className={styles.formContent}>
          
          {/* --- LINHA 1: CAMPO DE PACIENTE (Essencial) --- */}
          <div className={styles.rowFull}>
             <div className={styles.inputWrapper}>
                <FaUser className={styles.icon} />
                <select name="patientId" value={formData.patientId} onChange={handleChange} required>
                  <option value="" disabled>Selecione o Paciente</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
             </div>
          </div>

          {/* --- LINHA 2: OS CAMPOS DA SUA FOTO (Data, Local, Agenda, Hora, Sala) --- */}
          <div className={styles.gridRow}>
            
            {/* Data */}
            <div className={styles.inputWrapper}>
              <FaCalendarAlt className={styles.icon} />
              <input type="date" name="dateOnly" value={formData.dateOnly} onChange={handleChange} />
            </div>

            {/* Local (Fixo por enquanto, visual) */}
            <div className={styles.inputWrapper}>
              <FaMapMarkerAlt className={styles.icon} />
              <select name="location" value={formData.location} onChange={handleChange}>
                <option>Boa Viagem</option>
                <option>Centro</option>
              </select>
            </div>

            {/* Agenda (Médico) */}
            <div className={styles.inputWrapper}>
              <FaUserMd className={styles.icon} />
              <select name="doctorId" value={formData.doctorId} onChange={handleChange}>
                <option value="" disabled>Selecione a Agenda</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            {/* Horário */}
            <div className={styles.inputWrapper}>
              <FaClock className={styles.icon} />
              <input type="time" name="timeOnly" value={formData.timeOnly} onChange={handleChange} />
            </div>

            {/* Sala */}
            <div className={styles.inputWrapper}>
              <FaDoorOpen className={styles.icon} />
              <select name="room" value={formData.room} onChange={handleChange}>
                <option>Sala 01</option>
                <option>Sala 02</option>
                <option>Raio-X</option>
              </select>
            </div>

          </div>

          {/* --- LINHA 3: PROCEDIMENTO --- */}
          <div className={styles.rowFull} style={{marginTop: '15px'}}>
             <div className={styles.inputWrapper}>
                <FaNotesMedical className={styles.icon} />
                <select name="serviceId" value={formData.serviceId} onChange={handleChange}>
                  <option value="">Selecione o Procedimento</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>
                  ))}
                </select>
             </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.footer}>
            <button type="button" onClick={onClose} className={styles.btnCancel}>Cancelar</button>
            <button type="submit" className={styles.btnSave}>Confirmar Agendamento</button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AppointmentModal;