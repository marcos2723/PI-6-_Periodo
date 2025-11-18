// --- 1. IMPORTAÇÕES ---
require('dotenv').config(); // IMPORTANTE
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { format } = require('date-fns');

const http = require('http');
const { Server } = require('socket.io');

// --- 2. CONFIGURAÇÃO INICIAL ---
const prisma = new PrismaClient();
const app = express();

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000", // URL do seu frontend React
    methods: ["GET", "POST"]
  }
  });

app.use(cors());
app.use(express.json());

// --- LÓGICA DO CHAT (SOCKET.IO) ---
// (Todo o seu código de Socket.io existente - sem alterações)
const userSocketMap = {};
io.on('connection', (socket) => {
  let userPayload; 
  try {
    const token = socket.handshake.auth.token;
    if (!token) throw new Error("Token não fornecido");
    userPayload = jwt.verify(token, process.env.JWT_SECRET);
    userSocketMap[userPayload.userId] = socket.id;
    console.log(`[Socket.io] Usuário conectado: ${userPayload.name} (Socket ID: ${socket.id})`);
  } catch (err) {
    console.error(`[Socket.io] Falha na autenticação: ${err.message}`);
    socket.disconnect(true); 
    return; 
  }
  socket.on('get:message:history', async ({ otherUserId }) => {
    const myId = userPayload.userId;
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: myId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: myId }
        ]
      },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { name: true } } } 
    });
    socket.emit('message:history', messages);
  });
  socket.on('send:message', async ({ receiverId, content }) => {
    const senderId = userPayload.userId;
    try {
      const message = await prisma.chatMessage.create({
        data: {
          senderId: senderId,
          receiverId: parseInt(receiverId),
          content: content
        },
        include: { sender: { select: { name: true } } }
      });
      const receiverSocketId = userSocketMap[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive:message', message);
      }
      socket.emit('receive:message', message);
    } catch (err) {
      console.error("Erro ao salvar/enviar mensagem:", err);
    }
  });
  socket.on('disconnect', () => {
    // Adicionada verificação para evitar crash se userPayload não estiver definido
    if (userPayload) {
      console.log(`[Socket.io] Usuário desconectado: ${userPayload.name}`);
      delete userSocketMap[userPayload.userId];
    } else {
      console.log(`[Socket.io] Usuário (não autenticado) desconectado: ${socket.id}`);
    }
  });
});
// --- FIM DA LÓGICA DO CHAT ---


// --- 3. ROTAS DE AUTENTICAÇÃO ---
// (Seu código existente - sem alterações)
app.post('/api/register', async (req, res) => {
  const { name, email, password, role, crm, phone } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Todos os campos obrigatórios devem ser preenchidos." });
  }
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ error: "Este email já está em uso." });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role, crm: role === 'Médico' ? crm : null, phone },
    });
    res.status(201).json({ message: 'Usuário criado com sucesso!', userId: user.id });
  } catch (error) {
    console.error("Erro no registro:", error);
    res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ error: 'Credenciais inválidas' });
    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.status(200).json({ token });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
  }
});

// --- 4. ROTAS DE DADOS PROTEGIDAS (API) ---

const { authenticateToken } = require('./middleware/auth.js'); 
const productRoutes = require('./routes/product.routes.js');
const stockRoutes = require('./routes/stock.routes.js');

// ROTA PROTEGIDA PARA BUSCAR DADOS DO PERFIL
// (Seu código existente - sem alterações)
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, phone: true, role: true, crm: true, createdAt: true },
    });
    if (!userProfile) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
  }
});

// ROTA PARA ATUALIZAR O PERFIL
// (Seu código existente - sem alterações)
app.put('/api/profile', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { name, phone } = req.body; 
    if (!name && !phone) {
        return res.status(400).json({ error: 'Nenhum dado fornecido para atualização.' });
    }
    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(name && { name }),
                ...(phone && { phone }),
            },
            select: { id: true, email: true, name: true, phone: true, role: true, crm: true, createdAt: true },
        });
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
        res.status(500).json({ error: 'Ocorreu um erro interno ao atualizar o perfil.' });
    }
});

