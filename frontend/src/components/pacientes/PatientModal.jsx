import React, { useState, useEffect } from 'react';
import styles from './PatientModal.module.css';
import { format } from 'date-fns'; // Usaremos para formatar a data

// --- DADOS INICIAIS PARA O FORMULÁRIO (PARA RESETAR) ---
const initialFormData = {
  name: '',
  email: '',
  phone: '',
  cpf: '',
  birthDate: '',
  gender: '',
  address: '',
  convenioId: 'particular', // Começa como 'Particular'
};

const PatientModal = ({ isOpen, onClose, onSave, patientData }) => {
  // Agora usamos um único estado para o formulário
  const [formData, setFormData] = useState(initialFormData);
  const [convenios, setConvenios] = useState([]); // Para o dropdown
  const [error, setError] = useState('');

  const isEditing = patientData && patientData.id;

  // --- EFEITO 1: BUSCAR OS CONVÊNIOS QUANDO O MODAL ABRIR ---
  useEffect(() => {
    // Só busca se o modal estiver aberto
    if (isOpen) {
      const fetchConvenios = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) throw new Error('Usuário não autenticado.');

          const res = await fetch('http://localhost:3001/api/convenios', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!res.ok) throw new Error('Falha ao buscar convênios');
          const data = await res.json();
          setConvenios(data);
        } catch (err) {
          setError(err.message);
        }
      };
      fetchConvenios();
    }
  }, [isOpen]); // Roda toda vez que o modal abre

  // --- EFEITO 2: PREENCHER O FORMULÁRIO PARA EDIÇÃO ---
  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        // Preenche com os dados do paciente
        setFormData({
          id: patientData.id,
          name: patientData.name || '',
          email: patientData.email || '',
          phone: patientData.phone || '',
          cpf: patientData.cpf || '',
          // Formata a data para o input type="date" (AAAA-MM-DD)
          birthDate: patientData.birthDate ? format(new Date(patientData.birthDate), 'yyyy-MM-dd') : '',
          gender: patientData.gender || '',
          address: patientData.address || '',
          convenioId: patientData.convenioId || 'particular',
        });
      } else {
        // Limpa o formulário para um novo paciente
        setFormData(initialFormData);
      }
      setError(''); // Limpa erros antigos
    }
  }, [patientData, isEditing, isOpen]);

  // Função genérica para atualizar o estado do formulário
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Lida com o envio do formulário
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setError('Nome Completo e Email são obrigatórios.');
      return;
    }
    setError('');
    
    // Envia TODOS os dados do formulário para o 'onSave' (no Pacientes.jsx)
    // O Pacientes.jsx vai formatar o convenioId e o birthDate antes de enviar à API
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{isEditing ? 'Editar Paciente' : 'Adicionar Novo Paciente'}</h2>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>
        
        {/* O formulário agora tem MAIS CAMPOS e é 2 colunas */}
        <form className={styles.modalBody} onSubmit={handleSubmit}>
          {error && <p className={styles.errorText}>{error}</p>}
          
          <div className={styles.formGrid}> 
            {/* Linha 1 */}
            <div className={`${styles.formGroup} ${styles.fullSpan}`}>
              <label htmlFor="name">Nome Completo *</label>
              <input
                type="text"
                id="name"
                name="name" // Adicionado 'name'
                value={formData.name}
                onChange={handleChange} // Atualizado
                required
              />
            </div>

            {/* Linha 2 */}
            <div className={styles.formGroup}>
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email" // Adicionado 'name'
                value={formData.email}
                onChange={handleChange} // Atualizado
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="phone">Telefone</label>
              <input
                type="tel"
                id="phone"
                name="phone" // Adicionado 'name'
                value={formData.phone}
                onChange={handleChange} // Atualizado
                placeholder="(XX) XXXXX-XXXX"
              />
            </div>

            {/* Linha 3 (Novos) */}
            <div className={styles.formGroup}>
              <label htmlFor="cpf">CPF</label>
              <input
                type="text"
                id="cpf"
                name="cpf"
                value={formData.cpf}
                onChange={handleChange}
                placeholder="000.000.000-00"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="birthDate">Data de Nascimento</label>
              <input
                type="date"
                id="birthDate"
                name="birthDate"
                value={formData.birthDate}
                onChange={handleChange}
              />
            </div>

            {/* Linha 4 (Novos) */}
            <div className={styles.formGroup}>
              <label htmlFor="gender">Gênero</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="" disabled>Selecione...</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
                <option value="NaoInformar">Não informar</option>
                <option value="Viado">Viado</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="convenioId">Convênio</label>
              <select
                id="convenioId"
                name="convenioId"
                value={formData.convenioId}
                onChange={handleChange}
              >
                <option value="particular">Particular</option>
                {/* Popula a lista de convênios buscada da API */}
                {convenios.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Linha 5 (Novo) */}
            <div className={`${styles.formGroup} ${styles.fullSpan}`}>
              <label htmlFor="address">Endereço</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Rua, Nº, Bairro, Cidade - UF"
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.saveButton}>
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientModal;