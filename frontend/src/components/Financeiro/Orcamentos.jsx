import React from 'react';
import styles from './Orcamentos.module.css';
import { FaPlus } from 'react-icons/fa';

const Orcamentos = () => {
  // A lógica de fetch e POST para orçamentos seria adicionada aqui
  const orcamentosExemplo = [
    { id: 1, paciente: "Carlos Ferreira", data: "10/11/2025", total: 1200.00, status: "Aprovado" },
    { id: 2, paciente: "Mariana Almeida", data: "11/11/2025", total: 850.00, status: "Pendente" },
  ];
  
  return (
    <div className="page-content">
      <div className={styles.header}>
        <h2>Orçamentos</h2>
        <button className={styles.addButton}>
          <FaPlus /> Criar Orçamento
        </button>
      </div>

      <div className={styles.listContainer}>
        <table className={styles.listTable}>
          <thead>
            <tr>
              <th>Data</th>
              <th>Paciente</th>
              <th>Total (R$)</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {orcamentosExemplo.map((o) => (
              <tr key={o.id}>
                <td>{o.data}</td>
                <td>{o.paciente}</td>
                <td>{o.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td><span className={styles[o.status]}>{o.status}</span></td>
                <td><button className={styles.actionButton}>Ver</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orcamentos;