import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
      if (!response.ok) {
        throw new Error(data.error || 'Falha no login.');
      }

      localStorage.setItem('token', data.token);
      onLogin(); 
      navigate('/'); 

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#4c0013] p-4 font-sans">
      <div className="p-8 sm:p-10 bg-white rounded-2xl shadow-2xl w-full max-w-md text-center">
        <h2 className="text-3xl font-bold mb-8 text-gray-800">Login</h2>
        
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-5 text-left">
            <label htmlFor="email" className="block mb-2 font-medium text-gray-600">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#830021] focus:border-transparent transition"
            />
          </div>
          
          <div className="mb-6 text-left">
            <label htmlFor="password" className="block mb-2 font-medium text-gray-600">Senha</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#830021] focus:border-transparent transition"
            />
          </div>

          {error && <p className="text-red-600 mb-4 font-semibold">{error}</p>}
          
          <button
            type="submit"
            className="w-full py-3 border-none rounded-lg bg-[#830021] text-white text-lg font-semibold cursor-pointer transition-colors hover:bg-[#64000f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#830021]"
          >
            Entrar
          </button>
        </form>

        <p className="mt-8 text-gray-600">
          Não tem uma conta?{' '}
          <Link to="/cadastro" className="text-[#830021] font-semibold hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;