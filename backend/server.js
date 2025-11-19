// --- 1. IMPORTAÇÕES ---
require('dotenv').config();
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
    origin: "http://localhost:3000", // Frontend
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// --- 3. MIDDLEWARES ---
const { authenticateToken } = require('./middleware/auth.js'); 

// Importação de Rotas Modulares
const productRoutes = require('./routes/product.routes.js');
const stockRoutes = require('./routes/stock.routes.js');


// =================================================================
//                      MÓDULO CHAT (SOCKET.IO)
// =================================================================
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
    if (userPayload) {
      console.log(`[Socket.io] Usuário desconectado: ${userPayload.name}`);
      delete userSocketMap[userPayload.userId];
    }
  });
});


// =================================================================
//                      MÓDULO AUTENTICAÇÃO & PERFIL
// =================================================================

app.post('/api/register', async (req, res) => {
  const { name, email, password, role, crm, phone } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: "Campos obrigatórios faltando." });
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ error: "Email já em uso." });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role, crm: role === 'Médico' ? crm : null, phone },
    });
    res.status(201).json({ message: 'Usuário criado!', userId: user.id });
  } catch (error) {
    console.error("Erro registro:", error);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const token = jwt.sign({ userId: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.status(200).json({ token });
  } catch (error) {
    console.error("Erro login:", error);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const userProfile = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, name: true, phone: true, role: true, crm: true, createdAt: true },
    });
    if (!userProfile) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.status(200).json(userProfile);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  const { name, phone } = req.body;
  if (!name && !phone) return res.status(400).json({ error: 'Nenhum dado para atualizar.' });
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: { ...(name && { name }), ...(phone && { phone }) },
      select: { id: true, email: true, name: true, phone: true, role: true, crm: true },
    });
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});


// =================================================================
//                      MÓDULO DASHBOARD
// =================================================================

app.get('/api/dashboard-data', authenticateToken, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const now = new Date();

    const totalAppointments = await prisma.appointment.count({ where: { date: { gte: today, lt: tomorrow } } });
    const waitingCount = await prisma.appointment.count({ where: { date: { gte: now, lt: tomorrow }, status: 'Chegou' } });
    
    // Receita do dia (baseada em transações financeiras pagas)
    const revenueResult = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: 'RECEITA', status: 'Pago', date: { gte: today, lt: tomorrow } }
    });
    const todayRevenue = revenueResult._sum.amount || 0;

    const nextAppointments = await prisma.appointment.findMany({
      where: { date: { gte: now } },
      orderBy: { date: 'asc' }, take: 2,
      include: { patient: { select: { name: true } }, doctor: { select: { name: true } } }
    });

    const recentActivities = await prisma.appointment.findMany({
      where: { date: { gte: today, lt: now } },
      orderBy: { date: 'desc' }, take: 5,
      include: { patient: { select: { name: true } } }
    });

    res.status(200).json({
      kpis: { totalAppointments, waitingCount, todayRevenue: todayRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
      nextAppointments: nextAppointments.map(a => ({...a, time: format(new Date(a.date), 'HH:mm')})),
      recentActivities,
    });
  } catch (error) {
    console.error("Erro dashboard:", error);
    res.status(500).json({ error: 'Erro interno.' });
  }
});


// =================================================================
//                      MÓDULO AGENDA & CHAT (USUÁRIOS)
// =================================================================

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { id: { not: req.user.userId } },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
});

app.get('/api/doctors', authenticateToken, async (req, res) => {
  try {
    const doctors = await prisma.user.findMany({ where: { role: 'Médico' }, select: { id: true, name: true } });
    res.status(200).json(doctors);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar médicos.' });
  }
});

app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: { patient: { select: { name: true } }, doctor: { select: { name: true } },service: { select: { name: true }} },
      orderBy: { date: 'asc' }
    });
    const formattedAppointments = appointments.map(app => ({
      id: app.id, 
      // Título formatado: "Consulta - Paciente (Médico) - [Serviço]"
      title: `${app.service ? app.service.name : 'Consulta'} - ${app.patient.name} (${app.doctor.name})`, 
      start: app.date,
      end: new Date(new Date(app.date).getTime() + 30 * 60000), 
      resourceId: app.doctorId, 
      status: app.status,
      serviceId: app.serviceId // <-- Envia o ID para o frontend saber qual é
    }));
    res.status(200).json(formattedAppointments);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar agendamentos.' });
  }
});

