import React, { useState, useEffect } from 'react';
import styles from './PatientModal.module.css';
import { format } from 'date-fns'; 

const initialFormData = {
  name: '',
  email: '',
  phone: '',
  cpf: '',
  birthDate: '',
  gender: '',
  address: '',
  convenioId: 'particular', // Valor padrão
  convenioNumber: '',
  convenioValidity: '',
};

// RECEBE A LISTA DE CONVÊNIOS DO PAI (conveniosList)
const PatientModal = ({ isOpen, onClose, onSave, patientData, conveniosList = [] }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState('');

  const isEditing = patientData && patientData.id;

  // PREENCHE O FORMULÁRIO AO ABRIR
  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        setFormData({
          id: patientData.id,
          name: patientData.name || '',
          email: patientData.email || '',
          phone: patientData.phone || '',
          cpf: patientData.cpf || '',
          birthDate: patientData.birthDate ? format(new Date(patientData.birthDate), 'yyyy-MM-dd') : '',
          gender: patientData.gender || '',
          address: patientData.address || '',
          // Se tiver convênio, usa o ID. Se não, usa 'particular'
          convenioId: patientData.convenioId ? patientData.convenioId : 'particular',
          convenioNumber: patientData.convenioNumber || '',
          convenioValidity: patientData.convenioValidity ? format(new Date(patientData.convenioValidity), 'yyyy-MM-dd') : '',
        });
      } else {
        setFormData(initialFormData);
      }
      setError('');
    }
  }, [patientData, isEditing, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setError('Nome e Email são obrigatórios.');
      return;
    }
    setError('');
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{isEditing ? 'Editar Paciente' : 'Novo Paciente'}</h2>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>
        
        <form className={styles.modalBody} onSubmit={handleSubmit}>
          {error && <p className={styles.errorText}>{error}</p>}
          
          <div className={styles.formGrid}> 
            <div className={`${styles.formGroup} ${styles.fullSpan}`}>
              <label>Nome Completo *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required />
            </div>

            <div className={styles.formGroup}>
              <label>Email *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className={styles.formGroup}>
              <label>Telefone</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="(XX) XXXXX-XXXX" />
            </div>

            <div className={styles.formGroup}>
              <label>CPF</label>
              <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" />
            </div>
            <div className={styles.formGroup}>
              <label>Data de Nascimento</label>
              <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} />
            </div>

            <div className={styles.formGroup}>
              <label>Gênero</label>
              <select name="gender" value={formData.gender} onChange={handleChange}>
                <option value="" disabled>Selecione...</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            {/* CAMPO DE CONVÊNIO ATUALIZADO */}
            <div className={styles.formGroup}>
              <label>Convênio</label>
              <select name="convenioId" value={formData.convenioId} onChange={handleChange} style={{backgroundColor: '#f8f9fa'}}>
                <option value="particular">Particular (Sem Convênio)</option>
                
                {/* Mapeia a lista recebida do pai */}
                {conveniosList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                
              </select>
            </div>

            {/* --- NOVOS CAMPOS (Só aparecem se NÃO for particular) --- */}
            {formData.convenioId && formData.convenioId !== 'particular' && (
              <>
                <div className={styles.formGroup}>
                  <label>Nº da Carteirinha</label>
                  <input 
                    type="text" 
                    name="convenioNumber" 
                    value={formData.convenioNumber} 
                    onChange={handleChange} 
                    placeholder="Ex: 000.111.222.33" 
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Validade do Plano</label>
                  <input 
                    type="date" 
                    name="convenioValidity" 
                    value={formData.convenioValidity} 
                    onChange={handleChange} 
                  />
                </div>
              </>
            )}

            <div className={`${styles.formGroup} ${styles.fullSpan}`}>
              <label>Endereço</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.saveButton}>Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientModal;