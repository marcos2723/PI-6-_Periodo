import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import logoCardio from '../assets/images/logo_cardio.png'; 
import styles from './Sidebar.module.css';
import { 
  FaTachometerAlt, 
  FaUserInjured, 
  FaCalendarAlt, 
  FaCoins, 
  FaBoxes, 
  FaUserMd,
  FaFileMedical,
  FaClipboardList,
  FaChevronDown, // Ícone seta para baixo
  FaChevronUp    // Ícone seta para cima
} from 'react-icons/fa';

const Sidebar = () => {
  // Estado para controlar quais menus estão abertos
  const [openMenus, setOpenMenus] = useState({
    financeiro: false,
    estoque: false
  });

  // Função para alternar (abrir/fechar)
  const toggleMenu = (menuKey) => {
    setOpenMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  return (
    <nav className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <img src={logoCardio} alt="Logo iCardio" className={styles.logo} />
      </div>
      
      <ul className={styles.navList}>
        <li className={styles.navHeading}>Principal</li>
        
        <li>
          <NavLink to="/" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
            <FaTachometerAlt /> <span>Tela Inicial</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/pacientes" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
            <FaUserInjured /> <span>Pacientes</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/cadastros/convenios" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
            <FaFileMedical/> <span>Convênios</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/agenda" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
            <FaCalendarAlt /> <span>Agenda</span>
          </NavLink>
        </li>

        <li className={styles.navHeading}>Administrativo</li>

        <li>
          <NavLink to="/medicos" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
            <FaUserMd /> <span>Médicos</span>
          </NavLink>
        </li>

        {/* --- Seção Financeiro (Com Toggle) --- */}
        <li>
          <div 
            className={styles.navLink} 
            onClick={() => toggleMenu('financeiro')}
            style={{ cursor: 'pointer', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <FaCoins /> <span>Financeiro</span>
            </div>
            {/* Mostra seta para cima se aberto, para baixo se fechado */}
            {openMenus.financeiro ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
          </div>

          {/* Só renderiza a lista se o estado for true */}
          {openMenus.financeiro && (
            <ul className={styles.submenu}>
              <li><NavLink to="/financeiro/VisaoGeral" className={({ isActive }) => isActive ? styles.activeSubLink : styles.subNavLink}>Visão Geral</NavLink></li>
              <li><NavLink to="/financeiro/ConfiguracoesFinanceiras" className={({ isActive }) => isActive ? styles.activeSubLink : styles.subNavLink}>Configurações</NavLink></li>
              <li><NavLink to="/financeiro/Lancamentos" className={({ isActive }) => isActive ? styles.activeSubLink : styles.subNavLink}>Lançamentos</NavLink></li>
              <li><NavLink to="/financeiro/Orcamentos" className={({ isActive }) => isActive ? styles.activeSubLink : styles.subNavLink}>Orçamentos</NavLink></li>
              <li>
                <NavLink to="/logs" className={({ isActive }) => isActive ? styles.activeSubLink : styles.subNavLink}>
                   <span style={{display: 'flex', alignItems: 'center', gap: '10px'}}><FaClipboardList /> Logs do Sistema</span>
                </NavLink>
              </li>
            </ul>
          )}
        </li>
        
        {/* --- Seção Estoque (Com Toggle) --- */}
        <li>
          <div 
            className={styles.navLink} 
            onClick={() => toggleMenu('estoque')}
            style={{ cursor: 'pointer', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <FaBoxes /> <span>Estoque</span>
            </div>
            {openMenus.estoque ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
          </div>

          {openMenus.estoque && (
            <ul className={styles.submenu}>
              <li><NavLink to="/estoque/produtos" className={({ isActive }) => isActive ? styles.activeSubLink : styles.subNavLink}>Produtos</NavLink></li>
              <li><NavLink to="/estoque/entrada" className={({ isActive }) => isActive ? styles.activeSubLink : styles.subNavLink}>Entrada</NavLink></li>
              <li><NavLink to="/estoque/saida" className={({ isActive }) => isActive ? styles.activeSubLink : styles.subNavLink}>Saída</NavLink></li>
            </ul>
          )}
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar;