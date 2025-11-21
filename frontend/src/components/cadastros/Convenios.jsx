import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaFileMedical, FaExclamationCircle, FaEye, FaUser } from 'react-icons/fa';
import styles from './Convenios.module.css';

const Convenios = () => {
  const [convenios, setConvenios] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados para o Modal de Visualização
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedConvenioName, setSelectedConvenioName] = useState('');
  const [convenioPatients, setConvenioPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const fetchConvenios = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/convenios', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setConvenios(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConvenios(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!newName.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/convenios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newName })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao adicionar');
      }

      setNewName('');
      fetchConvenios(); 
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este convênio?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/convenios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error); 
      } else {
        fetchConvenios();
      }
    } catch (err) {
      alert('Erro ao excluir');
    }
  };

  // --- FUNÇÃO PARA VER PACIENTES ---
  const handleViewPatients = async (id, name) => {
    setSelectedConvenioName(name);
    setViewModalOpen(true);
    setConvenioPatients([]);
    setLoadingPatients(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/convenios/${id}/patients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setConvenioPatients(await res.json());
      }
    } catch (error) {
      console.error("Erro ao buscar pacientes", error);
    } finally {
      setLoadingPatients(false);
    }
  };

  return (
    <div className="page-content fade-in">
      <div className={styles.header}>
        <h2><FaFileMedical /> Gestão de Convênios</h2>
        <p>Cadastre e visualize os planos de saúde aceitos.</p>
      </div>

      {/* Card de Cadastro */}
      <div className={styles.formCard}>
        <form onSubmit={handleAdd} className={styles.formRow}>
          <div className={styles.inputGroup}>
            <label>Novo Convênio</label>
            <input 
              type="text" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
              placeholder="Ex: Unimed, Bradesco Saúde..."
            />
          </div>
          <button type="submit" className={styles.addButton}>
            <FaPlus /> Adicionar
          </button>
        </form>
        {error && <div className={styles.errorMessage}><FaExclamationCircle /> {error}</div>}
      </div>

      {/* Lista de Convênios */}
      {loading ? <div className={styles.loading}>Carregando...</div> : (
        <div className={styles.grid}>
          {convenios.length === 0 && <p className={styles.emptyState}>Nenhum convênio cadastrado.</p>}
          
          {convenios.map(conv => (
            <div key={conv.id} className={styles.card}>
              <div className={styles.cardContent}>
                <h4>{conv.name}</h4>
                <small>{conv._count?.patients || 0} pacientes vinculados</small>
              </div>
              
              <div className={styles.cardActions}>
                {/* Botão Ver Pacientes */}
                <button 
                  onClick={() => handleViewPatients(conv.id, conv.name)}
                  className={styles.viewButton}
                  title="Ver Pacientes"
                >
                  <FaEye />
                </button>

                {/* Botão Excluir */}
                <button 
                  onClick={() => handleDelete(conv.id)}
                  className={styles.deleteButton}
                  title="Excluir Convênio"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- MODAL DE LISTA DE PACIENTES --- */}
      {viewModalOpen && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
        }} onClick={() => setViewModalOpen(false)}>
            
            <div style={{
                backgroundColor: 'white', padding: '2rem', borderRadius: '12px',
                width: '600px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }} onClick={e => e.stopPropagation()}>
                
                <div style={{borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h3 style={{margin: 0, color: '#830021'}}>Pacientes: {selectedConvenioName}</h3>
                    <button onClick={() => setViewModalOpen(false)} style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer', color:'#666'}}>&times;</button>
                </div>

                {loadingPatients ? <p style={{textAlign: 'center', color: '#666'}}>Carregando lista...</p> : (
                    <>
                        {convenioPatients.length === 0 ? (
                            <p style={{textAlign: 'center', color: '#999', fontStyle: 'italic', padding: '2rem'}}>Nenhum paciente vinculado a este convênio.</p>
                        ) : (
                            <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                                {convenioPatients.map(p => (
                                    <li key={p.id} style={{
                                        padding: '1rem', borderBottom: '1px solid #f1f1f1', display: 'flex', alignItems: 'center', gap: '1rem'
                                    }}>
                                        <div style={{
                                            backgroundColor: '#f8f9fa', width: '40px', height: '40px', borderRadius: '50%', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#830021'
                                        }}>
                                            <FaUser />
                                        </div>
                                        <div>
                                            <strong style={{display: 'block', color: '#333'}}>{p.name}</strong>
                                            <span style={{fontSize: '0.85rem', color: '#666'}}>
                                                CPF: {p.cpf || '---'} | Tel: {p.phone || '---'}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                )}
                
                <div style={{textAlign: 'right', marginTop: '1.5rem'}}>
                    <button onClick={() => setViewModalOpen(false)} style={{
                        padding: '0.6rem 1.2rem', border: '1px solid #ccc', background: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#555'
                    }}>Fechar</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Convenios;