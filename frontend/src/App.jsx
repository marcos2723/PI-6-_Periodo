import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// --- 1. IMPORTAÇÕES ---
// Páginas de Autenticação
import LoginPage from './components/login/login.jsx';
import Cadastro from './components/login/cadastro.jsx';

// Componentes do Layout Principal
import Sidebar from './components/Sidebar.jsx';
import Header from './components/header.js';

// Páginas do Sistema
import Profile from './components/profile.jsx';
import Dashboard from './components/Dashboard.jsx';
import Agenda from './components/Agenda.js';
import Pacientes from './components/Pacientes.js';
import VisaoGeral from './components/Financeiro/VisaoGeral.js';
import ContasPagar from './components/Financeiro/ContasPagar.js';
import Movimentacao from './components/Financeiro/Movimentacao.js';
import ContasReceber from './components/Financeiro/ContasReceber.js';
import Orcamentos from './components/Financeiro/Orcamentos.js';
import Recibos from './components/Financeiro/Recibos.js';
import Produtos from './components/estoque/Produtos.js';
import Entrada from './components/estoque/Entrada.js';
import Saida from './components/estoque/Saida.js';

// Estilos globais
import './App.css'; 

// --- 2. LAYOUT PRINCIPAL DO SISTEMA ---
const MainLayout = ({ onLogout }) => (
  <div className="app-container">
    <Sidebar />
    <main className="content-area">
      <Routes>
        <Route path="/" element={<><Header onLogout={onLogout} /><Dashboard /></>} />
        <Route path="/agenda" element={<><Header onLogout={onLogout} /><Agenda /></>} />
        <Route path="/pacientes" element={<><Header onLogout={onLogout} /><Pacientes /></>} />
        <Route path="/perfil" element={<><Header onLogout={onLogout} /><Profile /></>} />
        <Route path="/cadastro" element={<><Header onLogout={onLogout} /><Cadastro /></>} />
        <Route path="/login" element={<><Header onLogout={onLogout} /><LoginPage /></>} />
        
        {/* Rotas do Financeiro */}
        <Route path="/financeiro/visao-geral" element={<><Header onLogout={onLogout} /><VisaoGeral /></>} />
        <Route path="/financeiro/contas-a-pagar" element={<><Header onLogout={onLogout} /><ContasPagar /></>} />
        <Route path="/financeiro/movimentacao" element={<><Header onLogout={onLogout} /><Movimentacao /></>} />
        <Route path="/financeiro/contas-a-receber" element={<><Header onLogout={onLogout} /><ContasReceber /></>} />
        <Route path="/financeiro/orcamentos" element={<><Header onLogout={onLogout} /><Orcamentos /></>} />
        <Route path="/financeiro/recibos" element={<><Header onLogout={onLogout} /><Recibos /></>} />

        {/* Rotas do Estoque */}
        <Route path="/estoque/produtos" element={<><Header onLogout={onLogout} /><Produtos /></>} />
        <Route path="/estoque/entrada" element={<><Header onLogout={onLogout} /><Entrada /></>} />
        <Route path="/estoque/saida" element={<><Header onLogout={onLogout} /><Saida /></>} />
      </Routes>
    </main>
  </div>
);

// --- 3. COMPONENTE PRINCIPAL APP ---
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
          <>
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </>
        ) : (
          <Route path="/*" element={<MainLayout onLogout={handleLogout} />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;