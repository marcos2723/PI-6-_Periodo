Projeto iCardio - Instruções do Backend

AVISO: Este guia assume que o seu ficheiro .env JÁ ESTÁ no repositório.

Pré-requisitos

Node.js

Git

PostgreSQL (a funcionar na sua máquina)

Passos

Clone o projeto (se ainda não o fez):

git clone [https://github.com/marcos2723/PI-6-_Periodo.git](https://github.com/marcos2723/PI-6-_Periodo.git)
cd PI-6-_Periodo


Entre na pasta do backend:

cd backend


Instale as dependências (Express, Prisma, Socket.io, etc.):
(Este é o primeiro comando que deve executar)

npm install


Sincronize o Banco de Dados:
(Cria todas as tabelas no seu PostgreSQL)

npx prisma db push


Inicie o servidor backend:

npm start


O terminal deve mostrar: Servidor HTTP e Socket.io rodando na porta 3001...
Deixe este terminal aberto.



Projeto iCardio - Instruções do Frontend

Pré-requisitos

Node.js

O Terminal do Backend (do ficheiro backend_setup.txt) JÁ TEM de estar a executar.

Passos

Abra um NOVO terminal.

Navegue até à pasta do frontend:
(Assumindo que está na pasta PI-6-_Periodo)

cd frontend


(Se estiver na pasta backend, use cd ../frontend)

Instale as dependências (React, Socket.io-client, etc.):

npm install


Inicie a aplicação React:

npm start


O seu navegador deve abrir automaticamente em http://localhost:3000.
Deixe este terminal aberto.

Acesso

Frontend: http://localhost:3000

Backend API: http://localhost:3001

Use o ecrã de Cadastro para criar o seu primeiro utilizador e depois faça Login.
