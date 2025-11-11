import React from 'react';
import { NavLink } from 'react-router-dom';
import logoCardio from '../assets/images/logo_cardio.jpeg'; // A logo já está importada
import styles from './Sidebar.module.css';
import { 
  FaTachometerAlt, FaUserInjured, FaCalendarAlt, FaCoins, FaBoxes 
} from 'react-icons/fa';

const Sidebar = () => {
  return (
    <nav className={styles.sidebar}>
      {/* --- A MUDANÇA É AQUI --- */}
      <div className={styles.sidebarHeader}>
        {/* Trocamos o texto 'iCardio' pela sua imagem de logo */}
        <img src={logoCardio} alt="Logo iCardio" className={styles.logo} />
      </div>
      
      <ul className={styles.navList}>
        <li className={styles.navHeading}>Principal</li>
        
        <li>
          <NavLink to="/" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
            <FaTachometerAlt /> <span>Dashboard</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/pacientes" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
            <FaUserInjured /> <span>Pacientes</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/agenda" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
            <FaCalendarAlt /> <span>Agenda</span>
          </NavLink>
        </li>

        <li className={styles.navHeading}>Administrativo</li>

        {/* --- Seção Financeiro --- */}
        <li>
          <div className={styles.navLink}>
            <FaCoins /> <span>Financeiro</span>
          </div>
          <ul className={styles.submenu}>
            <li><NavLink to="/financeiro/VisaoGeral" className={({ isActive }) => isActive ? styles.activeSubLink : styles.subNavLink}>Visão Geral</NavLink></li>
            <li><NavLink to="/financeiro/ConfiguracoesFinanceiras" className={({ isActive }) => isActive ? styles.activeSubLink : styles.subNavLink}>Configurações Financeiras</NavLink></li>
            <li><NavLink to="/financeiro/Lancamentos" className={({ isActive }) => isActive ? styles.activeSubLink : styles.subNavLink}>Lançamentos</NavLink></li>
            <li><NavLink to="/financeiro/Orcamentos" className={({ isActive }) => isActive ? styles.activeSubLink : styles.subNavLink}>Orçamentos</NavLink></li>
          </ul>
        </li>
        
        {/* --- Seção Estoque --- */}
        <li>
          <div className={styles.navLink}>
            <FaBoxes /> <span>Estoque</span>
          </div>
          <ul className={styles.submenu}>
            <li><NavLink to="/estoque/produtos" className={({ isActive }) => isActive ? styles.activeSubLink : styles.subNavLink}>Produtos</NavLink></li>
            <li><NavLink to="/estoque/entrada" className={({ isActive }) => isActive ? styles.activeSubLink : styles.subNavLink}>Entrada de Estoque</NavLink></li>
            <li><NavLink to="/estoque/saida" className={({ isActive }) => isActive ? styles.activeSubLink : styles.subNavLink}>Saída de Estoque</NavLink></li>
          </ul>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar;