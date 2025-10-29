import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Componente de ícone para o 'check' na seleção de função
const CheckIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2212L9.9997 15.1709Z"></path>
  </svg>
);

// Componente principal do formulário de cadastro
const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [crm, setCrm] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validações
    if (!role) {
      setError("Por favor, selecione sua função.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem!");
      return;
    }
    if (role === 'Médico' && !crm) {
      setError("O campo CRM é obrigatório para médicos.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    const userData = { name, email, phone, role, password, ...(role === 'Médico' && { crm }) };

    try {
      const response = await fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ocorreu um erro no cadastro.');
      }

      alert('Cadastro realizado com sucesso! Você será redirecionado para o login.');
      navigate('/login');

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#4c0013] p-4 font-sans">
      <div className="p-8 sm:p-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg text-center">
        <h2 className="text-3xl font-bold mb-4 text-gray-800">Crie sua Conta</h2>
        <p className="text-gray-500 mb-8">Primeiro, selecione sua função.</p>

        <form onSubmit={handleSubmit} noValidate>
          {/* SELEÇÃO DE FUNÇÃO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <label
              htmlFor="medico"
              className={`relative flex flex-col items-center justify-center p-6 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                role === 'Médico' ? 'border-[#830021] bg-[#fde8ef]' : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <input type="radio" id="medico" name="role" value="Médico" onChange={(e) => setRole(e.target.value)} className="hidden" />
              <span className="text-lg font-semibold text-gray-700">Médico(a)</span>
              {role === 'Médico' && <CheckIcon className="w-6 h-6 text-white bg-[#830021] rounded-full p-1 absolute top-3 right-3" />}
            </label>
            <label
              htmlFor="secretario"
              className={`relative flex flex-col items-center justify-center p-6 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                role === 'Secretário' ? 'border-[#830021] bg-[#fde8ef]' : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <input type="radio" id="secretario" name="role" value="Secretário" onChange={(e) => setRole(e.target.value)} className="hidden" />
              <span className="text-lg font-semibold text-gray-700">Secretário(a)</span>
              {role === 'Secretário' && <CheckIcon className="w-6 h-6 text-white bg-[#830021] rounded-full p-1 absolute top-3 right-3" />}
            </label>
          </div>
          
          <div className={`transition-all duration-700 ease-in-out ${role ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <div className="mb-5 text-left">
              <label htmlFor="name" className="block mb-2 font-medium text-gray-600">Nome Completo</label>
              <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#830021] focus:border-transparent transition" />
            </div>
            
            <div className="mb-5 text-left">
              <label htmlFor="email" className="block mb-2 font-medium text-gray-600">Email</label>
              <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#830021] focus:border-transparent transition" />
            </div>
            
            <div className="mb-5 text-left">
              <label htmlFor="phone" className="block mb-2 font-medium text-gray-600">Telefone</label>
              <input type="tel" id="phone" placeholder="(XX) XXXXX-XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#830021] focus:border-transparent transition" />
            </div>

            {role === 'Médico' && (
              <div className="mb-5 text-left transition-opacity duration-500">
                <label htmlFor="crm" className="block mb-2 font-medium text-gray-600">CRM</label>
                <input type="text" id="crm" value={crm} onChange={(e) => setCrm(e.target.value)} required className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#830021] focus:border-transparent transition" />
              </div>
            )}
            
            <div className="mb-5 text-left">
              <label htmlFor="password"className="block mb-2 font-medium text-gray-600">Senha</label>
              <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#830021] focus:border-transparent transition" />
            </div>

            <div className="mb-6 text-left">
              <label htmlFor="confirmPassword"className="block mb-2 font-medium text-gray-600">Confirmar Senha</label>
              <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#830021] focus:border-transparent transition" />
            </div>

            {error && <p className="text-red-600 mb-4 font-semibold">{error}</p>}
            
            <button type="submit" className="w-full py-3 border-none rounded-lg bg-[#830021] text-white text-lg font-semibold cursor-pointer transition-colors hover:bg-[#64000f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#830021] disabled:bg-gray-400 disabled:cursor-not-allowed" disabled={!role}>
              Cadastrar
            </button>
          </div>
        </form>

        <p className="mt-8 text-gray-600">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-[#830021] font-semibold hover:underline">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;