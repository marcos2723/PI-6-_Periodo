// frontend/iCardio/src/components/Header.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './header.module.css';
import {
  FaRegBell,
  FaUserCircle,
  FaCommentDots,
  FaCog,
  FaSignOutAlt,
} from 'react-icons/fa';

// O Header agora só precisa da função onLogout
const Header = ({ onLogout }) => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className={styles.header}>
      {/* --- SEÇÃO ESQUERDA --- */}
      <div className={`${styles.headerSection} ${styles.leftSection}`}>
        {/* Ícone do perfil movido para cá */}
        <Link to="/perfil" className={styles.userProfile}>
          <FaUserCircle size={32} />
          <div className={styles.userInfo}>
            <strong>Dr. Ricardo</strong>
            <small>Cardiologista</small>
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
        <div className={styles.actionIcon}>
          <FaCommentDots />
        </div>
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