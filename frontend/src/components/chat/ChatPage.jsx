import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client'; // O cliente que instalamos
import { jwtDecode } from 'jwt-decode';  // Para pegar nosso próprio ID
import styles from './ChatPage.module.css';
import { FaPaperPlane } from 'react-icons/fa'; // Ícone de envio

// --- COMPONENTE PRINCIPAL ---
function ChatPage() {
  // Estados da Lista de Contatos (da Fase 1)
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- NOVOS ESTADOS PARA O CHAT (Fase 2) ---
  const [socket, setSocket] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // Refs para guardar valores que os listeners do socket precisam acessar
  const myIdRef = useRef(null);
  const selectedContactRef = useRef(null);
  // Ref para o final do chat (para auto-scroll)
  const chatEndRef = useRef(null);

  // 1. CONEXÃO COM O SOCKET.IO (AO CARREGAR A PÁGINA)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError("Sessão expirada.");
      setIsLoading(false);
      return;
    }

    // Decodifica o token para sabermos nosso próprio ID
    try {
      const decoded = jwtDecode(token);
      myIdRef.current = decoded.userId; // Salva nosso ID no Ref
    } catch (e) {
      setError("Token inválido.");
      setIsLoading(false);
      return;
    }

    // Conecta ao servidor (passando o token para autenticação)
    const newSocket = io('http://localhost:3001', {
      auth: { token }
    });
    setSocket(newSocket);

    // --- OUVINTES DE EVENTOS DO SOCKET ---

    // Ouve pelo histórico de mensagens (resposta do 'get:message:history')
    newSocket.on('message:history', (history) => {
      setMessages(history);
    });

    // Ouve por novas mensagens (quando alguém envia para nós)
    newSocket.on('receive:message', (message) => {
      // Usamos os Refs para checar se a mensagem é da conversa ATUAL
      const currentContact = selectedContactRef.current;
      const myId = myIdRef.current;

      // Adiciona a mensagem SÓ SE ela pertencer à conversa aberta
      if (
        (message.senderId === currentContact?.id && message.receiverId === myId) ||
        (message.senderId === myId && message.receiverId === currentContact?.id)
      ) {
        setMessages((prevMessages) => [...prevMessages, message]);
      }
      // (Em um app completo, aqui você adicionaria uma "bolinha" de notificação
      // no contato que enviou, caso a janela dele não esteja aberta)
    });

    // Limpeza: desconecta o socket quando o componente "morrer"
    return () => {
      newSocket.disconnect();
    };
  }, []); // O array vazio garante que isso rode SÓ UMA VEZ.

  // 2. BUSCAR A LISTA DE USUÁRIOS (da Fase 1)
  useEffect(() => {
    // (Este código é o mesmo da Fase 1, busca os usuários)
    const fetchUsers = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) { setError("Sessão expirada."); setIsLoading(false); return; }

      try {
        const response = await fetch('http://localhost:3001/api/users', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Falha ao buscar contatos.');
        const data = await response.json();
        setAllUsers(data);
        setFilteredUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // 3. LÓGICA DA BARRA DE PESQUISA (da Fase 1)
  useEffect(() => {
    const results = allUsers.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(results);
  }, [searchTerm, allUsers]);

  // 4. AUTO-SCROLL (Toda vez que as mensagens mudarem)
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 5. FUNÇÃO DE CLIQUE NO CONTATO
  const handleContactClick = (user) => {
    setSelectedContact(user);
    selectedContactRef.current = user; // Atualiza o Ref
    setMessages([]); // Limpa as mensagens antigas

    // Pede ao backend o histórico de mensagens com este usuário
    if (socket) {
      socket.emit('get:message:history', { otherUserId: user.id });
    }
  };

  // 6. FUNÇÃO PARA ENVIAR MENSAGEM
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !selectedContact) return;

    // Envia a mensagem para o backend
    socket.emit('send:message', {
      receiverId: selectedContact.id,
      content: newMessage
    });
    setNewMessage(''); // Limpa o input
  };

  // 7. FUNÇÃO AUXILIAR para formatar a hora
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };


  // --- RENDERIZAÇÃO ---
  return (
    <div className={styles.chatContainer}>
      {/* Coluna da Esquerda (Lista de Contatos) */}
      <div className={styles.contactListPane}>
        <div className={styles.contactListHeader}>
          <h3>Mensagens</h3>
          <input
            type="text"
            placeholder="Pesquisar contatos..."
            className={styles.searchBar}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className={styles.contactList}>
          {isLoading && <p>Carregando contatos...</p>}
          {error && <p className={styles.error}>{error}</p>}
          
          {!isLoading && filteredUsers.length === 0 && (
             <p className={styles.noResults}>Nenhum usuário encontrado.</p>
          )}

          {!isLoading && filteredUsers.map(user => (
            <div 
              key={user.id} 
              // Adiciona classe 'active' se o contato estiver selecionado
              className={`${styles.contactItem} ${selectedContact?.id === user.id ? styles.activeContact : ''}`} 
              onClick={() => handleContactClick(user)}
            >
              <div className={styles.contactAvatar}>{user.name.charAt(0)}</div>
              <div className={styles.contactInfo}>
                <strong className={styles.contactName}>{user.name}</strong>
                <span className={styles.contactRole}>{user.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coluna da Direita (Janela de Chat) */}
      <div className={styles.chatWindowPane}>
        {!selectedContact ? (
          // Placeholder se ninguém for selecionado
          <div className={styles.chatWindowPlaceholder}>
            <p>Selecione um contato para iniciar a conversa.</p>
          </div>
        ) : (
          // O Chat de verdade
          <div className={styles.chatWindow}>
            {/* Cabeçalho do Chat */}
            <div className={styles.chatHeader}>
              <div className={styles.contactAvatar}>{selectedContact.name.charAt(0)}</div>
              <div className={styles.contactInfo}>
                <strong className={styles.contactName}>{selectedContact.name}</strong>
                <span className={styles.contactRole}>{selectedContact.role}</span>
              </div>
            </div>

            {/* Lista de Mensagens */}
            <div className={styles.messageList}>
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  // Aplica classe 'myMessage' se o ID do remetente for o MEU ID
                  className={`${styles.messageItem} ${msg.senderId === myIdRef.current ? styles.myMessage : styles.theirMessage}`}
                >
                  <div className={styles.messageContent}>
                    {msg.content}
                    <span className={styles.messageTimestamp}>{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              ))}
              {/* "Âncora" invisível para o auto-scroll */}
              <div ref={chatEndRef} />
            </div>

            {/* Formulário de Envio */}
            <form className={styles.messageInputForm} onSubmit={handleSendMessage}>
              <input
                type="text"
                className={styles.messageInput}
                placeholder="Digite sua mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit" className={styles.sendButton}>
                <FaPaperPlane />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatPage;