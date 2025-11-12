// frontend/src/components/Financeiro/BudgetViewModal.jsx

import React from 'react';
import styles from './BudgetViewModal.module.css'; // Vamos criar este CSS
import { FaTimes } from 'react-icons/fa';

const BudgetViewModal = ({ budget, onClose }) => {
  if (!budget) return null;

  // Helper para formatar data
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };
  
  // Helper para formatar moeda
  const formatCurrency = (value) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        
        <div className={styles.modalHeader}>
          <h3>Detalhes do Orçamento</h3>
          <button className={styles.closeButton} onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        <div className={styles.modalBody}>
          {/* Informações do Paciente */}
          <div className={styles.infoSection}>
            <div className={styles.infoBlock}>
              <strong>Paciente:</strong>
              <span>{budget.patient.name}</span>
            </div>
            <div className={styles.infoBlock}>
              <strong>Data:</strong>
              <span>{formatDate(budget.date)}</span>
            </div>
            <div className={styles.infoBlock}>
              <strong>Status:</strong>
              <span className={styles[budget.status]}>{budget.status}</span>
            </div>
          </div>

          {/* Tabela de Itens/Serviços */}
          <h4 className={styles.itemsTitle}>Serviços Inclusos</h4>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Qtde</th>
                <th>Preço Unit.</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {budget.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.service.name}</td>
                  <td>{line.quantity}</td>
                  <td>{formatCurrency(line.unitPrice)}</td>
                  <td>{formatCurrency(line.quantity * line.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div className={styles.totalSection}>
            <strong>Total do Orçamento:</strong>
            <span className={styles.totalValue}>{formatCurrency(budget.total)}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BudgetViewModal;