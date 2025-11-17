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

  // 🔧 Novo estado para foto de perfil
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        setError(null);
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
        setEditName(data.name);
        setEditPhone(data.phone || '');

        // 🔧 Carrega foto armazenada no localStorage
        const savedImage = localStorage.getItem('profileImage');
        if (savedImage) setProfileImage(savedImage);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (userData) {
      setEditName(userData.name);
      setEditPhone(userData.phone || '');
    }
    setPreviewImage(null); // 🔧 Limpa preview da imagem ao cancelar
  };

  const handleSave = async () => {
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Usuário não autenticado.');

      const updatedData = { name: editName, phone: editPhone };

      const response = await fetch('http://localhost:3001/api/profile', {
        method: 'PUT',
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
      setUserData(savedData);
      setIsEditing(false);

      // 🔧 Salva foto no localStorage (temporário até ter backend para upload)
      if (previewImage) {
        localStorage.setItem('profileImage', previewImage);
        setProfileImage(previewImage);
      }

      alert('Perfil atualizado com sucesso!');

    } catch (err) {
      setError(err.message);
    }
  };

  // 🔧 Handler do upload de imagem
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreviewImage(previewUrl);
    }
  };

  if (loading) return <div className="page-content"><h2>Carregando perfil...</h2></div>;
  if (error) return <div className="page-content"><h2 className={styles.errorMessage}>Erro: {error}</h2></div>;
  if (!userData) return <div className="page-content"><h2>Nenhum dado de usuário encontrado.</h2></div>;

  return (
    <div className="page-content">
      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          {/* 🔧 Mostra foto ou ícone */}
          {previewImage || profileImage ? (
            <img
              src={previewImage || profileImage}
              alt="Foto de perfil"
              className={styles.profilePic}
            />
          ) : (
            <FaUserCircle size={80} className={styles.profileAvatar} />
          )}

          {isEditing ? (
            <label className={styles.uploadLabel}>
              Alterar foto
              <input type="file" accept="image/*" onChange={handleImageUpload} className={styles.uploadInput}/>
            </label>
          ) : null}

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
          <div className={styles.detailItem}>
            <FaEnvelope />
            <span>{userData.email}</span>
          </div>

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

          {userData.role === 'Médico' && userData.crm && (
            <div className={styles.detailItem}>
              <FaIdBadge />
              <span>CRM: {userData.crm}</span>
            </div>
          )}
        </div>

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

        {error && !loading && <p className={styles.errorMessage}>{error}</p>}
      </div>
    </div>
  );
};

export default ProfilePage;