app.post('/api/appointments', authenticateToken, async (req, res) => {
  // Recebemos 'serviceId' do corpo
  const { patientId, doctorId, date, status, serviceId } = req.body;
  
  if (!patientId || !doctorId || !date) return res.status(400).json({ error: 'Dados incompletos.' });

  const appointmentDate = new Date(date);
  const now = new Date();
  now.setMinutes(now.getMinutes() - 1);
  if (appointmentDate < now) return res.status(400).json({ error: 'Não é possível agendar no passado.' });

  try {
    const newApp = await prisma.appointment.create({
      data: { 
        patientId: parseInt(patientId), 
        doctorId: parseInt(doctorId), 
        date: new Date(date), 
        status: status || 'Aguardando',
        // Salva o serviço se ele foi enviado
        serviceId: serviceId ? parseInt(serviceId) : null 
      },
      include: { patient: { select: { name: true } }, doctor: { select: { name: true } } }
    });
    
    // Resposta simplificada (o frontend vai recarregar a lista de qualquer forma)
    res.status(201).json(newApp);
  } catch (error) {
    console.error("Erro criar agendamento:", error);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

app.delete('/api/appointments/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.appointment.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar.' });
  }
});


// =================================================================
//                      MÓDULO PACIENTES (CRUD)
// =================================================================

app.get('/api/patients', authenticateToken, async (req, res) => {
  const { search } = req.query;
  try {
    const whereClause = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search } }
      ]
    } : {};
    const patients = await prisma.patient.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: { convenio: { select: { name: true } } } // Inclui nome do convênio
    });
    res.status(200).json(patients);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pacientes.' });
  }
});

app.get('/api/patients/:id', authenticateToken, async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { convenio: { select: { id: true, name: true } } }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado.' });
    res.status(200).json(patient);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar paciente.' });
  }
});

app.post('/api/patients', authenticateToken, async (req, res) => {
  const { name, email, phone, cpf, birthDate, gender, address, convenioId } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
  try {
    const existing = await prisma.patient.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email já cadastrado.' });
    if (cpf) {
        const existingCpf = await prisma.patient.findUnique({ where: { cpf } });
        if (existingCpf) return res.status(409).json({ error: 'CPF já cadastrado.' });
    }

    const newPatient = await prisma.patient.create({
      data: {
        name, email, phone, cpf, gender, address,
        birthDate: birthDate ? new Date(birthDate) : null,
        convenioId: (convenioId && !isNaN(parseInt(convenioId))) ? parseInt(convenioId) : null
      },
    });
    res.status(201).json(newPatient);
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Dado duplicado (Email ou CPF).' });
    res.status(500).json({ error: 'Erro ao criar paciente.' });
  }
});

app.put('/api/patients/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, cpf, birthDate, gender, address, convenioId } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
  try {
    // (Validações de duplicidade simplificadas para brevidade, o Prisma P2002 pega a maioria)
    const updatedPatient = await prisma.patient.update({
      where: { id: parseInt(id) },
      data: {
        name, email, phone, cpf, gender, address,
        birthDate: birthDate ? new Date(birthDate) : null,
        convenioId: (convenioId && !isNaN(parseInt(convenioId))) ? parseInt(convenioId) : null
      },
    });
    res.status(200).json(updatedPatient);
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Email ou CPF já em uso por outro paciente.' });
    res.status(500).json({ error: 'Erro ao atualizar.' });
  }
});

app.delete('/api/patients/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const appointments = await prisma.appointment.count({ where: { patientId: parseInt(id), date: { gte: new Date() } } });
    if (appointments > 0) return res.status(409).json({ error: 'Paciente tem agendamentos futuros.' });
    
    // Limpa dados relacionados antes de deletar (ou use Cascade no Prisma)
    await prisma.appointment.deleteMany({ where: { patientId: parseInt(id) } });
    await prisma.budget.deleteMany({ where: { patientId: parseInt(id) } });
    await prisma.transaction.deleteMany({ where: { patientId: parseInt(id) } });
    
    await prisma.patient.delete({ where: { id: parseInt(id) } });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao deletar.' });
  }
});


// =================================================================
//                      MÓDULO FINANCEIRO
// =================================================================

// 1. Serviços
app.get('/api/services', authenticateToken, async (req, res) => {
  try {
    const services = await prisma.service.findMany({ orderBy: { name: 'asc' } });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar serviços.' });
  }
});
app.post('/api/services', authenticateToken, async (req, res) => {
  const { name, price, description } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Nome e preço obrigatórios.' });
  try {
    const newService = await prisma.service.create({ data: { name, price: parseFloat(price), description: description || null } });
    res.status(201).json(newService);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar serviço.' });
  }
});

