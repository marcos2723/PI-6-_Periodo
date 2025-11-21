// --- 1. IMPORTAÇÕES ---
require('dotenv').config();
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const cron = require('node-cron');
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { format } = require('date-fns');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- MIDDLEWARE AUTH ---
const { authenticateToken } = require('./middleware/auth.js'); 

// --- IMPORTAÇÃO DAS ROTAS DE ESTOQUE ---
const productRoutes = require('./routes/product.routes.js');
const stockRoutes = require('./routes/stock.routes.js');

// --- 2. CONFIGURAÇÃO INICIAL ---
const prisma = new PrismaClient();
const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"], 
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// --- 2.1 CONFIGURAÇÃO DO UPLOAD ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.params.id || 'temp'}-${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage: storage });
app.use('/uploads', express.static('uploads'));

// --- FUNÇÃO AUXILIAR LOGS ---
const createLog = async (userId, action, details) => {
  try {
    if (!userId) return;
    await prisma.systemLog.create({ data: { userId, action, details } });
  } catch (e) { console.error("Erro log:", e); }
};

// --- ROTA LOGS ---
app.get('/api/logs', authenticateToken, async (req, res) => {
  try {
    const logs = await prisma.systemLog.findMany({
      take: 100, orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, role: true } } }
    });
    res.status(200).json(logs);
  } catch (error) { res.status(500).json({ error: 'Erro ao buscar logs.' }); }
});

// =================================================================
//                      MÓDULO CHAT (SOCKET.IO)
// =================================================================
const userSocketMap = {};
io.on('connection', (socket) => {
  let userPayload;
  try {
    const token = socket.handshake.auth.token;
    if (!token) throw new Error("Token ausente");
    userPayload = jwt.verify(token, process.env.JWT_SECRET);
    userSocketMap[userPayload.userId] = socket.id;
  } catch (err) { socket.disconnect(true); return; }

  socket.on('get:message:history', async ({ otherUserId }) => {
    const myId = userPayload.userId;
    const messages = await prisma.chatMessage.findMany({
      where: { OR: [{ senderId: myId, receiverId: otherUserId }, { senderId: otherUserId, receiverId: myId }] },
      orderBy: { createdAt: 'asc' }, include: { sender: { select: { name: true } } }
    });
    socket.emit('message:history', messages);
  });

  socket.on('send:message', async ({ receiverId, content }) => {
    const senderId = userPayload.userId;
    try {
      const message = await prisma.chatMessage.create({
        data: { senderId, receiverId: parseInt(receiverId), content },
        include: { sender: { select: { name: true } } }
      });
      const receiverSocketId = userSocketMap[receiverId];
      if (receiverSocketId) io.to(receiverSocketId).emit('receive:message', message);
      socket.emit('receive:message', message);
    } catch (err) { console.error(err); }
  });

  socket.on('disconnect', () => {
    if (userPayload) delete userSocketMap[userPayload.userId];
  });
});

// =================================================================
//                      AUTENTICAÇÃO & PERFIL
// =================================================================

// --- ROTA DE REGISTRO CORRIGIDA ---
app.post('/api/register', async (req, res) => {
  const { name, email, password, role, crm, phone } = req.body;
  
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Faltam dados obrigatórios." });
  }

  // Validação extra de segurança para médicos
  if (role === 'Médico' && !crm) {
    return res.status(400).json({ error: "CRM é obrigatório para médicos." });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ error: "Email em uso." });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: { 
        name, 
        email, 
        password: hashedPassword, 
        role, 
        crm: role === 'Médico' ? crm : null, 
        phone 
      },
    });

    res.status(201).json({ message: 'Criado', userId: user.id });
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor.' }); 
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Inválido' });
    const token = jwt.sign({ userId: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.status(200).json({ token });
  } catch (error) { res.status(500).json({ error: 'Erro interno.' }); }
});

// CONFIGURAÇÕES
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    let settings = await prisma.clinicSettings.findFirst();
    if (!settings) settings = await prisma.clinicSettings.create({ data: { clinicName: 'Minha Clínica', openTime: '08:00', closeTime: '18:00' } });
    res.status(200).json(settings);
  } catch (error) { res.status(500).json({ error: 'Erro config.' }); }
});

