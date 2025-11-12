// frontend/src/components/Financeiro/BudgetModal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import styles from './BudgetModal.module.css';
import { FaPlus, FaTrash } from 'react-icons/fa';

const BudgetModal = ({ onClose, onSaveSuccess, patients, services }) => {
  const [patientId, setPatientId] = useState('');
  const [status, setStatus] = useState('Pendente');
  const [lines, setLines] = useState([{ serviceId: '', quantity: 1, unitPrice: 0.00 }]);
  const [error, setError] = useState('');

  // Atualiza o preço na linha quando um serviço é selecionado
  const handleServiceChange = (index, serviceId) => {
    const service = services.find(s => s.id === parseInt(serviceId));
    const price = service ? service.price : 0;
    updateLine(index, 'serviceId', serviceId);
    updateLine(index, 'unitPrice', price);
  };

  const updateLine = (index, field, value) => {
    const newLines = [...lines];
    newLines[index][field] = value;
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { serviceId: '', quantity: 1, unitPrice: 0.00 }]);
  };

  const removeLine = (index) => {
    const newLines = lines.filter((_, i) => i !== index);
    setLines(newLines);
  };

  // Calcula o total do orçamento
  const total = useMemo(() => {
    return lines.reduce((acc, line) => acc + (line.quantity * line.unitPrice), 0);
  }, [lines]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!patientId || lines.some(l => !l.serviceId || l.quantity <= 0)) {
      setError('Paciente, serviço e quantidade são obrigatórios para todas as linhas.');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const budgetData = {
        patientId,
        status,
        lines: lines.map(l => ({
          serviceId: parseInt(l.serviceId),
          quantity: parseInt(l.quantity),
          unitPrice: parseFloat(l.unitPrice)
        }))
      };

      const response = await fetch('http://localhost:3001/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(budgetData)
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Falha ao criar orçamento');
      }

      onSaveSuccess(); // Atualiza a lista na tela principal
      onClose(); // Fecha o modal
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <form className={styles.modalContent} onSubmit={handleSubmit}>
        <h2>Criar Novo Orçamento</h2>
        
        <div className={styles.formGroup}>
          <label>Paciente *</label>
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
            <option value="" disabled>Selecione o paciente</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <hr className={styles.divider} />

        {/* Linhas do Orçamento */}
        {lines.map((line, index) => (
          <div key={index} className={styles.lineItem}>
            <div className={styles.formGroup} style={{ flex: 3 }}>
              <label>Serviço *</label>
              <select 
                value={line.serviceId} 
                onChange={(e) => handleServiceChange(index, e.target.value)} 
                required
              >
                <option value="" disabled>Selecione um serviço</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label>Qtde *</label>
              <input 
                type="number" 
                min="1"
                value={line.quantity}
                onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 2 }}>
              <label>Preço Unit. (R$)</label>
              <input 
                type="number" 
                step="0.01"
                value={line.unitPrice}
                onChange={(e) => updateLine(index, 'unitPrice', e.target.value)}
                required
              />
            </div>
            <button type="button" className={styles.removeLineButton} onClick={() => removeLine(index)}>
              <FaTrash />
            </button>
          </div>
        ))}
        
        <button type="button" className={styles.addLineButton} onClick={addLine}>
          <FaPlus /> Adicionar Linha
        </button>

        <hr className={styles.divider} />

        <div className={styles.totalSection}>
          <strong>Total do Orçamento:</strong>
          <span>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>

        {error && <p className={styles.errorText}>{error}</p>}

        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>Cancelar</button>
          <button type="submit" className={styles.saveButton}>Salvar Orçamento</button>
        </div>
      </form>
    </div>
  );
};

export default BudgetModal;