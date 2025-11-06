const jwt = require('jsonwebtoken');

// Esta é a função que será usada para proteger as rotas
function authenticateToken(req, res, next) {
  // Pega o token do cabeçalho de autorização (ex: "Bearer TOKEN...")
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Se não foi enviado um token, retorna "Não Autorizado"
  if (token == null) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  // Verifica se o token é válido
  jwt.verify(token, process.env.JWT_SECRET, (err, userPayload) => {
    // Se o token for inválido ou expirado, retorna "Proibido"
    if (err) {
      console.error("Erro na verificação do token:", err.message);
      return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }

    // Se o token for válido, guarda os dados do usuário (id, role) na requisição
    // e passa para a próxima etapa (a rota da API)
    req.user = userPayload;
    next();
  });
}

module.exports = {
  authenticateToken,
};