app.put('/api/settings', authenticateToken, async (req, res) => {
  const { clinicName, cnpj, phone, address, email, openTime, closeTime } = req.body;
  try {
    const existing = await prisma.clinicSettings.findFirst();
    if (!existing) return res.status(404).json({ error: "Config não encontrada." });
    const updated = await prisma.clinicSettings.update({
      where: { id: existing.id },
      data: { clinicName, cnpj, phone, address, email, openTime, closeTime }
    });
    res.status(200).json(updated);
  } catch (error) { res.status(500).json({ error: 'Erro update config.' }); }
});

// PERFIL
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { id: true, email: true, name: true, phone: true, role: true, crm: true, createdAt: true } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.status(200).json(user);
  } catch (e) { res.status(500).json({ error: 'Erro perfil.' }); }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  const { name, phone } = req.body;
  try {
    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: { ...(name && { name }), ...(phone && { phone }) },
      select: { id: true, name: true, phone: true }
    });
    await createLog(req.user.userId, 'Atualizou Perfil', 'Dados cadastrais');
    res.status(200).json(updated);
  } catch (e) { res.status(500).json({ error: 'Erro update perfil.' }); }
});

// =================================================================
//                      DASHBOARD & ROTAS BÁSICAS
// =================================================================
app.get('/api/dashboard-data', authenticateToken, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const now = new Date();

    const totalAppointments = await prisma.appointment.count({ where: { date: { gte: today, lt: tomorrow } } });
    const waitingCount = await prisma.appointment.count({ where: { date: { gte: now, lt: tomorrow }, status: 'Chegou' } });
    const rev = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'RECEITA', status: 'Pago', date: { gte: today, lt: tomorrow } } });
    const nextApps = await prisma.appointment.findMany({ where: { date: { gte: now } }, orderBy: { date: 'asc' }, take: 2, include: { patient: {select:{name:true}}, doctor: {select:{name:true}} } });
    const recent = await prisma.appointment.findMany({ where: { date: { gte: today, lt: now } }, orderBy: { date: 'desc' }, take: 5, include: { patient: {select:{name:true}} } });

    res.status(200).json({
      kpis: { totalAppointments, waitingCount, todayRevenue: (rev._sum.amount||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
      nextAppointments: nextApps.map(a => ({...a, time: format(new Date(a.date), 'HH:mm')})),
      recentActivities: recent,
    });
  } catch (e) { res.status(500).json({ error: 'Erro dashboard.' }); }
});

app.get('/api/users', authenticateToken, async (req, res) => {
  try { res.json(await prisma.user.findMany({ where: { id: { not: req.user.userId } }, select: { id: true, name: true, role: true } })); } catch(e) { res.status(500).json({error:'Erro'}); }
});

app.get('/api/doctors', authenticateToken, async (req, res) => {
  try { res.json(await prisma.user.findMany({ where: { role: 'Médico' }, select: { id: true, name: true } })); } catch(e) { res.status(500).json({error:'Erro'}); }
});

// =================================================================
//                      AGENDA & PACIENTES
// =================================================================
app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const apps = await prisma.appointment.findMany({ include: { patient: true, doctor: true, service: true }, orderBy: { date: 'asc' } });
    res.status(200).json(apps.map(a => ({
      id: a.id, title: `${a.service?.name || 'Consulta'} - ${a.patient.name}`, start: a.date, end: new Date(new Date(a.date).getTime() + 30*60000), resourceId: a.doctorId, status: a.status, serviceId: a.serviceId 
    })));
  } catch (e) { res.status(500).json({ error: 'Erro agenda.' }); }
});