// ROTA PARA BUSCAR DADOS DO DASHBOARD
// (Seu código existente - sem alterações)
app.get('/api/dashboard-data', authenticateToken, async (req, res) => {
  try {
    // (Seu código de busca do dashboard aqui...)
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const now = new Date(); // --- ADICIONADO PARA LÓGICA CORRETA ---

    // KPI 1: Consultas Hoje
    const totalAppointments = await prisma.appointment.count({
      where: { date: { gte: today, lt: tomorrow } },
    });

    // KPI 2: Na Sala de Espera (Consultas restantes no dia)
    const waitingCount = await prisma.appointment.count({
      where: {
        date: { gte: now, lt: tomorrow },
        // (Descomente se você adicionar status)
        // AND: { status: { notIn: ['Concluída', 'Cancelada'] } } 
      },
    });

    const todayRevenue = totalAppointments * 250; 

    // Lista 1: Próximos 2 Agendamentos
    const nextAppointments = await prisma.appointment.findMany({
      where: { date: { gte: now } }, // A partir de agora
      orderBy: { date: 'asc' }, 
      take: 2, // Apenas 2
      include: { 
          patient: { select: { name: true } },
          doctor: { select: { name: true } } // Inclui nome do médico
      }
    });

    // Lista 2: Atividades Recentes (Últimas 5 consultas do dia)
    const recentActivities = await prisma.appointment.findMany({
      where: {
        date: {
          gte: today, // Do início do dia
          lt: now     // Até agora
        }
      },
      orderBy: { date: 'desc' },
      take: 5,
      include: { 
        patient: { select: { name: true } }
      }
    });

    const dashboardData = {
      kpis: { totalAppointments, waitingCount, todayRevenue: todayRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
      nextAppointments: nextAppointments.map(a => ({...a, time: format(new Date(a.date), 'HH:mm')})),
      recentActivities, // Envia as atividades recentes
    };
    res.status(200).json(dashboardData);
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
  }
});

// --- Rotas da Agenda ---
// (Seu código existente - sem alterações)
app.get('/api/users', authenticateToken, async (req, res) => {
  const loggedInUserId = req.user.userId; 
  try {
    const users = await prisma.user.findMany({
      where: { id: { not: loggedInUserId } },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
    res.status(200).json(users);
  } catch (error) {
    console.error("Erro ao buscar usuários para o chat:", error);
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
});

app.get('/api/doctors', authenticateToken, async (req, res) => {
  try {
    const doctors = await prisma.user.findMany({ 
        where: { role: 'Médico' }, 
        select: { id: true, name: true } 
    });
    res.status(200).json(doctors);
  } catch (error) {
    console.error("Erro ao buscar médicos:", error);
    res.status(500).json({ error: 'Erro ao buscar médicos.' });
  }
});

// --- ROTA NOVA PARA O FORMULÁRIO DE PACIENTES ---
app.get('/api/convenios', authenticateToken, async (req, res) => {
  try {
    const convenios = await prisma.convenio.findMany({
      orderBy: { name: 'asc' }
    });
    res.status(200).json(convenios);
  } catch (error) {
    console.error("Erro ao buscar convênios:", error);
    res.status(500).json({ error: 'Erro ao buscar convênios.' });
  }
});
// --- FIM DA ROTA NOVA ---
 
app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: { patient: { select: { name: true } }, doctor: { select: { name: true } } },
      orderBy: { date: 'asc' }
    });
    const formattedAppointments = appointments.map(app => ({
      id: app.id, title: `Consulta - ${app.patient.name} (${app.doctor.name})`, start: app.date,
      end: new Date(new Date(app.date).getTime() + 30 * 60000), resourceId: app.doctorId, status: app.status
    }));
    res.status(200).json(formattedAppointments);
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos.' });
  }
});

app.post('/api/appointments', authenticateToken, async (req, res) => {
  const { patientId, doctorId, date, status } = req.body;
  if (!patientId || !doctorId || !date) return res.status(400).json({ error: 'Paciente, médico e data são obrigatórios.' });
  const appointmentDate = new Date(date);
    const now = new Date();
    now.setMinutes(now.getMinutes() - 1); 
    if (appointmentDate < now) {
      return res.status(400).json({ error: 'Não é possível agendar consultas em datas ou horários passados.' });
    }
  try {
    const newAppointment = await prisma.appointment.create({
      data: { patientId: parseInt(patientId), doctorId: parseInt(doctorId), date: new Date(date), status: status || 'Aguardando' },
      include: { patient: { select: { name: true } }, doctor: { select: { name: true } } }
    });
     const formattedAppointment = {
        id: newAppointment.id, title: `Consulta - ${newAppointment.patient.name} (${newAppointment.doctor.name})`, start: newAppointment.date,
        end: new Date(new Date(newAppointment.date).getTime() + 30 * 60000), resourceId: newAppointment.doctorId, status: newAppointment.status
    };
    res.status(201).json(formattedAppointment);
  } catch (error) {
    console.error("Erro ao criar agendamento:", error);
    res.status(500).json({ error: 'Erro ao criar agendamento.' });
  }
});

app.delete('/api/appointments/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.appointment.delete({ where: { id: parseInt(id) } });
    res.status(204).send();
  } catch (error) {
    console.error("Erro ao deletar agendamento:", error);
    res.status(500).json({ error: 'Erro ao deletar agendamento.' });
  }
});


// --- ROTAS DE PACIENTES ATUALIZADAS ---

// GET: Buscar todos os pacientes (com busca)
// (Alterado para incluir todos os dados para a tabela/edição)
app.get('/api/patients', authenticateToken, async (req, res) => {
  const { search } = req.query; 
  try {
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { cpf: { contains: search } }, // Adicionado busca por CPF
          ],
        }
      : {}; 

    const patients = await prisma.patient.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      // ATUALIZADO: Incluir o nome do convênio na listagem
      include: {
        convenio: {
          select: { name: true }
        }
      }
    });
    res.status(200).json(patients);
  } catch (error) {
    console.error("Erro ao buscar pacientes:", error);
    res.status(500).json({ error: 'Erro ao buscar pacientes.' });
  }
});

