const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const path = require('path');
const fs = require('fs');

['uploads', 'db'].forEach(dir => {
  const p = path.join(__dirname, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'shoppingcar-secret-2024-xyz',
  resave: true,
  saveUninitialized: true,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false,
  sameSite: 'lax'
}));

app.use((req, res, next) => {
  if (req.path.startsWith('/admin')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
  next();
});

const clientRoutes = require('./routes/client');
const adminRoutes = require('./routes/admin');

app.post('/admin/login', (req, res) => {
  const usuario = (req.body.usuario || '').trim();
  const senha = (req.body.senha || '').trim();
  if (usuario === 'admin' && senha === 'admin123') {
    req.session.adminId = 1;
    req.session.adminUsuario = 'admin';
    return req.session.save(() => res.redirect('/admin/dashboard'));
  }
  res.redirect('/admin/login?erro=1');
});
app.use('/', clientRoutes);
app.use('/admin', adminRoutes);

// 404
app.use(async (req, res) => {
  try {
    const db = require('./db/database');
    const config = await db.get('SELECT * FROM configuracoes WHERE id=1');
    res.status(404).render('client/404', {
      config,
      cartCount: req.session.cart ? req.session.cart.reduce((a, i) => a + i.qty, 0) : 0,
      categorias: []
    });
  } catch(e) { res.status(404).send('Página não encontrada'); }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('<h1>Erro interno. Tente novamente.</h1>');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🛍️  Shopping Car com Você rodando em http://localhost:${PORT}`);
  console.log(`⚙️  Painel admin: http://localhost:${PORT}/admin`);
  console.log(`🔑  Login: admin / admin123\n`);
});
