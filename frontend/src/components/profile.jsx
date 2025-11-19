import React, { useState, useEffect } from 'react';
import styles from './profile.module.css';
import { FaUserCircle, FaEnvelope, FaPhone, FaIdBadge, FaEdit, FaSave, FaTimes, FaCamera } from 'react-icons/fa';

const ProfilePage = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado para o modo de edição
  const [isEditing, setIsEditing] = useState(false);

  // Estados dos campos editáveis
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // --- Estados para a Imagem ---
  const [profileImage, setProfileImage] = useState(null); // Imagem salva
  const [previewImage, setPreviewImage] = useState(null); // Pré-visualização durante edição

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Usuário não autenticado.');

        const response = await fetch('http://localhost:3001/api/profile', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao carregar perfil.');
        }

        const data = await response.json();
        setUserData(data);
        setEditName(data.name);
        setEditPhone(data.phone || '');

        // --- Carrega a foto salva no navegador ---
        // Usamos o ID do usuário na chave para que cada usuário tenha sua foto
        const savedImage = localStorage.getItem(`profileImage_${data.id}`);
        if (savedImage) {
          setProfileImage(savedImage);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, []);

  // --- Função para processar o upload da imagem ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Converte o arquivo para Base64 para poder salvar no localStorage
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setPreviewImage(null); // Limpa o preview
    if (userData) {
      setEditName(userData.name);
      setEditPhone(userData.phone || '');
    }
  };

  const handleSave = async () => {
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const updatedData = { name: editName, phone: editPhone };

      const response = await fetch('http://localhost:3001/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) throw new Error('Falha ao salvar alterações.');

      const savedData = await response.json();
      setUserData(savedData);
      setIsEditing(false);

      // --- Salva a imagem definitivamente ---
      if (previewImage) {
        localStorage.setItem(`profileImage_${savedData.id}`, previewImage);
        setProfileImage(previewImage);
        setPreviewImage(null);
      }

      alert('Perfil atualizado com sucesso!');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="page-content"><h2>Carregando...</h2></div>;
  if (error && !isEditing) return <div className="page-content"><h2>Erro: {error}</h2></div>;
  if (!userData) return <div className="page-content"><h2>Usuário não encontrado.</h2></div>;

  return (
    <div className="page-content">
      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          
          {/* --- Área da Foto --- */}
          <div className={styles.avatarContainer}>
            {/* Mostra o preview (se houver), ou a imagem salva, ou o ícone padrão */}
            {previewImage || profileImage ? (
              <img 
                src={previewImage || profileImage} 
                alt="Perfil" 
                className={styles.profilePic} 
              />
            ) : (
              <FaUserCircle className={styles.defaultAvatar} />
            )}

            {/* Botão de upload (só aparece na edição) */}
            {isEditing && (
              <label className={styles.uploadButton}>
                <FaCamera />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className={styles.hiddenInput}
                />
              </label>
            )}
          </div>

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
              <span>{userData.phone || 'Telefone não cadastrado'}</span>
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
              <button onClick={handleCancel} className={`${styles.actionButton} ${styles.cancelButton}`}>
                <FaTimes /> Cancelar
              </button>
              <button onClick={handleSave} className={`${styles.actionButton} ${styles.saveButton}`}>
                <FaSave /> Salvar
              </button>
            </>
          ) : (
            <button onClick={handleEdit} className={`${styles.actionButton} ${styles.editButton}`}>
              <FaEdit /> Editar Perfil
            </button>
          )}
        </div>
        
        {error && isEditing && <p className={styles.errorMessage}>{error}</p>}
      </div>
    </div>
  );
};

export default ProfilePage;