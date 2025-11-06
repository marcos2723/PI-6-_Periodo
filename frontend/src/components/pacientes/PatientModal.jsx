import React, { useState, useEffect } from 'react';
import styles from './PatientModal.module.css';

const PatientModal = ({ isOpen, onClose, onSave, patientData }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  // Verifica se estamos editando (se 'patientData' foi passado)
  const isEditing = patientData && patientData.id;

  // Efeito para preencher o formulário quando 'patientData' muda
  useEffect(() => {
    if (isEditing) {
      setName(patientData.name || '');
      setEmail(patientData.email || '');
      setPhone(patientData.phone || '');
    } else {
      // Limpa o formulário se for para adicionar novo
      setName('');
      setEmail('');
      setPhone('');
    }
    setError(''); // Limpa erros ao abrir o modal
  }, [patientData, isEditing]);

  // Lida com o envio do formulário
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) {
      setError('O nome é obrigatório.');
      return;
    }
    setError('');
    
    // Envia os dados para a função 'onSave' (que está no Pacientes.jsx)
    onSave({
      id: isEditing ? patientData.id : undefined,
      name,
      email,
      phone,
    });
  };

  if (!isOpen) return null; // Não renderiza nada se o modal estiver fechado

  return (
    // Overlay do modal (fundo escuro)
    <div className={styles.modalOverlay} onClick={onClose}>
      {/* Conteúdo do modal (caixa branca) */}
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{isEditing ? 'Editar Paciente' : 'Adicionar Novo Paciente'}</h2>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>
        <form className={styles.modalBody} onSubmit={handleSubmit}>
          {error && <p className={styles.errorText}>{error}</p>}
          
          <div className={styles.formGroup}>
            <label htmlFor="name">Nome Completo *</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="phone">Telefone</label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
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