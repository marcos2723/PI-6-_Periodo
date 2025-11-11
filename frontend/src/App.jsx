import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// --- 1. IMPORTAÇÕES ---
import LoginPage from './components/login/login.jsx';
import Cadastro from './components/login/cadastro.jsx';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/header.js';
import Profile from './components/profile.jsx';
import Dashboard from './components/Dashboard.jsx';
import Agenda from './components/agenda/Agenda.jsx';
import Pacientes from './components/pacientes/Pacientes.jsx';
import VisaoGeral from './components/Financeiro/VisaoGeral.jsx';
import ContasPagar from './components/Financeiro/Lancamentos.jsx';
import Movimentacao from './components/Financeiro/ConfiguracoesFinanceiras.jsx';
import Orcamentos from './components/Financeiro/Orcamentos.jsx';
import Produtos from './components/estoque/Produtos.js';
import Entrada from './components/estoque/Entrada.js';
import Saida from './components/estoque/Saida.js';
import ChatPage from './components/chat/ChatPage.jsx'; // --- NOVO: Importa a página de Chat ---

// Estilos globais
import './App.css'; 
import ConfiguracoesFinanceiras from './components/Financeiro/ConfiguracoesFinanceiras.jsx';

// --- 2. LAYOUT PRINCIPAL DO SISTEMA (PRIVADO) ---
const MainLayout = ({ onLogout }) => (
  <div className="app-container">
    <Sidebar />
    <main className="content-area">
      <Header onLogout={onLogout} /> 
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/pacientes" element={<Pacientes />} />
        <Route path="/perfil" element={<Profile />} />
        
        {/* Rotas do Financeiro */}
        <Route path="/financeiro/VisaoGeral" element={<VisaoGeral />} />
        <Route path="/financeiro/ConfiguracoesFinanceiras" element={<ConfiguracoesFinanceiras />} />
        <Route path="/financeiro/Orcamentos" element={<Orcamentos />} />
        <Route path="/financeiro/Lancamentos" element={<ContasPagar />} />

        {/* Rotas do Estoque */}
        <Route path="/estoque/produtos" element={<Produtos />} />
        <Route path="/estoque/entrada" element={<Entrada />} />
        <Route path="/estoque/saida" element={<Saida />} />
        
        <Route path="/chat" element={<ChatPage />} /> {/* --- NOVO: Registra a rota de Chat --- */}
      </Routes>
    </main>
  </div>
);

// --- 3. COMPONENTE PRINCIPAL APP (CONTROLA O ACESSO) ---
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  const handleLogin = () => setIsAuthenticated(true);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <Routes>
        {!isAuthenticated ? (
          // --- ROTAS PÚBLICAS (Se não estiver logado) ---
          <>
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </>
        ) : (
          // --- ROTAS PRIVADAS (Se estiver logado) ---
          <Route path="/*" element={<MainLayout onLogout={handleLogout} />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;