import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../Auth.css'; // Ajustado para mesma pasta (./)
import logoImg from '../../assets/images/logo_cardio1.png'; // CAMINHO CORRIGIDO

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha no login.');

      localStorage.setItem('token', data.token);
      onLogin(); 
      navigate('/'); 

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        
        {/* LOGO */}
        <div className="logo-container">
            {!imageError ? (
              <img 
                src={logoImg} // Usando a variável importada
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

        <h2>Login</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="password">Senha</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••"
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="auth-button">
            Entrar
          </button>
        </form>

        <div className="auth-switch">
          Não tem uma conta? <Link to="/cadastro">Cadastre-se</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;