app.post('/api/appointments', authenticateToken, async (req, res) => {
  const { patientId, doctorId, date, status, serviceId } = req.body;
  if (!patientId || !doctorId || !date) return res.status(400).json({ error: 'Incompleto.' });
  try {
    const newApp = await prisma.appointment.create({
      data: { patientId: parseInt(patientId), doctorId: parseInt(doctorId), date: new Date(date), status: status || 'Aguardando', serviceId: serviceId ? parseInt(serviceId) : null },
      include: { patient: true }
    });
    await createLog(req.user.userId, 'Agendou Consulta', newApp.patient.name);
    res.status(201).json(newApp);
  } catch (e) { res.status(500).json({ error: 'Erro criar.' }); }
});

app.delete('/api/appointments/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.appointment.delete({ where: { id } });
    res.status(204).send();
  } catch (e) { res.status(500).json({ error: 'Erro deletar.' }); }
});

app.get('/api/patients', authenticateToken, async (req, res) => {
  const { search } = req.query;
  try {
    const where = search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { cpf: { contains: search } }] } : {};
    res.json(await prisma.patient.findMany({ where, orderBy: { name: 'asc' }, include: { convenio: true } }));
  } catch (e) { res.status(500).json({ error: 'Erro pacientes.' }); }
});

app.get('/api/patients/:id/history', authenticateToken, async (req, res) => {
  try {
    const pid = parseInt(req.params.id);
    await prisma.appointment.updateMany({ where: { patientId: pid, date: { lt: new Date() }, status: 'Aguardando' }, data: { status: 'Finalizado' } });
    const hist = await prisma.appointment.findMany({ where: { patientId: pid }, include: { doctor: true, service: true, attachments: true }, orderBy: { date: 'desc' } });
    res.json(hist.map(h => ({ id: h.id, date: h.date, doctorName: h.doctor.name, serviceName: h.service?.name, status: h.status, attachments: h.attachments })));
  } catch (e) { res.status(500).json({ error: 'Erro histórico.' }); }
});

app.post('/api/appointments/:id/upload', authenticateToken, upload.array('files'), async (req, res) => {
  try {
    const aid = parseInt(req.params.id);
    if(!req.files?.length) return res.status(400).json({error:'Sem arquivos'});
    const atts = await Promise.all(req.files.map(f => prisma.attachment.create({ data: { fileName: f.originalname, filePath: f.filename, appointmentId: aid } })));
    await createLog(req.user.userId, 'Upload Exame', `Anexou ${req.files.length} arquivos.`);
    res.status(201).json(atts);
  } catch (e) { res.status(500).json({ error: 'Erro upload.' }); }
});

app.delete('/api/attachments/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const att = await prisma.attachment.findUnique({ where: { id } });
    if(att) {
      const fp = path.join(__dirname, 'uploads', att.filePath);
      if(fs.existsSync(fp)) fs.unlinkSync(fp);
      await prisma.attachment.delete({ where: { id } });
    }
    res.status(204).send();
  } catch (e) { res.status(500).json({ error: 'Erro delete anexo.' }); }
});

// --- ROTAS DE PACIENTES COM TRATAMENTO DE ERRO MELHORADO ---

app.post('/api/patients', authenticateToken, async (req, res) => {
  const { name, email, phone, cpf, birthDate, gender, address, convenioId, convenioNumber, convenioValidity } = req.body;
  try {
    const p = await prisma.patient.create({
      data: { name, email, phone, cpf, gender, address, birthDate: birthDate?new Date(birthDate):null, convenioId: convenioId?parseInt(convenioId):null, convenioNumber: convenioNumber || null,
      convenioValidity: convenioValidity ? new Date(convenioValidity) : null }
    });
    await createLog(req.user.userId, 'Novo Paciente', p.name);
    res.status(201).json(p);
  } catch (e) { 
    console.error("Erro detalhado:", e);
    // TRATAMENTO DE ERRO P2002 (DUPLICIDADE)
    if (e.code === 'P2002') {
      const campo = e.meta?.target ? e.meta.target.join(', ') : 'Email ou CPF';
      return res.status(409).json({ error: `Já existe um paciente com este ${campo}.` });
    }
    res.status(500).json({ error: 'Erro ao criar paciente.' }); 
  }
});

