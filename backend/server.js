// --- 1. IMPORTAÇÕES ---
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

// --- 4. MIDDLEWARE DE AUTENTICAÇÃO JWT ---
// Esta função verifica o token ANTES de deixar a requisição chegar nas rotas protegidas
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.status(401).json({ error: 'Token não fornecido.' });

  jwt.verify(token, process.env.JWT_SECRET, (err, userPayload) => {
    if (err) {
      console.error("Erro na verificação do token:", err);
      return res.status(403).json({ error: 'Token inválido ou expirado.' }); // 403 Forbidden
    }
    req.user = userPayload; // Guarda os dados do usuário (id, role) na requisição
    next(); // Passa para a próxima função (a rota em si)
  });
};

// --- 5. ROTAS DE DADOS PROTEGIDAS (API) ---

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
    const { name, phone } = req.body; // Apenas campos editáveis

    if (!name && !phone) {
        return res.status(400).json({ error: 'Nenhum dado fornecido para atualização.' });
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(name && { name }), // Atualiza o nome se foi fornecido
                ...(phone && { phone }), // Atualiza o telefone se foi fornecido
            },
            select: { id: true, email: true, name: true, phone: true, role: true, crm: true, createdAt: true }, // Retorna o usuário atualizado sem a senha
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
    const todayRevenue = totalAppointments * 250; // Lógica de faturamento exemplo

    const nextAppointments = await prisma.appointment.findMany({
      where: { date: { gte: new Date() } },
      orderBy: { date: 'asc' }, take: 5,
      include: { patient: { select: { name: true } } }
    });

    const dashboardData = {
      kpis: { totalAppointments, waitingCount, todayRevenue: todayRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
      nextAppointments: nextAppointments.map(a => ({...a, time: format(new Date(a.date), 'HH:mm')})),
      recentActivities: [], // A ser implementado
    };
    res.status(200).json(dashboardData);
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
  }
});

// ROTA PARA BUSCAR OS MÉDICOS (protegida)
app.get('/api/doctors', authenticateToken, async (req, res) => {
  try {
    const doctors = await prisma.user.findMany({ where: { role: 'Médico' }, select: { id: true, name: true } });
    res.status(200).json(doctors);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar médicos.' });
  }
});
 
// ROTA PARA BUSCAR OS AGENDAMENTOS (protegida)
app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: { patient: { select: { name: true } }, doctor: { select: { name: true } } },
      orderBy: { date: 'asc' } // Ordena por data
    });
    const formattedAppointments = appointments.map(app => ({
      id: app.id, title: `Consulta - ${app.patient.name} (${app.doctor.name})`, start: app.date,
      end: new Date(new Date(app.date).getTime() + 30 * 60000), resourceId: app.doctorId, status: app.status // Inclui o status
    }));
    res.status(200).json(formattedAppointments);
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos.' });
  }
});

// ROTA PARA BUSCAR TODOS OS PACIENTES (protegida)
app.get('/api/patients', authenticateToken, async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({ select: { id: true, name: true } });
    res.status(200).json(patients);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pacientes.' });
  }
});

// ROTA PARA CRIAR UM NOVO AGENDAMENTO (protegida)
app.post('/api/appointments', authenticateToken, async (req, res) => {
  const { patientId, doctorId, date, status } = req.body;
  if (!patientId || !doctorId || !date) return res.status(400).json({ error: 'Paciente, médico e data são obrigatórios.' });
  try {
    const newAppointment = await prisma.appointment.create({
      data: { patientId: parseInt(patientId), doctorId: parseInt(doctorId), date: new Date(date), status: status || 'Aguardando' },
      include: { patient: { select: { name: true } }, doctor: { select: { name: true } } } // Retorna dados formatados
    });
    // Formata a resposta para o calendário
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

// ROTA PARA DELETAR UM AGENDAMENTO (protegida)
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

// --- 6. INICIALIZAÇÃO DO SERVIDOR ---
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT} - ${new Date().toLocaleString('pt-BR')}`);
});

