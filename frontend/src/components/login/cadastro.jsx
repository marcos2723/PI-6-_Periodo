import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// CORREÇÃO 1: Caminho correto da imagem (entrando na pasta images)
import logoImg from '../../assets/images/logo_cardio1.png'; 

// CORREÇÃO 2: Caminho do CSS na mesma pasta (./)
import '../Auth.css'; 

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [crm, setCrm] = useState('');
  const [role, setRole] = useState('Secretário'); 
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  
  // State para controlar se a imagem carrega ou não (igual ao login)
  const [imageError, setImageError] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!role) { setError("Selecione uma função."); return; }
    if (password !== confirmPassword) { setError("As senhas não coincidem."); return; }
    if (role === 'Médico' && !crm) { setError("CRM obrigatório para médicos."); return; }

    const userData = { name, email, phone, role, password, ...(role === 'Médico' && { crm }) };

    try {
      const response = await fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro no cadastro.');

      alert('Cadastro realizado! Faça login.');
      navigate('/login');

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        
        {/* CORREÇÃO 3: Adicionando a Logo visualmente aqui */}
        <div className="logo-container">
            {!imageError ? (
              <img 
                src={logoImg} 
                alt="CardioSystem" 
                className="logo-img"
                onError={() => setImageError(true)} 
              />
            ) : (
              <div className="fallback-logo">
                <h1>CardioSystem</h1>
              </div>
            )}
        </div>

        <h2>Criar Conta</h2>

        <form onSubmit={handleSubmit}>
          
          <div className="input-group">
            <label>Qual sua função?</label>
            <div className="role-selection">
              <button type="button" className={`role-btn ${role === 'Médico' ? 'active' : ''}`} onClick={() => setRole('Médico')}>
                Médico
              </button>
              <button type="button" className={`role-btn ${role === 'Secretário' ? 'active' : ''}`} onClick={() => setRole('Secretário')}>
                Secretário
              </button>
              <button type="button" className={`role-btn ${role === 'Administrativo' ? 'active' : ''}`} onClick={() => setRole('Administrativo')}>
                Admin
              </button>
            </div>
          </div>

          <div className="input-group">
            <label>Nome Completo</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="input-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="input-group">
            <label>Telefone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(XX) XXXXX-XXXX" />
          </div>

          {role === 'Médico' && (
            <div className="input-group">
              <label style={{color: '#830021'}}>CRM (Obrigatório)</label>
              <input type="text" value={crm} onChange={(e) => setCrm(e.target.value)} required style={{borderColor: '#830021'}} />
            </div>
          )}

          <div className="input-group">
            <label>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <div className="input-group">
            <label>Confirmar Senha</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>

          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="auth-button">
            Cadastrar
          </button>
        </form>

        <div className="auth-switch">
          Já tem conta? <Link to="/login">Faça login</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;