app.put('/api/patients/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, cpf, birthDate, gender, address, convenioId, convenioNumber, convenioValidity } = req.body;
  try {
    const p = await prisma.patient.update({
      where: { id: parseInt(id) },
      data: { name, email, phone, cpf, gender, address, birthDate: birthDate?new Date(birthDate):null, convenioId: convenioId?parseInt(convenioId):null, convenioNumber: convenioNumber || null,
      convenioValidity: convenioValidity ? new Date(convenioValidity) : null
     }
    });
    await createLog(req.user.userId, 'Editou Paciente', p.name);
    res.status(200).json(p);
  } catch (e) { 
    console.error("Erro detalhado:", e);
    if (e.code === 'P2002') {
        const campo = e.meta?.target ? e.meta.target.join(', ') : 'Email ou CPF';
        return res.status(409).json({ error: `Já existe outro paciente com este ${campo}.` });
      }
    res.status(500).json({ error: 'Erro update.' }); 
  }
});

app.delete('/api/patients/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const count = await prisma.appointment.count({ where: { patientId: id, date: { gte: new Date() } } });
    if(count > 0) return res.status(409).json({error: 'Agendamentos futuros'});
    await prisma.appointment.deleteMany({ where: { patientId: id } });
    await prisma.budget.deleteMany({ where: { patientId: id } });
    await prisma.transaction.deleteMany({ where: { patientId: id } });
    await prisma.patient.delete({ where: { id } });
    await createLog(req.user.userId, 'Excluiu Paciente', `ID: ${id}`);
    res.status(204).send();
  } catch (e) { res.status(500).json({ error: 'Erro delete.' }); }
});

app.get('/api/doctors-stats', authenticateToken, async (req, res) => {
  try {
    const d = new Date(), fd = new Date(d.getFullYear(), d.getMonth(), 1), ld = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const docs = await prisma.user.findMany({
      where: { role: 'Médico' },
      select: { id: true, name: true, crm: true, _count: { select: { appointmentsAsDoctor: { where: { date: { gte: fd, lte: ld }, status: 'Finalizado' } } } } }
    });
    res.json(docs.map(d => ({ ...d, consultationsMonth: d._count.appointmentsAsDoctor })));
  } catch (e) { res.status(500).json({ error: 'Erro stats.' }); }
});

app.get('/api/doctors/:id/history', authenticateToken, async (req, res) => {
  try {
    const h = await prisma.appointment.findMany({ where: { doctorId: parseInt(req.params.id) }, take: 7, orderBy: { date: 'desc' }, include: { patient: true, service: true } });
    res.json(h.map(x => ({ id: x.id, date: x.date, patientName: x.patient.name, serviceName: x.service?.name, status: x.status })));
  } catch (e) { res.status(500).json({ error: 'Erro hist.' }); }
});

// =================================================================
//                      FINANCEIRO
// =================================================================
app.get('/api/services', authenticateToken, async (req, res) => {
  try { res.json(await prisma.service.findMany({ orderBy: { name: 'asc' } })); } catch(e) { res.status(500).json({error:'Erro'}); }
});
app.post('/api/services', authenticateToken, async (req, res) => {
  const { name, price, description } = req.body;
  try { 
    const s = await prisma.service.create({ data: { name, price: parseFloat(price), description } }); 
    await createLog(req.user.userId, 'Novo Serviço', name); res.status(201).json(s);
  } catch(e) { res.status(500).json({error:'Erro'}); }
});

// --- CONVÊNIOS (NOVO CRUD COMPLETO) ---
app.get('/api/convenios', authenticateToken, async (req, res) => {
  try {
    const convenios = await prisma.convenio.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { patients: true } } } });
    res.status(200).json(convenios);
  } catch (error) { res.status(500).json({ error: 'Erro ao buscar convênios.' }); }
});

app.post('/api/convenios', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório.' });
  try {
    const existing = await prisma.convenio.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    if (existing) return res.status(409).json({ error: `Convênio "${existing.name}" já existe.` });
    const newC = await prisma.convenio.create({ data: { name } });
    await createLog(req.user.userId, 'Novo Convênio', name);
    res.status(201).json(newC);
  } catch (error) { res.status(500).json({ error: 'Erro ao criar.' }); }
});

