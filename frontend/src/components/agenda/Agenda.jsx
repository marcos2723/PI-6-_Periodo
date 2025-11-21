import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import Calendar from 'react-calendar'; // Mini Calendário (npm install react-calendar)
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';

// Estilos
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-calendar/dist/Calendar.css'; 
import styles from './Agenda.module.css';

// Componentes e Ícones
import AppointmentModal from './AppointmentModal.jsx'; // Verifique se o caminho está certo
import { FaFilter, FaUserMd, FaCalendarPlus } from 'react-icons/fa';

// --- Configuração do Localizador (date-fns) ---
const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }), // Semana começa na Segunda
  getDay,
  locales,
});

// --- Traduções do Calendário ---
const messages = {
  next: "Próximo",
  previous: "Anterior",
  today: "Hoje",
  month: "Mês",
  week: "Semana",
  day: "Dia",
  agenda: "Lista",
  date: "Data",
  time: "Hora",
  event: "Evento",
  noEventsInRange: "Sem agendamentos neste período.",
};

// --- Componente Visual do Evento (Card dentro da agenda) ---
const EventComponent = ({ event }) => (
  <div className={styles.eventInner}>
    <div className={styles.eventTitle}>
        {/* Mostra Nome do Paciente ou Serviço */}
        {event.title.split('-')[1] || event.title} 
    </div> 
    <div className={styles.eventDoctor}>
        <FaUserMd size={10} style={{marginRight: '4px'}}/> 
        {event.doctorName ? event.doctorName.split(' ')[0] : 'Dr(a).'}
    </div>
  </div>
);

