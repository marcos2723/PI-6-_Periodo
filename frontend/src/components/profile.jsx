import React, { useState, useEffect } from 'react';
import styles from './profile.module.css';
import { FaUserCircle, FaEnvelope, FaPhone, FaIdBadge, FaEdit, FaSave, FaTimes } from 'react-icons/fa';

const ProfilePage = () => {
  // Estados para dados, carregamento e erros
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado para controlar o modo de edição
  const [isEditing, setIsEditing] = useState(false);

  // Estados temporários para os campos editáveis
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Busca os dados iniciais do perfil
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        setError(null); // Limpa erros anteriores
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Usuário não autenticado.');

        const response = await fetch('http://localhost:3001/api/profile', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Não foi possível carregar os dados do perfil.');
        }

        const data = await response.json();
        setUserData(data);
        // Inicializa os campos de edição com os dados atuais
        setEditName(data.name);
        setEditPhone(data.phone || ''); // Usa string vazia se o telefone for nulo

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, []); // Roda apenas uma vez

  // Função para entrar no modo de edição
  const handleEdit = () => {
    setIsEditing(true);
  };

  // Função para cancelar a edição
  const handleCancel = () => {
    setIsEditing(false);
    // Restaura os valores originais nos campos de edição
    if (userData) {
      setEditName(userData.name);
      setEditPhone(userData.phone || '');
    }
  };

  // Função para salvar as alterações
  const handleSave = async () => {
    setError(null); // Limpa erros
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Usuário não autenticado.');

      // Prepara os dados a serem enviados (apenas os que podem ser editados)
      const updatedData = {
        name: editName,
        phone: editPhone,
      };

      // --- Chama a nova rota PUT do backend ---
      const response = await fetch('http://localhost:3001/api/profile', {
        method: 'PUT', // Método HTTP para atualização
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Não foi possível salvar as alterações.');
      }

      const savedData = await response.json();
      setUserData(savedData); // Atualiza os dados exibidos com a resposta do backend
      setIsEditing(false); // Sai do modo de edição
      alert('Perfil atualizado com sucesso!');

    } catch (err) {
      setError(err.message);
    }
  };

  // --- Renderização ---
  if (loading) return <div className="page-content"><h2>Carregando perfil...</h2></div>;
  if (error) return <div className="page-content"><h2 className={styles.errorMessage}>Erro: {error}</h2></div>;
  if (!userData) return <div className="page-content"><h2>Nenhum dado de usuário encontrado.</h2></div>;

  return (
    <div className="page-content">
      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          <FaUserCircle size={80} className={styles.profileAvatar} />
          {/* Mostra input ou texto dependendo do modo de edição */}
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={styles.editInputName}
            />
          ) : (
            <h2>{userData.name}</h2>
          )}
          <p className={styles.userRole}>{userData.role}</p>
        </div>

        <div className={styles.profileDetails}>
          <h3>Detalhes do Usuário</h3>
          {/* Email (não editável neste exemplo) */}
          <div className={styles.detailItem}>
            <FaEnvelope />
            <span>{userData.email}</span>
          </div>

          {/* Telefone (editável) */}
          <div className={styles.detailItem}>
            <FaPhone />
            {isEditing ? (
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="(XX) XXXXX-XXXX"
                className={styles.editInput}
              />
            ) : (
              <span>{userData.phone || 'Não informado'}</span>
            )}
          </div>

          {/* CRM (não editável, apenas exibido se for médico) */}
          {userData.role === 'Médico' && userData.crm && (
            <div className={styles.detailItem}>
              <FaIdBadge />
              <span>CRM: {userData.crm}</span>
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div className={styles.actionButtons}>
          {isEditing ? (
            <>
              <button onClick={handleSave} className={`${styles.actionButton} ${styles.saveButton}`}>
                <FaSave /> Salvar
              </button>
              <button onClick={handleCancel} className={`${styles.actionButton} ${styles.cancelButton}`}>
                <FaTimes /> Cancelar
              </button>
            </>
          ) : (
            <button onClick={handleEdit} className={`${styles.actionButton} ${styles.editButton}`}>
              <FaEdit /> Editar Perfil
            </button>
          )}
        </div>
         {/* Exibe mensagem de erro se houver */}
         {error && !loading && <p className={styles.errorMessage}>{error}</p>}
      </div>
    </div>
  );
};

export default ProfilePage;