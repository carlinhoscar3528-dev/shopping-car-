# 🛍️ Shopping Car com Você — Loja Virtual Completa

## 🚀 Como rodar

### 1. Instale as dependências
```bash
npm install
```

### 2. Inicie o servidor
```bash
npm start
```

### 3. Acesse
- **Loja:** http://localhost:3000
- **Admin:** http://localhost:3000/admin
- **Login padrão:** `admin` / `admin123`

---

## 📁 Estrutura do projeto

```
shopping-car/
├── server.js               # Servidor principal
├── db/
│   └── database.js         # Banco SQLite + seed
├── routes/
│   ├── client.js           # Rotas da loja
│   └── admin.js            # Rotas do admin (protegidas)
├── middleware/
│   ├── auth.js             # Proteção de rotas admin
│   └── upload.js           # Upload de imagens
├── views/
│   ├── client/             # Templates da loja
│   └── admin/              # Templates do painel
├── public/
│   ├── css/                # Estilos
│   ├── js/                 # Scripts
│   └── images/             # Imagens estáticas
└── uploads/                # Imagens enviadas pelo admin
```

---

## 🔐 Segurança

- Senhas criptografadas com **bcryptjs**
- Rotas admin protegidas por **middleware**
- Sessões seguras com **express-session**
- Headers anti-cache nas páginas admin
- Meta `noindex` nas páginas admin

---

## ⚙️ Configuração

Todas as configurações são feitas pelo painel admin em `/admin/configuracoes`:
- Nome da loja
- Slogan
- Cor principal
- Banner
- URL personalizada (domínio)

---

## 🌐 Deploy no Replit

1. Faça upload dos arquivos no Replit
2. Configure o `PORT` nas variáveis de ambiente (ou use o padrão 3000)
3. O `SESSION_SECRET` pode ser definido em variáveis de ambiente

---

## 📦 Tecnologias

| Tech | Uso |
|------|-----|
| Node.js + Express | Servidor |
| better-sqlite3 | Banco de dados |
| EJS | Templates HTML |
| bcryptjs | Criptografia de senhas |
| multer | Upload de imagens |
| express-session | Sessões seguras |

---

## 🔮 Próximas integrações (preparado)

- ✅ Estrutura pronta para Pix / Mercado Pago
- ✅ Sistema de pedidos
- ✅ SEO (meta tags dinâmicas)
- ✅ Domínio personalizado
