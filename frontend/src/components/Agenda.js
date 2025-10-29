import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import styles from './Agenda.module.css';

// Configuração de localização para o calendário usar o formato brasileiro
const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Componente do Modal para Adicionar/Editar Agendamento
const AppointmentModal = ({ isOpen, onClose, onSave, eventInfo }) => {
  if (!isOpen) return null;

  // Lógica interna do modal (pode ser expandida no futuro)
  const handleFormSubmit = (e) => {
    e.preventDefault();
    // Simplesmente chama a função de salvar passada pelo componente pai
    onSave();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>{eventInfo?.id ? 'Editar Agendamento' : 'Novo Agendamento'}</h2>
        <form onSubmit={handleFormSubmit}>
          {/* Campos do formulário (futuramente serão inputs de verdade) */}
          <div className={styles.formGroup}>
            <label>Paciente:</label>
            <p>{eventInfo?.title || 'Novo Paciente'}</p>
          </div>
          <div className={styles.formGroup}>
            <label>Data:</label>
            <p>{format(eventInfo.start, 'dd/MM/yyyy')}</p>
          </div>
          <div className={styles.formGroup}>
            <label>Horário:</label>
            <p>{`${format(eventInfo.start, 'HH:mm')} - ${format(eventInfo.end, 'HH:mm')}`}</p>
          </div>
          
          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>Cancelar</button>
            <button type="submit" className={styles.saveButton}>Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
};


const Agenda = () => {
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Busca os agendamentos do backend
  const fetchAppointments = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/appointments');
      if (!response.ok) throw new Error('Falha ao buscar dados');
      
      const data = await response.json();
      const formattedData = data.map(event => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }));
      setEvents(formattedData);
    } catch (error) {
      console.error("Erro:", error);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Abre o modal ao clicar em um horário vago
  const handleSelectSlot = useCallback((slotInfo) => {
    setSelectedSlot({ start: slotInfo.start, end: slotInfo.end });
    setIsModalOpen(true);
  }, []);

  // Abre o modal ao clicar em um agendamento existente
  const handleSelectEvent = useCallback((event) => {
    setSelectedSlot(event);
    setIsModalOpen(true);
  }, []);

  // Lida com o salvamento de um novo agendamento (função para o futuro)
  const handleSaveAppointment = async () => {
    if (!selectedSlot) return;

    // Lógica para criar o novo evento e enviar para a API (POST /api/appointments)
    // Por enquanto, apenas adicionamos localmente e fechamos o modal
    const newEvent = {
        ...selectedSlot,
        title: "Novo Agendamento Teste", // Exemplo
    };
    
    // ATENÇÃO: A lógica real de POST para a API viria aqui
    // const response = await fetch('http://localhost:3001/api/appointments', { method: 'POST', ... })

    setEvents([...events, newEvent]); // Adiciona na lista
    setIsModalOpen(false); // Fecha o modal
    setSelectedSlot(null);
  };

  return (
    <div className="page-content">
      <div className={styles.calendarContainer}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 'calc(100vh - 150px)' }}
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
          selectable // Permite clicar em horários vagos
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
        />
      </div>
      
      <AppointmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAppointment}
        eventInfo={selectedSlot}
      />
    </div>
  );
};

export default Agenda;
