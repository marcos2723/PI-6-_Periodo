// --- 1. IMPORTAÇÕES ---
require('dotenv').config(); // IMPORTANTE: Deve ser a primeira linha
const express = require('express');
const cors = require('cors');
const { PrismaClient, MovementType } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { format } = require('date-fns');
const http = require('http');
const { Server } = require('socket.io');

// --- 2. CONFIGURAÇÃO INICIAL ---
const prisma = new PrismaClient();
const app = express();
const httpServer = http.createServer(app);

// Configuração do Socket.io (Chat)
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"], // Permite ambas as portas do frontend
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// --- 3. LÓGICA DO CHAT (SOCKET.IO) ---
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
    if (userPayload) { // Verifica se userPayload foi definido
      console.log(`[Socket.io] Usuário desconectado: ${userPayload.name}`);
      delete userSocketMap[userPayload.userId];
    } else {
      console.log("[Socket.io] Um usuário não autenticado se desconectou.");
    }
  });
});
// --- FIM DA LÓGICA DO CHAT ---


// --- 4. ROTAS DE AUTENTICAÇÃO ---
app.post('/api/register', async (req, res) => {
  const { name, email, password, role, crm, phone } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Todos os campos obrigatórios devem ser preenchidos." });
i }
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

// --- 5. MIDDLEWARE DE AUTENTICAÇÃO ---
const { authenticateToken } = require('./middleware/auth.js'); 

// --- 6. ROTAS DE DADOS PROTEGIDAS (API) ---

// Perfil
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
app.put('/api/profile', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { name, phone } = req.body; 
    if (!name && !phone) return res.status(400).json({ error: 'Nenhum dado fornecido para atualização.' });
    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId }, data: { ...(name && { name }), ...(phone && { phone }) },
            select: { id: true, email: true, name: true, phone: true, role: true, crm: true, createdAt: true },
        });
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
        res.status(500).json({ error: 'Ocorreu um erro interno ao atualizar o perfil.' });
    }
});

// Dashboard
app.get('/api/dashboard-data', authenticateToken, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const totalAppointments = await prisma.appointment.count({ where: { date: { gte: today, lt: tomorrow } } });
    const waitingCount = await prisma.appointment.count({ where: { date: { gte: today, lt: tomorrow }, status: 'Chegou' } });
    
    // Calcula a receita real das transações pagas hoje
    const revenueResult = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { 
        type: 'RECEITA', 
        status: 'Pago',
        date: { gte: today, lt: tomorrow }
      }
    });
    const todayRevenue = revenueResult._sum.amount || 0;
    
    const nextAppointments = await prisma.appointment.findMany({
      where: { date: { gte: new Date() } },
      orderBy: { date: 'asc' }, take: 5,
      include: { patient: { select: { name: true } } }
    });
    const dashboardData = {
      kpis: { 
        totalAppointments, 
        waitingCount, 
        todayRevenue: todayRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
      },
      nextAppointments: nextAppointments.map(a => ({...a, time: format(new Date(a.date), 'HH:mm')})),
      recentActivities: [], 
    };
    res.status(200).json(dashboardData);
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
  }
});

// Chat (Lista de Usuários)
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

// Agenda
app.get('/api/doctors', authenticateToken, async (req, res) => {
  try {
    const doctors = await prisma.user.findMany({ where: { role: 'Médico' }, select: { id: true, name: true } });
    res.status(200).json(doctors);
  } catch (error) {
    console.error("Erro ao buscar médicos:", error);
    res.status(500).json({ error: 'Erro ao buscar médicos.' });
  }
});
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
  const appointmentDate = new Date(date); const now = new Date(); now.setMinutes(now.getMinutes() - 1); 
  if (appointmentDate < now) return res.status(400).json({ error: 'Não é possível agendar consultas em datas ou horários passados.' });
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

