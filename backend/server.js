// --- 1. IMPORTAÇÕES ---
require('dotenv').config(); // IMPORTANTE
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { format } = require('date-fns');

// --- 2. CONFIGURAÇÃO INICIAL ---
const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// --- 3. ROTAS DE AUTENTICAÇÃO ---
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

// Importando seu middleware de autenticação (verifique se o caminho está correto)
const { authenticateToken } = require('./middleware/auth.js'); 
// Importando suas rotas modulares (verifique se os caminhos estão corretos)
const productRoutes = require('./routes/product.routes.js');
const stockRoutes = require('./routes/stock.routes.js');

// ROTA PROTEGIDA PARA BUSCAR DADOS DO PERFIL
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

// ROTA PARA ATUALIZAR O PERFIL (também protegida)
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


// ROTA PARA BUSCAR DADOS DO DASHBOARD (também deve ser protegida)
app.get('/api/dashboard-data', authenticateToken, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    const totalAppointments = await prisma.appointment.count({
      where: { date: { gte: today, lt: tomorrow } },
    });
    const waitingCount = await prisma.appointment.count({
      where: { date: { gte: today, lt: tomorrow }, status: 'Chegou' },
    });
    const todayRevenue = totalAppointments * 250; 

    const nextAppointments = await prisma.appointment.findMany({
      where: { date: { gte: new Date() } },
      orderBy: { date: 'asc' }, take: 5,
      include: { patient: { select: { name: true } } }
    });

    const dashboardData = {
      kpis: { totalAppointments, waitingCount, todayRevenue: todayRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
      nextAppointments: nextAppointments.map(a => ({...a, time: format(new Date(a.date), 'HH:mm')})),
      recentActivities: [], 
    };
    res.status(200).json(dashboardData);
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
  }
});

// --- Rotas da Agenda ---

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


// --- NOVAS ROTAS DE PACIENTES (CRUD COMPLETO) ---

// GET: Buscar todos os pacientes (com busca)
app.get('/api/patients', authenticateToken, async (req, res) => {
  const { search } = req.query; // Pega o termo de busca da URL (ex: /api/patients?search=pablo)
  try {
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}; // Se não houver busca, a cláusula 'where' fica vazia

    const patients = await prisma.patient.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, phone: true } // Seleciona os campos que o frontend precisa
    });
    res.status(200).json(patients);
  } catch (error) {
    console.error("Erro ao buscar pacientes:", error);
    res.status(500).json({ error: 'Erro ao buscar pacientes.' });
  }
});

// POST: Criar um novo paciente
app.post('/api/patients', authenticateToken, async (req, res) => {
    const { name, email, phone } = req.body;
    if (!name || !email) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
    }
    try {
        // Verifica se o email já está em uso
        const existingPatient = await prisma.patient.findUnique({ where: { email } });
        if (existingPatient) {
            return res.status(409).json({ error: 'Este email já está cadastrado para outro paciente.' });
        }
        
        const newPatient = await prisma.patient.create({
            data: { name, email, phone },
        });
        res.status(201).json(newPatient);
    } catch (error) {
        console.error("Erro ao criar paciente:", error);
        res.status(500).json({ error: 'Erro ao criar paciente.' });
    }
});

// PUT: Atualizar um paciente existente
app.put('/api/patients/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
    }
    try {
        // Verifica se o novo email já pertence a OUTRO paciente
        const existingPatient = await prisma.patient.findUnique({ where: { email } });
        if (existingPatient && existingPatient.id !== parseInt(id)) {
            return res.status(409).json({ error: 'Este email já está cadastrado para outro paciente.' });
        }

        const updatedPatient = await prisma.patient.update({
            where: { id: parseInt(id) },
            data: { name, email, phone },
        });
        res.status(200).json(updatedPatient);
    } catch (error) {
        console.error("Erro ao atualizar paciente:", error);
        res.status(500).json({ error: 'Erro ao atualizar paciente.' });
    }
});

// DELETE: Deletar um paciente
app.delete('/api/patients/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        // Verifica se o paciente tem agendamentos futuros
        const appointments = await prisma.appointment.count({
            where: {
                patientId: parseInt(id),
                date: { gte: new Date() } // 'gte' = greater than or equal to (maior ou igual a)
            }
        });

        if (appointments > 0) {
            return res.status(409).json({ error: 'Este paciente não pode ser excluído pois possui agendamentos futuros.' });
        }
        
        // Se não tiver, deleta o paciente
        await prisma.patient.delete({
            where: { id: parseInt(id) },
        });
        res.status(204).send(); // Sucesso, sem conteúdo
    } catch (error) {
        console.error("Erro ao deletar paciente:", error);
        res.status(500).json({ error: 'Erro ao deletar paciente.' });
    }
});


// Suas rotas modulares de Estoque (exemplo)
app.use('/api', authenticateToken, productRoutes);
app.use('/api', authenticateToken, stockRoutes);

// --- 5. INICIALIZAÇÃO DO SERVIDOR ---
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT} - ${new Date().toLocaleString('pt-BR')}`);
});