const Agenda = () => {
  // --- Estados de Dados ---
  const [allEvents, setAllEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // --- Estados de Controle Visual ---
  const [view, setView] = useState(Views.DAY); // Padrão: Visão de Dia (igual sua foto)
  const [date, setDate] = useState(new Date()); // Data atual
  
  // --- Estados do Modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // --- 1. Buscar Dados da API ---
  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [appointmentsRes, doctorsRes] = await Promise.all([
        fetch('http://localhost:3001/api/appointments', { headers }),
        fetch('http://localhost:3001/api/doctors', { headers }),
      ]);

      if (appointmentsRes.ok && doctorsRes.ok) {
        const appointmentsData = await appointmentsRes.json();
        const doctorsData = await doctorsRes.json();

        // Formata as datas que vêm como string do JSON
        const formatted = appointmentsData.map(evt => ({
          ...evt,
          start: new Date(evt.start),
          end: new Date(evt.end),
          doctorName: evt.doctor?.name || 'Sem Médico',
        }));
        
        setAllEvents(formatted);
        setFilteredEvents(formatted);
        setDoctors(doctorsData);
      }
    } catch (err) {
      console.error("Erro ao carregar agenda:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- 2. Filtrar por Médico ---
  useEffect(() => {
    if (selectedDoctor === 'all') {
      setFilteredEvents(allEvents);
    } else {
      setFilteredEvents(allEvents.filter(e => e.resourceId === parseInt(selectedDoctor)));
    }
  }, [selectedDoctor, allEvents]);

  // --- 3. Cores Dinâmicas por Status ---
  const eventPropGetter = useCallback((event) => {
    let backgroundColor = '#3174ad'; 
    let borderLeftColor = '#275d8b';
    let color = '#fff';

    switch (event.status) {
      case 'Confirmado':
        backgroundColor = '#198754'; // Verde
        borderLeftColor = '#146c43';
        break;
      case 'Aguardando':
        backgroundColor = '#ffc107'; // Amarelo
        borderLeftColor = '#d39e00';
        color = '#000'; // Texto preto para contraste
        break;
      case 'Chegou':
        backgroundColor = '#0dcaf0'; // Azul Claro
        borderLeftColor = '#0aa2c0';
        color = '#000';
        break;
      case 'Finalizado':
        backgroundColor = '#6c757d'; // Cinza
        borderLeftColor = '#565e64';
        break;
      case 'Cancelado':
        backgroundColor = '#dc3545'; // Vermelho
        borderLeftColor = '#b02a37';
        break;
      default:
        break;
    }

    return {
      style: {
        backgroundColor,
        color,
        borderLeft: `5px solid ${borderLeftColor}`,
        borderRadius: '4px',
        border: 'none',
        fontSize: '0.85rem',
        padding: '2px 5px'
      },
    };
  }, []);

  // --- 4. Handlers de Interação ---
  
  // Navegar pelo calendário grande ou mini
  const handleNavigate = (newDate) => setDate(newDate);
  
  // Clicar em um horário vazio -> Novo Agendamento
  const handleSelectSlot = ({ start, end }) => {
    const now = new Date();
    // Opcional: Bloquear passado
    // if (start < now) return alert("Não é possível agendar no passado.");
    
    setSelectedEvent({ 
      start, 
      end, 
      isNew: true,
      status: 'Aguardando' // Status padrão
    });
    setIsModalOpen(true);
  };

  // Clicar em um evento existente -> Editar
  const handleSelectEvent = (event) => {
    setSelectedEvent({ ...event, isNew: false });
    setIsModalOpen(true);
  };

  // Botão "Novo Agendamento" lateral
  const handleManualNew = () => {
    const now = new Date();
    // Arredonda para a próxima hora cheia ou meia hora
    now.setMinutes(now.getMinutes() > 30 ? 0 : 30);
    if (now.getMinutes() === 0) now.setHours(now.getHours() + 1);

    setSelectedEvent({ isNew: true, start: now });
    setIsModalOpen(true);
  };

  return (
    <div className="page-content" style={{padding: 0, height: 'calc(100vh - 60px)', overflow: 'hidden'}}>
      
      <div className={styles.layoutContainer}>
        
        {/* === SIDEBAR DA AGENDA (ESQUERDA) === */}
        <aside className={styles.agendaSidebar}>
          
          {/* Botão Principal */}
          <div className={styles.sidebarSection}>
            <button className={styles.newApptButton} onClick={handleManualNew}>
              <FaCalendarPlus /> Novo Agendamento
            </button>
          </div>

          {/* Filtro de Médico */}
          <div className={styles.sidebarSection}>
            <label className={styles.label}><FaFilter /> Especialista</label>
            <select 
              className={styles.selectInput}
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
            >
              <option value="all">Todas as Agendas</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* Mini Calendário */}
          <div className={styles.miniCalendarWrapper}>
            <Calendar 
              onChange={setDate} 
              value={date} 
              locale="pt-BR"
              className={styles.reactCalendar}
            />
          </div>

          {/* Legenda de Cores */}
          <div className={styles.legend}>
            <h4>Status</h4>
            <div className={styles.legendItem}><span style={{background: '#ffc107'}}></span> Aguardando</div>
            <div className={styles.legendItem}><span style={{background: '#198754'}}></span> Confirmado</div>
            <div className={styles.legendItem}><span style={{background: '#0dcaf0'}}></span> Chegou (Recepção)</div>
            <div className={styles.legendItem}><span style={{background: '#6c757d'}}></span> Finalizado</div>
            <div className={styles.legendItem}><span style={{background: '#dc3545'}}></span> Cancelado</div>
          </div>
        </aside>

        {/* === ÁREA PRINCIPAL (DIREITA) === */}
        <main className={styles.agendaMain}>
          
          {/* Toolbar Customizada (Data e Botões de Visão) */}
          <div className={styles.calendarToolbarCustom}>
             <h2>{format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</h2>
             
             <div className={styles.viewToggle}>
               <button 
                 className={view === Views.DAY ? styles.activeView : ''} 
                 onClick={() => setView(Views.DAY)}
               >Dia</button>
               <button 
                 className={view === Views.WEEK ? styles.activeView : ''} 
                 onClick={() => setView(Views.WEEK)}
               >Semana</button>
               <button 
                 className={view === Views.MONTH ? styles.activeView : ''} 
                 onClick={() => setView(Views.MONTH)}
               >Mês</button>
             </div>
          </div>

          {/* Calendário Grande */}
          <div className={styles.bigCalendarWrapper}>
            <BigCalendar
              localizer={localizer}
              events={filteredEvents}
              date={date}
              onNavigate={handleNavigate}
              view={view}
              onView={setView}
              
              // Configurações de horário
              step={30} // Intervalo de 30 min
              timeslots={2} // 2 slots por hora (visual)
              min={new Date(0, 0, 0, 7, 0, 0)} // Começa 07:00
              max={new Date(0, 0, 0, 20, 0, 0)} // Termina 20:00
              
              messages={messages}
              culture='pt-BR'
              selectable
              
              // Eventos de Clique
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              
              // Estilização
              eventPropGetter={eventPropGetter}
              components={{ event: EventComponent }}
              
              // Desabilita toolbar padrão pois criamos uma customizada
              toolbar={false} 
            />
          </div>
        </main>

      </div>

      {/* === MODAL DE AGENDAMENTO === */}
      {isModalOpen && (
        <AppointmentModal
          eventInfo={selectedEvent}
          onClose={() => setIsModalOpen(false)}
          onSaveSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default Agenda;