// Pacientes (CRUD Completo)
app.get('/api/patients', authenticateToken, async (req, res) => {
  const { search } = req.query;
  try {
    const whereClause = search ? { OR: [ { name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } } ] } : {};
    const patients = await prisma.patient.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, phone: true }
    });
    res.status(200).json(patients);
  } catch (error) {
    console.error("Erro ao buscar pacientes:", error);
    res.status(500).json({ error: 'Erro ao buscar pacientes.' });
  }
});
app.post('/api/patients', authenticateToken, async (req, res) => {
    const { name, email, phone } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
    try {
        const existingPatient = await prisma.patient.findUnique({ where: { email } });
        if (existingPatient) return res.status(409).json({ error: 'Este email já está cadastrado para outro paciente.' });
        const newPatient = await prisma.patient.create({ data: { name, email, phone } });
        res.status(201).json(newPatient);
    } catch (error) {
        console.error("Erro ao criar paciente:", error);
        res.status(500).json({ error: 'Erro ao criar paciente.' });
    }
});
app.put('/api/patients/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, email, phone } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
    try {
        const existingPatient = await prisma.patient.findUnique({ where: { email } });
        if (existingPatient && existingPatient.id !== parseInt(id)) {
            return res.status(409).json({ error: 'Este email já está cadastrado para outro paciente.' });
        }
        const updatedPatient = await prisma.patient.update({
            where: { id: parseInt(id) }, data: { name, email, phone },
        });
        res.status(200).json(updatedPatient);
    } catch (error) {
        console.error("Erro ao atualizar paciente:", error);
        res.status(500).json({ error: 'Ocorreu um erro interno ao atualizar o perfil.' });
    }
});
app.delete('/api/patients/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const appointments = await prisma.appointment.count({
            where: { patientId: parseInt(id), date: { gte: new Date() } }
        });
        if (appointments > 0) return res.status(409).json({ error: 'Este paciente não pode ser excluído pois possui agendamentos futuros.' });
        
        // Deleta os orçamentos e transações primeiro
        await prisma.budget.deleteMany({ where: { patientId: parseInt(id) } });
        await prisma.transaction.deleteMany({ where: { patientId: parseInt(id) } });
        // Deleta os agendamentos passados
        await prisma.appointment.deleteMany({ where: { patientId: parseInt(id) } });
        // Agora deleta o paciente
        await prisma.patient.delete({ where: { id: parseInt(id) } });
        res.status(204).send();
    } catch (error) {
        console.error("Erro ao deletar paciente:", error);
        res.status(500).json({ error: 'Erro ao deletar paciente.' });
    }
});


// ---------------------------------------
// --- NOVAS ROTAS FINANCEIRAS (CRUD) ---
// ---------------------------------------

// --- Serviços (Configurações) ---
app.get('/api/services', authenticateToken, async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      orderBy: { name: 'asc' }
    });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar serviços.' });
  }
});
app.post('/api/services', authenticateToken, async (req, res) => {
  const { name, price } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: 'Nome e preço são obrigatórios.' });
  }
  try {
    const newService = await prisma.service.create({
      data: { name, price: parseFloat(price) }
    });
    res.status(201).json(newService);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar serviço.' });
  }
});

// --- Lançamentos (Livro Caixa) ---
app.get('/api/transactions', authenticateToken, async (req, res) => {
  const { type, status } = req.query; 
  let whereClause = {};
  if (type) whereClause.type = type;
  if (status) whereClause.status = status;
  
  try {
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: {
        patient: { select: { name: true } },
        service: { select: { name: true } }
      }
    });
    res.status(200).json(transactions);
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    res.status(500).json({ error: 'Erro ao buscar transações.' });
  }
});
app.post('/api/transactions', authenticateToken, async (req, res) => {
  const { description, amount, type, paymentMethod, status, patientId, serviceId } = req.body;
  const userId = req.user.userId;

  if (!description || !amount || !type || !paymentMethod || !status) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }
  try {
    const positiveAmount = Math.abs(parseFloat(amount));
    
    const newTransaction = await prisma.transaction.create({
      data: {
        description,
        amount: positiveAmount,
        type, // "RECEITA" ou "DESPESA"
        paymentMethod,
        status,
        patientId: patientId ? parseInt(patientId) : null,
        serviceId: serviceId ? parseInt(serviceId) : null,
        userId: parseInt(userId)
      }
    });
    res.status(201).json(newTransaction);
  } catch (error) {
    console.error("Erro ao criar transação:", error);
    res.status(500).json({ error: 'Erro ao criar transação.' });
  }
});

// --- Visão Geral (Dashboard Financeiro) ---
app.get('/api/financial-summary', authenticateToken, async (req, res) => {
  try {
    const totalRevenue = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'RECEITA', status: 'Pago' }
    });
    const totalExpenses = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'DESPESA', status: 'Pago' }
    });
    const pendingReceivables = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'RECEITA', status: 'Pendente' }
    });
    
    const revenueValue = totalRevenue._sum.amount || 0;
    const expensesValue = totalExpenses._sum.amount || 0;

    res.status(200).json({
      totalRevenue: revenueValue,
      totalExpenses: expensesValue,
      netIncome: revenueValue - expensesValue,
pendingReceivables: pendingReceivables._sum.amount || 0,
    });
  } catch (error) {
    console.error("Erro ao buscar resumo financeiro:", error);
    res.status(500).json({ error: 'Erro ao buscar resumo financeiro.' });
  }
});

// --- Rotas de Orçamentos (Budget) ---
app.get('/api/budgets', authenticateToken, async (req, res) => {
  try {
    const budgets = await prisma.budget.findMany({
      orderBy: { date: 'desc' },
      include: {
        patient: { select: { name: true } },
        lines: { 
          include: {
            service: { select: { name: true } }
          }
        }
      }
    });
    res.status(200).json(budgets);
  } catch (error) {
    console.error("Erro ao buscar orçamentos:", error);
    res.status(500).json({ error: 'Erro ao buscar orçamentos.' });
  }
});

