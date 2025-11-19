import React, { useState, useEffect } from 'react';
import styles from './configuracoes.module.css';
import { FaSave, FaClinicMedical, FaClock, FaDatabase } from 'react-icons/fa';

const Configuracoes = () => {
  const [formData, setFormData] = useState({
    clinicName: '',
    cnpj: '',
    phone: '',
    address: '',
    email: '',
    openTime: '',
    closeTime: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Busca as configurações ao carregar
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3001/api/settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Falha ao carregar configurações');
        const data = await response.json();
        setFormData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Falha ao salvar configurações');
      
      setSuccessMsg('Configurações salvas com sucesso!');
      // Remove a mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccessMsg(''), 3000);
      
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="page-content"><p>Carregando...</p></div>;

  return (
    <div className="page-content">
      <div className={styles.header}>
        <h2>Configurações do Sistema</h2>
      </div>

      <form onSubmit={handleSave} className={styles.configForm}>
        
        {/* Seção 1: Dados da Clínica */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <FaClinicMedical /> <h3>Dados da Clínica</h3>
          </div>
          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label>Nome da Clínica</label>
              <input type="text" name="clinicName" value={formData.clinicName || ''} onChange={handleChange} />
            </div>
            <div className={styles.formGroup}>
              <label>CNPJ</label>
              <input type="text" name="cnpj" value={formData.cnpj || ''} onChange={handleChange} placeholder="00.000.000/0000-00" />
            </div>
            <div className={styles.formGroup}>
              <label>Telefone</label>
              <input type="text" name="phone" value={formData.phone || ''} onChange={handleChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Email de Contato</label>
              <input type="email" name="email" value={formData.email || ''} onChange={handleChange} />
            </div>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label>Endereço Completo</label>
              <input type="text" name="address" value={formData.address || ''} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Seção 2: Horários e Funcionamento */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <FaClock /> <h3>Horário de Atendimento</h3>
          </div>
          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label>Abertura</label>
              <input type="time" name="openTime" value={formData.openTime || ''} onChange={handleChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Fechamento</label>
              <input type="time" name="closeTime" value={formData.closeTime || ''} onChange={handleChange} />
            </div>
            <div className={`${styles.formGroup} ${styles.infoText}`}>
              <small>Estes horários definem o início e fim da visualização na agenda.</small>
            </div>
          </div>
        </div>

        {/* Seção 3: Dados e Backup (Visual apenas) */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <FaDatabase /> <h3>Dados e Backup</h3>
          </div>
          <div className={styles.backupContainer}>
            <p>Exporte todos os dados do sistema (pacientes, agendamentos, financeiro) para um arquivo seguro.</p>
            <button type="button" className={styles.backupButton} onClick={() => alert('Funcionalidade de backup será implementada em breve!')}>
              Fazer Backup Agora
            </button>
          </div>
        </div>

        {/* Mensagens de Feedback */}
        {error && <p className={styles.errorMessage}>{error}</p>}
        {successMsg && <p className={styles.successMessage}>{successMsg}</p>}

        {/* Botão Salvar Fixo ou no Final */}
        <div className={styles.footerActions}>
          <button type="submit" className={styles.saveButton}>
            <FaSave /> Salvar Alterações
          </button>
        </div>

      </form>
    </div>
  );
};

export default Configuracoes;