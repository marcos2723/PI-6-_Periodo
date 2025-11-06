import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import styles from './Agenda.module.css'; // Certifique-se que este CSS existe
import AppointmentModal from './AppointmentModal.jsx'; // Certifique-se que este caminho está correto

// Configuração de localização para o calendário
const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const Agenda = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // --- FUNÇÃO CORRIGIDA ---
  // Busca os agendamentos da API
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token'); // 1. Pega o token
      if (!token) throw new Error('Usuário não autenticado.');

      const response = await fetch('http://localhost:3001/api/appointments', {
        headers: {
          'Authorization': `Bearer ${token}`, // 2. Adiciona o token
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao buscar agendamentos.');
      }
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

  // Abre o modal para um NOVO agendamento
  const handleSelectSlot = useCallback((slotInfo) => {
    setSelectedEvent({
      start: slotInfo.start,
      end: slotInfo.end,
      isNew: true, // Flag para o modal
    });
    setIsModalOpen(true);
  }, []);

  // Abre o modal para ver/editar um agendamento EXISTENTE
  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent({
      ...event,
      isNew: false, // Flag para o modal
    });
    setIsModalOpen(true);
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  if (loading) {
    return <div className="page-content"><h2>Carregando agenda...</h2></div>;
  }
  
  if (error) {
    return <div className="page-content"><h2>Erro: {error}</h2></div>;
  }

  return (
    <div className="page-content">
      <div className={styles.calendarContainer}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 'calc(100vh - 150px)' }} // Ajusta a altura
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
          culture='pt-BR'
          defaultView='week'
          selectable={true} // Permite clicar em horários vagos
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
        />
      </div>

      {isModalOpen && (
        <AppointmentModal
          eventInfo={selectedEvent}
          onClose={closeModal}
          onSaveSuccess={fetchAppointments} // Passa a função para atualizar a agenda
        />
      )}
    </div>
  );
};

export default Agenda;