// 2. Convênios
app.get('/api/convenios', authenticateToken, async (req, res) => {
  try {
    const convenios = await prisma.convenio.findMany({ orderBy: { name: 'asc' } });
    res.status(200).json(convenios);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar convênios.' });
  }
});

// 3. Transações (Livro Caixa)
app.get('/api/transactions', authenticateToken, async (req, res) => {
  const { type, status } = req.query;
  const whereClause = {};
  if (type) whereClause.type = type;
  if (status) whereClause.status = status;
  try {
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: { patient: { select: { name: true } }, service: { select: { name: true } } }
    });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar transações.' });
  }
});

app.post('/api/transactions', authenticateToken, async (req, res) => {
  const { description, amount, type, paymentMethod, status, patientId, serviceId } = req.body;
  if (!description || !amount || !type || !status) return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  try {
    const newTransaction = await prisma.transaction.create({
      data: {
        description, amount: Math.abs(parseFloat(amount)), type, paymentMethod, status,
        patientId: patientId ? parseInt(patientId) : null,
        serviceId: serviceId ? parseInt(serviceId) : null,
        userId: req.user.userId
      }
    });
    res.status(201).json(newTransaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar transação.' });
  }
});

// 4. Resumo Financeiro (Visão Geral)
app.get('/api/financial-summary', authenticateToken, async (req, res) => {
  try {
    const totalRevenue = await prisma.transaction.aggregate({
      _sum: { amount: true }, where: { type: 'RECEITA', status: 'Pago' }
    });
    const totalExpenses = await prisma.transaction.aggregate({
      _sum: { amount: true }, where: { type: 'DESPESA', status: 'Pago' }
    });
    const pendingReceivables = await prisma.transaction.aggregate({
      _sum: { amount: true }, where: { type: 'RECEITA', status: 'Pendente' }
    });
    
    const rev = totalRevenue._sum.amount || 0;
    const exp = totalExpenses._sum.amount || 0;

    res.status(200).json({
      totalRevenue: rev,
      totalExpenses: exp,
      netIncome: rev - exp,
      pendingReceivables: pendingReceivables._sum.amount || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar resumo.' });
  }
});

// 5. Gráfico Financeiro
app.get('/api/financial-chart-data', authenticateToken, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Busca Transações
    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'Pago',
        date: { gte: thirtyDaysAgo }
      }
    });

    // Processamento (Agrupar por dia)
    const dataMap = new Map();
    // Inicializa os últimos 30 dias com zero
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = format(d, 'dd/MM');
      dataMap.set(key, { name: key, Receita: 0, Despesa: 0 });
    }

    // Preenche com dados reais
    transactions.forEach(t => {
      const key = format(new Date(t.date), 'dd/MM');
      if (dataMap.has(key)) {
        const entry = dataMap.get(key);
        if (t.type === 'RECEITA') entry.Receita += t.amount;
        else if (t.type === 'DESPESA') entry.Despesa += t.amount;
      }
    });

    res.status(200).json(Array.from(dataMap.values()));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro no gráfico.' });
  }
});

// 6. Orçamentos
app.get('/api/budgets', authenticateToken, async (req, res) => {
  try {
    const budgets = await prisma.budget.findMany({
      orderBy: { date: 'desc' },
      include: { patient: { select: { name: true } }, lines: { include: { service: { select: { name: true } } } } }
    });
    res.status(200).json(budgets);
  } catch (error) {
    res.status(500).json({ error: 'Erro orçamentos.' });
  }
});

app.post('/api/budgets', authenticateToken, async (req, res) => {
  const { patientId, status, lines } = req.body;
  if (!patientId || !lines || lines.length === 0) return res.status(400).json({ error: 'Dados inválidos.' });
  try {
    let total = lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
    const budget = await prisma.budget.create({
      data: {
        patientId: parseInt(patientId),
        userId: req.user.userId,
        status: status || 'Pendente',
        total,
        lines: {
          create: lines.map(line => ({
            serviceId: parseInt(line.serviceId),
            quantity: parseInt(line.quantity),
            unitPrice: parseFloat(line.unitPrice)
          }))
        }
      },
      include: { patient: { select: { name: true } } }
    });
    res.status(201).json(budget);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro criar orçamento.' });
  }
});


// =================================================================
//                      MÓDULO ESTOQUE
// =================================================================
// (As rotas de estoque e produto estão em arquivos separados)
app.use('/api', productRoutes);
app.use('/api', stockRoutes);


// =================================================================
//                      INICIALIZAÇÃO
// =================================================================
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Servidor HTTP e Socket.io rodando na porta ${PORT} - ${new Date().toLocaleString('pt-BR')}`);
});