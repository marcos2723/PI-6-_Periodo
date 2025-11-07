// frontend/src/components/Header.jsx

// --- MUDANÇA 1: Importar o useState e o jwtDecode ---
import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // Para ler o token
import { Link } from 'react-router-dom';
import styles from './header.module.css';
import {
  FaRegBell,
  FaUserCircle,
  FaCommentDots,
  FaCog,
  FaSignOutAlt,
} from 'react-icons/fa';

const Header = ({ onLogout }) => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // --- MUDANÇA 2: Criar um estado para guardar os dados do usuário ---
  const [userInfo, setUserInfo] = useState({ name: 'Carregando...', role: '...' });

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);

    // --- MUDANÇA 3: Lógica para ler o token ao carregar ---
    try {
      // 1. Pega o token do localStorage
      const token = localStorage.getItem('token');

      if (token) {
        // 2. Decodifica o token
        const decodedToken = jwtDecode(token);
        // O decodedToken terá: { userId, role, name, ... }

        // 3. Salva os dados no estado
        // Pega o nome completo, ex: "Marcos Paulo Gonçalves" ou "Davi Brito"
        const fullName = decodedToken.name || 'Usuário'; 

        // Pega apenas o primeiro nome (a primeira palavra antes de um espaço)
        const firstName = fullName.split(' ')[0]; 

        // Salva o primeiro nome e o papel
        setUserInfo({
          name: firstName, // Salvará "Marcos" ou "Davi"
          role: decodedToken.role,
        });
      } else {
        // Fallback se não achar o token
        setUserInfo({ name: 'Usuário', role: 'Offline' });
      }
    } catch (error) {
      console.error("Erro ao decodificar o token:", error);
      // Isso pode acontecer se o token for inválido ou expirado
      setUserInfo({ name: 'Erro', role: 'Token inválido' });
      // (Opcional) Você poderia chamar o onLogout() aqui
    }
    // --- Fim da Mudança 3 ---

    return () => clearInterval(timer);
  }, []); // O array vazio garante que isso rode apenas 1 vez (ao montar)

  return (
    <header className={styles.header}>
      {/* --- SEÇÃO ESQUERDA --- */}
      <div className={`${styles.headerSection} ${styles.leftSection}`}>
        <Link to="/perfil" className={styles.userProfile}>
          <FaUserCircle size={styles.userIcon} />
          <div className={styles.userInfo}>

            {/* --- MUDANÇA 4: Usar os dados do estado --- */}
            <strong>{userInfo.name}</strong>
            <small>{userInfo.role}</small>

          </div>
        </Link>
      </div>

      {/* --- SEÇÃO CENTRAL --- */}
      <div className={`${styles.headerSection} ${styles.centerSection}`}>
        <h3>iCardio</h3>
      </div>

      {/* --- SEÇÃO DIREITA (sem mudanças) --- */}
      <div className={`${styles.headerSection} ${styles.rightSection}`}>
        <div className={styles.dateTime}>
          <span>
            {currentDateTime.toLocaleDateString('pt-BR')} - {currentDateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <Link to="/chat" className={styles.actionIcon}>
          <FaCommentDots />
        </Link>
        <div className={styles.actionIcon}>
          <FaRegBell />
        </div>
        <div className={styles.actionIcon}>
          <FaCog />
        </div>
        <button onClick={onLogout} className={styles.logoutButton} title="Sair">
          <FaSignOutAlt />
        </button>
      </div>
    </header>
  );
};

export default Header;