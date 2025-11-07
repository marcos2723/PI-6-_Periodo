import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styles from './Agenda.module.css';
import AppointmentModal from './AppointmentModal.jsx';

// (opcional) Ícone para botão “Novo Agendamento”
import AddIcon from '@mui/icons-material/Add';

// Localização configurada corretamente
const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1, locale: ptBR }), // força segunda-feira
  getDay,
  locales,
});

const Agenda = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Usuário não autenticado.');

      const response = await fetch('http://localhost:3001/api/appointments', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Falha ao buscar agendamentos.');

      const data = await response.json();
      const formattedData = data.map(event => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }));
      setEvents(formattedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleSelectSlot = useCallback((slotInfo) => {
    const now = new Date();
    const slotStart = new Date(slotInfo.start);

    if (slotStart < now) {
      alert("⚠️ Não é possível agendar no passado.");
      return;
    }

    setSelectedEvent({
      start: slotInfo.start,
      end: slotInfo.end,
      isNew: true,
    });
    setIsModalOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent({ ...event, isNew: false });
    setIsModalOpen(true);
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  if (loading) {
    return <div className={styles.pageContent}><h2>Carregando agenda...</h2></div>;
  }

  if (error) {
    return <div className={styles.pageContent}><h2>Erro: {error}</h2></div>;
  }

  return (
    <div className={styles.pageContent}>
      <div className={styles.calendarContainer}>
        
        {/* Cabeçalho */}
        <div className={styles.header}>
          <h2>📅 Minha Agenda</h2>
          <button
            className={styles.newButton}
            onClick={() => {
              setSelectedEvent({ isNew: true, start: new Date(), end: new Date() });
              setIsModalOpen(true);
            }}
          >
            <AddIcon style={{ marginRight: '6px' }} />
            Novo Agendamento
          </button>
        </div>

        {/* Calendário */}
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          defaultView="week"
          views={['month', 'week', 'day', 'agenda']}
          popup
          selectable
          culture="pt-BR"
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          style={{ height: 'calc(100vh - 200px)' }}
          messages={{
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
          }}
        />
      </div>

      {isModalOpen && (
        <AppointmentModal
          eventInfo={selectedEvent}
          onClose={closeModal}
          onSaveSuccess={fetchAppointments}
        />
      )}
    </div>
  );
};

export default Agenda;