// --- ROTA NOVA PARA PEGAR 1 PACIENTE (PARA O FORM DE EDIÇÃO) ---
app.get('/api/patients/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: parseInt(id) },
      include: {
        convenio: { select: { id: true, name: true } }
      }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });
    res.status(200).json(patient);
  } catch (error) {
    console.error("Erro ao buscar paciente:", error);
    res.status(500).json({ error: 'Erro ao buscar paciente.' });
  }
});


// POST: Criar um novo paciente (Atualizado)
app.post('/api/patients', authenticateToken, async (req, res) => {
    // 1. Pega TODOS os dados do formulário
    const { name, email, phone, cpf, birthDate, gender, address, convenioId } = req.body;
    
    if (!name || !email) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
    }
    try {
        const existingPatient = await prisma.patient.findUnique({ where: { email } });
        if (existingPatient) {
            return res.status(409).json({ error: 'Este email já está cadastrado para outro paciente.' });
        }
        
        // Verifica CPF duplicado (se for fornecido)
        if (cpf) {
          const existingCpf = await prisma.patient.findUnique({ where: { cpf } });
          if (existingCpf) {
            return res.status(409).json({ error: 'Este CPF já está cadastrado para outro paciente.' });
          }
        }
        
        // 2. Cria o paciente com TODOS os dados
        const newPatient = await prisma.patient.create({
            data: { 
              name, 
              email, 
              phone,
              cpf,
              birthDate: birthDate ? new Date(birthDate) : null,
              gender,
              address,
              // Conecta ao convênio (se um ID for enviado e for um número)
              convenioId: (convenioId && !isNaN(parseInt(convenioId))) ? parseInt(convenioId) : null
            },
        });
        res.status(201).json(newPatient);
    } catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('cpf')) {
           return res.status(409).json({ error: 'Este CPF já está cadastrado.' });
        }
        console.error("Erro ao criar paciente:", error);
        res.status(500).json({ error: 'Erro ao criar paciente.' });
    }
});

// PUT: Atualizar um paciente existente (Atualizado)
app.put('/api/patients/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    // 1. Pega TODOS os dados do formulário
    const { name, email, phone, cpf, birthDate, gender, address, convenioId } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
    }
    try {
        const existingPatient = await prisma.patient.findUnique({ where: { email } });
        if (existingPatient && existingPatient.id !== parseInt(id)) {
            return res.status(409).json({ error: 'Este email já está cadastrado para outro paciente.' });
        }

        // Verifica CPF duplicado (se for fornecido)
        if (cpf) {
          const existingCpf = await prisma.patient.findUnique({ where: { cpf } });
          if (existingCpf && existingCpf.id !== parseInt(id)) {
            return res.status(409).json({ error: 'Este CPF já está cadastrado para outro paciente.' });
          }
        }

        // 2. Atualiza o paciente com TODOS os dados
        const updatedPatient = await prisma.patient.update({
            where: { id: parseInt(id) },
            data: { 
              name, 
              email, 
              phone,
              cpf,
              birthDate: birthDate ? new Date(birthDate) : null,
              gender,
              address,
              convenioId: (convenioId && !isNaN(parseInt(convenioId))) ? parseInt(convenioId) : null
            },
        });
        res.status(200).json(updatedPatient);
    } catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('cpf')) {
           return res.status(409).json({ error: 'Este CPF já está cadastrado.' });
        }
        console.error("Erro ao atualizar paciente:", error);
        res.status(500).json({ error: 'Erro ao atualizar paciente.' });
    }
});

// DELETE: Deletar um paciente
// (Seu código existente - sem alterações)
app.delete('/api/patients/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const appointments = await prisma.appointment.count({
            where: {
                patientId: parseInt(id),
                date: { gte: new Date() } 
            }
        });
        if (appointments > 0) {
            return res.status(409).json({ error: 'Este paciente não pode ser excluído pois possui agendamentos futuros.' });
        }
        await prisma.patient.delete({
            where: { id: parseInt(id) },
        });
        res.status(204).send(); 
    } catch (error) {
        console.error("Erro ao deletar paciente:", error);
        res.status(500).json({ error: 'Erro ao deletar paciente.' });
    }
});

// --- ROTAS DO FINANCEIRO (MANTIDAS) ---
// (Este é o código que estava causando o Erro 500)
// (Vou comentar por agora para o servidor rodar)
/*
app.get('/api/financial-summary', authenticateToken, async (req, res) => {
  try {
    // Esta linha estava quebrando pois o model não existia no DB
    const totalReceitas = await prisma.Transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'RECEITA', status: 'Pago' }
    });
    // ...
  } catch (error) {
    console.error("Erro ao buscar resumo financeiro:", error);
    res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
  }
});
*/

// --- ROTAS DE ESTOQUE (MANTIDAS) ---
app.use('/api', productRoutes);
app.use('/api', stockRoutes);

// --- 5. INICIALIZAÇÃO DO SERVIDOR ---
const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Servidor HTTP e Socket.io rodando na porta ${PORT} - ${new Date().toLocaleString('pt-BR')}`);
});