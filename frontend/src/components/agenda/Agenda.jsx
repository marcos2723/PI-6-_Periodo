// frontend/src/components/Agenda.jsx
// (Renomeie seu arquivo de .js para .jsx se ele tiver HTML)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styles from './Agenda.module.css';
import AppointmentModal from './AppointmentModal.jsx';

// --- Configuração do Localizador date-fns ---
const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }), // Força a semana a começar na Segunda
  getDay,
  locales,
});

// --- Mensagens em Português ---
const messages = {
  next: "Próximo",
  previous: "Anterior",
  today: "Hoje",
  month: "Mês",
  week: "Semana",
  day: "Dia",
  agenda: "Agenda",
  date: "Data",
  time: "Hora",
  event: "Evento",
  noEventsInRange: "Não há eventos neste período.",
  showMore: total => `+ Ver mais (${total})`
};

// --- Componente para o Agendamento (Visual) ---
const EventComponent = ({ event }) => (
  <div className={styles.customEventContent}>
    <strong>{event.title}</strong>
    <span className={styles.eventDoctor}>{event.doctorName || ''}</span>
  </div>
);

// --- Componente Principal da Agenda ---
const Agenda = () => {
  const [allEvents, setAllEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // --- Estados para controlar os botões do calendário ---
  const [view, setView] = useState(Views.WEEK); // Visão padrão
  const [date, setDate] = useState(new Date());   // Data padrão

  // --- Busca os dados (Agendamentos e Médicos) ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Usuário não autenticado.');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [appointmentsRes, doctorsRes] = await Promise.all([
        fetch('http://localhost:3001/api/appointments', { headers }),
        fetch('http://localhost:3001/api/doctors', { headers }),
      ]);

      if (!appointmentsRes.ok) throw new Error('Falha ao buscar agendamentos.');
      if (!doctorsRes.ok) throw new Error('Falha ao buscar médicos.');

      const appointmentsData = await appointmentsRes.json();
      const doctorsData = await doctorsRes.json();

      const formattedAppointments = appointmentsData.map(event => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
        doctorName: event.doctor?.name || 'Médico não definido',
      }));
      
      setAllEvents(formattedAppointments);
      setFilteredEvents(formattedAppointments);
      setDoctors(doctorsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Efeito para filtrar os eventos ---
  useEffect(() => {
    if (selectedDoctor === 'all') {
      setFilteredEvents(allEvents);
    } else {
      setFilteredEvents(
        allEvents.filter(event => event.resourceId === parseInt(selectedDoctor))
      );
    }
  }, [selectedDoctor, allEvents]);

  // --- Funções de Estilização Visual do Calendário ---

  // Colore os slots (horários vagos)
  const slotPropGetter = useCallback((date) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - 1); // Dá uma tolerância de 1 minuto

    if (date < now) {
      return { className: styles.pastSlot };
    }
    const isBooked = allEvents.some(
      (event) => date >= event.start && date < event.end
    );
    if (isBooked) {
      return { className: styles.bookedSlot };
    }
    return {};
  }, [allEvents]);

  // Aplica o estilo customizado aos agendamentos
  const eventPropGetter = useCallback(() => ({
    className: styles.customEvent,
  }), []);

  // --- Handlers para Interação ---

  // Botão "+ Novo Agendamento" (como você pediu)
  const handleAddNewAppointment = () => {
    setSelectedEvent({
      isNew: true,
      start: new Date(), // Sugere a data e hora atual
    });
    setIsModalOpen(true);
  };

  // Clique em um horário vago
  const handleSelectSlot = useCallback((slotInfo) => {
    const now = new Date();
    if (slotInfo.start < now) {
      alert("⚠️ Não é possível agendar em horários passados.");
      return;
    }
    const isBooked = allEvents.some(
      (event) => slotInfo.start >= event.start && slotInfo.start < event.end
    );
    if (isBooked) {
        alert("🔒 Horário já reservado.");
        return;
    }
    setSelectedEvent({
      start: slotInfo.start,
      end: slotInfo.end,
      isNew: true,
    });
    setIsModalOpen(true);
  }, [allEvents]);

  // Clique em um agendamento existente
  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent({ ...event, isNew: false });
    setIsModalOpen(true);
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };
  
  // --- Renderização ---

  if (loading) {
    return <div className="page-content"><h2>Carregando agenda...</h2></div>;
  }
  
  if (error) {
    return <div className="page-content"><h2>Erro: {error}</h2></div>;
  }

  return (
    <div className="page-content">
      <div className={styles.agendaHeader}>
        <div className={styles.filterContainer}>
          <label htmlFor="doctorFilter">Profissional:</label>
          <select 
            id="doctorFilter"
            className={styles.doctorSelect}
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >
            <option value="all">Todos</option>
            {doctors.map(doctor => (
              <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
            ))}
          </select>
        </div>
        <button className={styles.ctaButton} onClick={handleAddNewAppointment}>
          + Novo Agendamento
        </button>
      </div>

      <div className={styles.calendarContainer}>
        <Calendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 'calc(100vh - 200px)' }}
          messages={messages}
          culture='pt-BR'
          selectable={true}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          slotPropGetter={slotPropGetter}
          eventPropGetter={eventPropGetter}
          components={{
            event: EventComponent,
          }}
          min={new Date(0, 0, 0, 8, 0, 0)} // Horário de início do dia (8h)
          max={new Date(0, 0, 0, 19, 0, 0)} // Horário de fim do dia (19h)
          
          // --- Itens para Corrigir os Botões ---
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
        />
      </div>

      {isModalOpen && (
        <AppointmentModal
          eventInfo={selectedEvent}
          onClose={closeModal}
          onSaveSuccess={fetchData} // Atualiza a agenda após salvar
        />
      )}
    </div>
  );
};

export default Agenda;