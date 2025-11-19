import React, { useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode'; 
import { Link } from 'react-router-dom';
import styles from './header.module.css';
import {
  FaRegBell,
  FaUserCircle,
  FaCommentDots,
  FaCog,
  FaSignOutAlt,
} from 'react-icons/fa';

const Header = ({ title, onLogout }) => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [userInfo, setUserInfo] = useState({ name: 'Carregando...', role: '...', id: null });
  const [userPhoto, setUserPhoto] = useState(null);
  
  // Estados para controlar menus suspensos (ex: notificações)
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);

    try {
      const token = localStorage.getItem('token');
      if (token) {
        const decodedToken = jwtDecode(token);
        const fullName = decodedToken.name || 'Usuário'; 
        const firstName = fullName.split(' ')[0]; 

        setUserInfo({
          name: firstName,
          role: decodedToken.role,
          id: decodedToken.userId 
        });

        const savedImage = localStorage.getItem(`profileImage_${decodedToken.userId}`);
        if (savedImage) {
          setUserPhoto(savedImage);
        }
      } else {
        setUserInfo({ name: 'Visitante', role: 'Offline', id: null });
      }
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error);
      setUserInfo({ name: 'Erro', role: '...', id: null });
    }

    return () => clearInterval(timer);
  }, []);

  // Função para simular clique na notificação
  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    alert("Você clicou em notificações! (Funcionalidade futura)");
  };

  return (
    <header className={styles.header}>
      {/* --- SEÇÃO ESQUERDA (Perfil) --- */}
      <div className={`${styles.headerSection} ${styles.leftSection}`}>
        <Link to="/perfil" className={styles.userProfile}>
          <div className={styles.avatarContainer}>
            {userPhoto ? (
              <img 
                src={userPhoto} 
                alt="Foto de Perfil" 
                className={styles.headerProfilePic} 
              />
            ) : (
              <FaUserCircle className={styles.userIcon} />
            )}
          </div>
          <div className={styles.userInfo}>
            <strong>{userInfo.name}</strong>
            <small>{userInfo.role}</small>
          </div>
        </Link>
      </div>

      {/* --- SEÇÃO CENTRAL --- */}
      <div className={`${styles.headerSection} ${styles.centerSection}`}>
        <h3>iCardio</h3>
      </div>

      {/* --- SEÇÃO DIREITA --- */}
      <div className={`${styles.headerSection} ${styles.rightSection}`}>
        <div className={styles.dateTime}>
          <span>
            {currentDateTime.toLocaleDateString('pt-BR')} - {currentDateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* BOTÃO 1: CHAT (Agora é um Link) */}
        {/* Certifique-se de criar a rota /chat no App.jsx futuramente */}
        <Link to="/chat" className={styles.actionIcon} title="Mensagens">
          <FaCommentDots />
        </Link>

        {/* BOTÃO 2: NOTIFICAÇÕES (Agora é um botão clicável) */}
        <button onClick={handleNotificationClick} className={styles.actionIconButton} title="Notificações">
          <FaRegBell />
        </button>

        {/* BOTÃO 3: CONFIGURAÇÕES (Agora é um Link) */}
        {/* Certifique-se de criar a rota /configuracoes no App.jsx futuramente */}
        <Link to="/configuracoes" className={styles.actionIcon} title="Configurações">
          <FaCog />
        </Link>
        
        {/* BOTÃO 4: SAIR */}
        <button onClick={onLogout} className={styles.logoutButton} title="Sair">
          <FaSignOutAlt />
        </button>
      </div>
    </header>
  );
};

export default Header;