app.delete('/api/convenios/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const patCount = await prisma.patient.count({ where: { convenioId: id } });
    const transCount = await prisma.transaction.count({ where: { convenioId: id } });
    if (patCount > 0 || transCount > 0) return res.status(409).json({ error: 'Convênio em uso por pacientes ou financeiro.' });
    await prisma.convenio.delete({ where: { id } });
    await createLog(req.user.userId, 'Excluiu Convênio', `ID: ${id}`);
    res.status(204).send();
  } catch (error) { res.status(500).json({ error: 'Erro ao excluir.' }); }
});

app.get('/api/convenios/:id/patients', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const patients = await prisma.patient.findMany({
      where: { convenioId: id },
      select: { id: true, name: true, cpf: true, phone: true, email: true },
      orderBy: { name: 'asc' }
    });
    res.status(200).json(patients);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pacientes do convênio.' });
  }
});

app.get('/api/transactions', authenticateToken, async (req, res) => {
  const { type, status } = req.query;
  try {
    const where = {}; if(type) where.type = type; if(status) where.status = status;
    res.json(await prisma.transaction.findMany({ where, orderBy: { date: 'desc' }, include: { patient: {select:{name:true}}, service: {select:{name:true}} } }));
  } catch(e) { res.status(500).json({error:'Erro'}); }
});

app.post('/api/transactions', authenticateToken, async (req, res) => {
  const { description, amount, type, paymentMethod, status, patientId, serviceId } = req.body;
  try {
    const t = await prisma.transaction.create({
      data: { description, amount: Math.abs(parseFloat(amount)), type, paymentMethod, status, patientId: patientId ? parseInt(patientId) : null, serviceId: serviceId ? parseInt(serviceId) : null, userId: req.user.userId }
    });
    await createLog(req.user.userId, 'Financeiro', `${type}: ${description}`);
    res.status(201).json(t);
  } catch(e) { res.status(500).json({error:'Erro'}); }
});

app.get('/api/financial-summary', authenticateToken, async (req, res) => {
  try {
    const r = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'RECEITA', status: 'Pago' } });
    const e = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'DESPESA', status: 'Pago' } });
    const p = await prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'RECEITA', status: 'Pendente' } });
    res.json({ totalRevenue: r._sum.amount||0, totalExpenses: e._sum.amount||0, netIncome: (r._sum.amount||0)-(e._sum.amount||0), pendingReceivables: p._sum.amount||0 });
  } catch(e) { res.status(500).json({error:'Erro'}); }
});

app.get('/api/financial-chart-data', authenticateToken, async (req, res) => {
  try {
    const d30 = new Date(); d30.setDate(d30.getDate()-30);
    const t = await prisma.transaction.findMany({ where: { status: 'Pago', date: { gte: d30 } } });
    const map = new Map();
    for(let i=29; i>=0; i--) { const d = new Date(); d.setDate(d.getDate()-i); map.set(format(d, 'dd/MM'), { name: format(d, 'dd/MM'), Receita: 0, Despesa: 0 }); }
    t.forEach(x => {
      const k = format(new Date(x.date), 'dd/MM');
      if(map.has(k)) x.type==='RECEITA' ? map.get(k).Receita += x.amount : map.get(k).Despesa += x.amount;
    });
    res.json(Array.from(map.values()));
  } catch(e) { res.status(500).json({error:'Erro'}); }
});

app.get('/api/budgets', authenticateToken, async (req, res) => {
  try { res.json(await prisma.budget.findMany({ orderBy: { date: 'desc' }, include: { patient: {select:{name:true}}, lines: {include:{service:true}} } })); } catch(e) { res.status(500).json({error:'Erro'}); }
});

