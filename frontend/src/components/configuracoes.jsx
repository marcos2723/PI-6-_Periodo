import React, { useState, useEffect, useRef } from 'react';
import styles from './configuracoes.module.css';
import { FaSave, FaClinicMedical, FaClock, FaDatabase, FaCheckCircle, FaExclamationCircle, FaFileImport, FaFileExport } from 'react-icons/fa';

const Configuracoes = () => {
  // Estados do Formulário
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
  const [status, setStatus] = useState({ type: '', message: '' });

  // Referência para o input de arquivo (Restore)
  const fileInputRef = useRef(null);

  // --- MÁSCARAS ---
  const maskCNPJ = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const maskPhone = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d)(\d{4})$/, '$1-$2');
  };

  // --- CARREGAMENTO INICIAL ---
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
        setStatus({ type: 'error', message: 'Erro ao carregar dados: ' + err.message });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // --- HANDLERS DE FORMULÁRIO ---
  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'cnpj') value = maskCNPJ(value);
    if (name === 'phone') value = maskPhone(value);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    
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

      if (!response.ok) throw new Error('Falha ao salvar');
      
      setStatus({ type: 'success', message: 'Configurações salvas com sucesso!' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
      
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    }
  };

  // --- FUNÇÃO 1: EXPORTAR BACKUP (DOWNLOAD ZIP) ---
  const handleBackup = async () => {
    try {
      setStatus({ type: 'success', message: 'Gerando backup completo (Dados + Arquivos)...' });
      
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/backup/download', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao baixar backup');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Salva como .ZIP
      a.download = `backup-clinica-${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStatus({ type: 'success', message: 'Download do backup iniciado!' });
      setTimeout(() => setStatus({ type: '', message: '' }), 4000);

    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Falha ao gerar backup.' });
    }
  };

  // --- FUNÇÃO 2: IMPORTAR BACKUP (RESTORE ZIP) ---
  
  // 2a. Aciona o input file escondido
  const handleRestoreClick = () => {
    fileInputRef.current.click();
  };

  // 2b. Processa o arquivo selecionado
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Confirmação crítica
    const confirmacao = window.confirm(
      "⚠️ ATENÇÃO CRÍTICA ⚠️\n\n" +
      "Você está prestes a restaurar um backup.\n" +
      "Isso irá APAGAR TODOS os dados e arquivos atuais e substituí-los pelo conteúdo do backup.\n\n" +
      "Deseja continuar?"
    );

    if (!confirmacao) {
      event.target.value = ''; // Limpa o input
      return;
    }

    const formDataUpload = new FormData();
    formDataUpload.append('backupFile', file);

    setLoading(true); // Bloqueia a tela

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/backup/restore', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataUpload
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro na restauração');

      setStatus({ type: 'success', message: 'Sistema restaurado com sucesso! Reiniciando...' });
      
      // Força logout após 3 segundos para evitar inconsistência de dados
      setTimeout(() => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }, 3000);

    } catch (err) {
      setLoading(false);
      setStatus({ type: 'error', message: 'Erro fatal na restauração: ' + err.message });
      event.target.value = '';
    }
  };


  if (loading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner}></div>
      <p>Processando...</p>
    </div>
  );

  return (
    <div className="page-content fade-in">
      <div className={styles.pageHeader}>
        <div>
          <h2>Configurações do Sistema</h2>
          <p className={styles.subtitle}>Gerencie os dados institucionais e preferências da clínica.</p>
        </div>
      </div>

      {/* Toast de Notificação */}
      {status.message && (
        <div className={`${styles.toast} ${styles[status.type]}`}>
          {status.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
          <span>{status.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className={styles.configForm}>
        
        {/* Card 1: Identidade */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}><FaClinicMedical /></div>
            <div>
              <h3>Identidade da Clínica</h3>
              <small>Informações que aparecerão em cabeçalhos e receitas.</small>
            </div>
          </div>
          
          <div className={styles.grid}>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label>Nome Comercial</label>
              <input type="text" name="clinicName" value={formData.clinicName || ''} onChange={handleChange} placeholder="Ex: iCardio Clínica Especializada" />
            </div>
            <div className={styles.formGroup}>
              <label>CNPJ</label>
              <input type="text" name="cnpj" value={formData.cnpj || ''} onChange={handleChange} placeholder="00.000.000/0000-00" maxLength="18" />
            </div>
            <div className={styles.formGroup}>
              <label>Telefone / WhatsApp</label>
              <input type="text" name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="(00) 00000-0000" maxLength="15" />
            </div>
            <div className={styles.formGroup}>
              <label>Email Oficial</label>
              <input type="email" name="email" value={formData.email || ''} onChange={handleChange} placeholder="contato@icardio.com.br" />
            </div>
            <div className={styles.formGroup}>
              <label>Endereço Completo</label>
              <input type="text" name="address" value={formData.address || ''} onChange={handleChange} placeholder="Rua, Número, Bairro, Cidade - UF" />
            </div>
          </div>
        </div>

        {/* Card 2: Funcionamento */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}><FaClock /></div>
            <div>
              <h3>Jornada de Trabalho</h3>
              <small>Define a grade visual da agenda dos médicos.</small>
            </div>
          </div>
          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label>Horário de Abertura</label>
              <input type="time" name="openTime" value={formData.openTime || ''} onChange={handleChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Horário de Fechamento</label>
              <input type="time" name="closeTime" value={formData.closeTime || ''} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Card 3: Backup e Restauração */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox}><FaDatabase /></div>
            <div>
              <h3>Backup e Segurança</h3>
              <small>Exporte seus dados ou restaure o sistema a partir de um arquivo.</small>
            </div>
          </div>
          
          {/* Container dividido para as ações */}
          <div className={styles.backupGrid} style={{ display: 'flex', gap: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
            
            {/* Coluna Esquerda: Exportar */}
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#198754', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaFileExport /> Exportar Dados
              </h4>
              <p style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '1rem' }}>
                Gera um arquivo ZIP contendo todos os dados do banco e as imagens dos pacientes.
              </p>
              <button type="button" className={styles.outlineButton} onClick={handleBackup}>
                Fazer Backup Completo
              </button>
            </div>

            {/* Divisória Visual */}
            <div style={{ width: '1px', background: '#dee2e6' }}></div>

            {/* Coluna Direita: Importar */}
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaFileImport /> Restaurar Sistema
              </h4>
              <p style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '1rem' }}>
                Substitui os dados atuais por um arquivo de backup ZIP. <strong>Cuidado: irreversível.</strong>
              </p>
              <button 
                type="button" 
                className={styles.outlineButton} 
                style={{ borderColor: '#dc3545', color: '#dc3545' }}
                onClick={handleRestoreClick}
              >
                Selecionar Arquivo ZIP
              </button>
              
              {/* Input escondido */}
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".zip" // Aceita apenas ZIP
                onChange={handleFileChange} 
              />
            </div>

          </div>
        </div>

        <div className={styles.floatingFooter}>
          <button type="submit" className={styles.saveButton}>
            <FaSave /> Salvar Alterações
          </button>
        </div>

      </form>
    </div>
  );
};

export default Configuracoes;