app.post('/api/budgets', authenticateToken, async (req, res) => {
  const { patientId, status, lines } = req.body;
  const userId = req.user.userId;

  if (!patientId || !lines || lines.length === 0) {
    return res.status(400).json({ error: 'Paciente e pelo menos uma linha de serviço são obrigatórios.' });
  }

  try {
    let total = 0;
    lines.forEach(line => {
      total += (line.quantity || 1) * (line.unitPrice || 0);
    });

    const newBudget = await prisma.budget.create({
      data: {
        patientId: parseInt(patientId),
        userId: parseInt(userId),
        status: status || 'Pendente',
        total: total,
        lines: {
          create: lines.map(line => ({
            serviceId: parseInt(line.serviceId),
            quantity: parseInt(line.quantity),
            unitPrice: parseFloat(line.unitPrice),
          })),
        },
      },
      include: {
        patient: { select: { name: true } },
        lines: { include: { service: { select: { name: true } } } }
      }
    });
    
    res.status(201).json(newBudget);
  } catch (error) {
    console.error("Erro ao criar orçamento:", error);
    res.status(500).json({ error: 'Erro ao criar orçamento.' });
  }
});

// 
// -----------------------------------------------------------------
// --- ROTA DO GRÁFICO CORRIGIDA ---
// -----------------------------------------------------------------
//
// Rota para buscar dados do GRÁFICO (Últimos 30 dias) - (VERSÃO CORRIGIDA)
app.get('/api/financial-chart-data', authenticateToken, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));
    thirtyDaysAgo.setHours(0, 0, 0, 0); // Garante que começa da meia-noite

    // 1. Prepara o Map com os últimos 30 dias na ordem correta
    const dataMap = new Map();
    for (let i = 29; i >= 0; i--) { // Começa de 29 dias atrás até hoje (0)
      const date = new Date(new Date().setDate(new Date().getDate() - i));
      const dateStr = format(date, 'dd/MM');
      // Garante que a chave é única (caso cruze o mês/ano)
      if (!dataMap.has(dateStr)) {
        dataMap.set(dateStr, { name: dateStr, Receita: 0, Despesa: 0 });
      }
    }

    // 2. Busca TODAS as transações (Receitas) dos últimos 30 dias
    // Trocamos groupBy por findMany
    const revenueTransactions = await prisma.transaction.findMany({
      where: {
        type: 'RECEITA',
        status: 'Pago',
        date: { gte: thirtyDaysAgo },
      },
    });
    
    // 3. Busca TODAS as transações (Despesas) dos últimos 30 dias
    // Trocamos groupBy por findMany
    const expenseTransactions = await prisma.transaction.findMany({
      where: {
        type: 'DESPESA',
        status: 'Pago',
        date: { gte: thirtyDaysAgo },
      },
    });

    // 4. Mescla os dados em JavaScript (Corrigindo a lógica)

    // Loop 1: Soma as Receitas
    revenueTransactions.forEach(item => {
      const dateStr = format(new Date(item.date), 'dd/MM');
      const dayData = dataMap.get(dateStr);
      // Se o dia existir no nosso map de 30 dias
      if (dayData) {
        // Use SOMA (+=) e acesse item.amount (não item._sum.amount)
        dayData.Receita += item.amount; 
      }
    });

    // Loop 2: Soma as Despesas
    expenseTransactions.forEach(item => {
      const dateStr = format(new Date(item.date), 'dd/MM');
      const dayData = dataMap.get(dateStr);
      // Se o dia existir no nosso map de 30 dias
      if (dayData) {
        // Use SOMA (+=) e acesse item.amount
        dayData.Despesa += item.amount; 
      }
    });

    // 5. Converte o Map para Array
    // A ordenação já está correta pela forma como inserimos no Map
    const chartData = Array.from(dataMap.values());
    
    res.status(200).json(chartData);

  } catch (error) {
    console.error("Erro ao buscar dados do gráfico:", error);
    res.status(500).json({ error: 'Erro ao buscar dados do gráfico.' });
  }
});


// --- Rotas de Estoque (Existentes) ---
const productRoutes = require('./routes/product.routes.js');
const stockRoutes = require('./routes/stock.routes.js');
app.use('/api', authenticateToken, productRoutes);
app.use('/api', authenticateToken, stockRoutes);

// --- 6. INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 3001;
// Use o httpServer para o chat, não o app
httpServer.listen(PORT, () => {
  console.log(`Servidor HTTP e Socket.io rodando na porta ${PORT} - ${new Date().toLocaleString('pt-BR')}`);
});