app.post('/api/budgets', authenticateToken, async (req, res) => {
  const { patientId, status, lines } = req.body;
  try {
    const total = lines.reduce((a, b) => a + (b.quantity * b.unitPrice), 0);
    const b = await prisma.budget.create({
      data: { patientId: parseInt(patientId), userId: req.user.userId, status: status||'Pendente', total, lines: { create: lines.map(l => ({ serviceId: parseInt(l.serviceId), quantity: parseInt(l.quantity), unitPrice: parseFloat(l.unitPrice) })) } }, include: { patient: true }
    });
    await createLog(req.user.userId, 'Orçamento', `R$ ${total}`);
    res.status(201).json(b);
  } catch(e) { res.status(500).json({error:'Erro'}); }
});

// --- ESTOQUE ---
app.use('/api', productRoutes);
app.use('/api', stockRoutes);

// =================================================================
//                      BACKUP & RESTAURAÇÃO (ZIP)
// =================================================================

// 1. FAZER BACKUP (DOWNLOAD ZIP - MANUAL)
app.get('/api/backup/download', authenticateToken, async (req, res) => {
  try {
    const fileName = `backup-completo-${format(new Date(), 'dd-MM-yyyy-HHmm')}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    const uploadDir = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadDir)) archive.directory(uploadDir, 'uploads');

    const dbData = {
      metadata: { timestamp: new Date(), version: '2.0', type: 'FULL_BACKUP' },
      settings: await prisma.clinicSettings.findFirst(),
      users: await prisma.user.findMany(),
      services: await prisma.service.findMany(),
      products: await prisma.product.findMany(),
      convenios: await prisma.convenio.findMany(),
      patients: await prisma.patient.findMany(),
      stockLots: await prisma.stockLot.findMany(),
      appointments: await prisma.appointment.findMany(),
      attachments: await prisma.attachment.findMany(),
      transactions: await prisma.transaction.findMany(),
      budgets: await prisma.budget.findMany(),
      budgetLines: await prisma.budgetLine.findMany(),
      stockMovements: await prisma.stockMovement.findMany(),
    };

    archive.append(JSON.stringify(dbData, null, 2), { name: 'database.json' });
    await archive.finalize();
    await createLog(req.user.userId, 'Backup Completo', 'ZIP gerado');

  } catch (error) {
    console.error("Erro backup:", error);
    res.status(500).end();
  }
});

// 2. RESTAURAR BACKUP (UPLOAD ZIP)
app.post('/api/backup/restore', authenticateToken, upload.single('backupFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Envie um arquivo .zip' });

    const zip = new AdmZip(req.file.path);
    const zipEntries = zip.getEntries();

    const dbEntry = zipEntries.find(entry => entry.entryName === 'database.json');
    if (!dbEntry) throw new Error('database.json não encontrado no ZIP.');

    const dbData = JSON.parse(dbEntry.getData().toString('utf8'));
    zip.extractEntryTo("uploads/", path.join(__dirname), true, true);

    // LIMPEZA E RECRIAÇÃO (Transação)
    await prisma.$transaction(async (tx) => {
      // Limpar (Ordem Inversa)
      await tx.systemLog.deleteMany();
      await tx.chatMessage.deleteMany();
      await tx.stockMovement.deleteMany();
      await tx.stockLot.deleteMany();
      await tx.budgetLine.deleteMany();
      await tx.budget.deleteMany();
      await tx.transaction.deleteMany();
      await tx.attachment.deleteMany();
      await tx.appointment.deleteMany();
      await tx.patient.deleteMany();
      await tx.convenio.deleteMany();
      await tx.product.deleteMany();
      await tx.service.deleteMany();
      await tx.clinicSettings.deleteMany();
      await tx.user.deleteMany();

      // Inserir
      if(dbData.users?.length) await tx.user.createMany({ data: dbData.users });
      if(dbData.settings) await tx.clinicSettings.create({ data: dbData.settings });
      if(dbData.services?.length) await tx.service.createMany({ data: dbData.services });
      if(dbData.products?.length) await tx.product.createMany({ data: dbData.products });
      if(dbData.convenios?.length) await tx.convenio.createMany({ data: dbData.convenios });
      if(dbData.patients?.length) await tx.patient.createMany({ data: dbData.patients });
      if(dbData.stockLots?.length) await tx.stockLot.createMany({ data: dbData.stockLots });
      if(dbData.appointments?.length) await tx.appointment.createMany({ data: dbData.appointments });
      if(dbData.attachments?.length) await tx.attachment.createMany({ data: dbData.attachments });
      if(dbData.transactions?.length) await tx.transaction.createMany({ data: dbData.transactions });
      if(dbData.budgets?.length) await tx.budget.createMany({ data: dbData.budgets });
      if(dbData.budgetLines?.length) await tx.budgetLine.createMany({ data: dbData.budgetLines });
      if(dbData.stockMovements?.length) await tx.stockMovement.createMany({ data: dbData.stockMovements });
    });

    fs.unlinkSync(req.file.path);
    res.status(200).json({ message: 'Restaurado com sucesso.' });

  } catch (error) {
    console.error("Erro restore:", error);
    res.status(500).json({ error: 'Erro na restauração: ' + error.message });
  }
});


// =================================================================
//             TAREFAS AUTOMÁTICAS (JOBS)
// =================================================================

// Job 1: Limpar Consultas Vencidas
const checkExpiredAppointments = async () => {
  try {
    await prisma.appointment.updateMany({ where: { date: { lt: new Date() }, status: 'Aguardando' }, data: { status: 'Finalizado' } });
  } catch (error) { console.error("Job erro:", error); }
};
setInterval(checkExpiredAppointments, 60000);
checkExpiredAppointments();

// Job 2: Backup Automático Diário (PRODUÇÃO)
const runBackupNow = async () => {
  console.log('⚡ [AutoBackup] Iniciando backup diário...');
  try {
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
    const uploadDir = path.join(__dirname, 'uploads');

    const fileName = `backup-auto-${format(new Date(), 'dd-MM-yyyy-HHmm')}.zip`;
    const filePath = path.join(backupDir, fileName);
    const output = fs.createWriteStream(filePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => console.log(`✅ [AutoBackup] Salvo: ${fileName}`));
    archive.on('error', (err) => console.error('❌ [AutoBackup] Erro:', err));
    archive.pipe(output);

    if (fs.existsSync(uploadDir)) archive.directory(uploadDir, 'uploads');
    
    const dbData = {
      metadata: { timestamp: new Date(), type: 'AUTO_BACKUP' },
      settings: await prisma.clinicSettings.findFirst(),
      users: await prisma.user.findMany(),
      services: await prisma.service.findMany(),
      products: await prisma.product.findMany(),
      convenios: await prisma.convenio.findMany(),
      patients: await prisma.patient.findMany(),
      stockLots: await prisma.stockLot.findMany(),
      appointments: await prisma.appointment.findMany(),
      attachments: await prisma.attachment.findMany(),
      transactions: await prisma.transaction.findMany(),
      budgets: await prisma.budget.findMany(),
      budgetLines: await prisma.budgetLine.findMany(),
      stockMovements: await prisma.stockMovement.findMany(),
    };
    archive.append(JSON.stringify(dbData, null, 2), { name: 'database.json' });
    await archive.finalize();

    // Limpeza de Backups Antigos (> 7 arquivos)
    const files = fs.readdirSync(backupDir);
    const sortedFiles = files.map(file => ({
      name: file,
      time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
    })).sort((a, b) => b.time - a.time);

    if (sortedFiles.length > 7) {
      for (let i = 7; i < sortedFiles.length; i++) {
        fs.unlinkSync(path.join(backupDir, sortedFiles[i].name));
      }
    }

  } catch (error) { console.error("❌ [AutoBackup] Falha crítica:", error); }
};

// AGENDAMENTO: MEIA NOITE (00:00) TODO DIA
cron.schedule('0 0 * * *', () => {
  runBackupNow();
});

// =================================================================
//                      INICIALIZAÇÃO
// =================================================================
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Servidor HTTP e Socket.io rodando na porta ${PORT} - ${new Date().toLocaleString('pt-BR')}`);
});