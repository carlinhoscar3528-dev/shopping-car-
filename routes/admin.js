const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { generateSecret, verifyTOTP, generateOTPAuthURL } = require('../middleware/totp');

const getConfig = async () => {
  try { return await db.get('SELECT * FROM configuracoes WHERE id = 1') || { nome_loja: 'Shopping Car com Você', cor_principal: '#e63946', slogan: '' }; }
  catch(e) { return { nome_loja: 'Shopping Car com Você', cor_principal: '#e63946', slogan: '' }; }
};

// ETAPA 1 — Login com usuário e senha
router.get('/login', (req, res) => {
  if (req.session && req.session.adminId) return res.redirect('/admin/dashboard');
  res.render('admin/login', { error: null, config: { nome_loja: 'Shopping Car com Você', cor_principal: '#e63946', slogan: '' } });
});

router.post('/login', async (req, res) => {
  const usuario = (req.body.usuario || '').trim();
  const senha = (req.body.senha || '').trim();

  if (usuario === 'admin' && senha === 'admin123') {
    // Verifica se 2FA está configurado
    const adminData = await db.get('SELECT totp_secret FROM admins WHERE usuario = ?', ['admin']).catch(() => null);
    
    if (adminData && adminData.totp_secret) {
      // 2FA ativado — vai para etapa 2
      req.session.pre2fa = true;
      req.session.pre2faUsuario = 'admin';
      return req.session.save(() => res.redirect('/admin/login/2fa'));
    } else {
      // 2FA não configurado — entra direto
      req.session.adminId = 1;
      req.session.adminUsuario = 'admin';
      return req.session.save(() => res.redirect('/admin/dashboard'));
    }
  }
  res.render('admin/login', { error: 'Usuário ou senha incorretos.', config: { nome_loja: 'Shopping Car com Você', cor_principal: '#e63946', slogan: '' } });
});

// ETAPA 2 — Verificar código do Google Authenticator
router.get('/login/2fa', (req, res) => {
  if (!req.session.pre2fa) return res.redirect('/admin/login');
  res.render('admin/login-2fa', { error: null, config: { nome_loja: 'Shopping Car com Você', cor_principal: '#e63946', slogan: '' } });
});

router.post('/login/2fa', async (req, res) => {
  if (!req.session.pre2fa) return res.redirect('/admin/login');
  const token = (req.body.token || '').trim();
  const adminData = await db.get('SELECT totp_secret FROM admins WHERE usuario = ?', ['admin']).catch(() => null);

  if (adminData && verifyTOTP(adminData.totp_secret, token)) {
    req.session.pre2fa = false;
    req.session.adminId = 1;
    req.session.adminUsuario = req.session.pre2faUsuario;
    return req.session.save(() => res.redirect('/admin/dashboard'));
  }
  res.render('admin/login-2fa', { error: 'Código inválido. Tente novamente.', config: { nome_loja: 'Shopping Car com Você', cor_principal: '#e63946', slogan: '' } });
});

router.post('/logout', (req, res) => { req.session.destroy(() => res.redirect('/admin/login')); });

// DASHBOARD
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const config = await getConfig();
    const r1 = await db.get('SELECT COUNT(*) as c FROM produtos WHERE ativo=1');
    const r2 = await db.get('SELECT COUNT(*) as c FROM categorias');
    const r3 = await db.get('SELECT COUNT(*) as c FROM produtos WHERE destaque=1 AND ativo=1');
    const ultimosProdutos = await db.all('SELECT p.*, c.nome as categoria_nome FROM produtos p LEFT JOIN categorias c ON p.categoria_id = c.id ORDER BY p.created_at DESC LIMIT 5');
    res.render('admin/dashboard', { config, totalProdutos: r1.c, totalCategorias: r2.c, produtosDestaque: r3.c, ultimosProdutos, adminUsuario: req.session.adminUsuario });
  } catch(e) { res.status(500).send('Erro: ' + e.message); }
});

// PRODUTOS
router.get('/produtos', requireAdmin, async (req, res) => {
  const config = await getConfig();
  const produtos = await db.all('SELECT p.*, c.nome as categoria_nome FROM produtos p LEFT JOIN categorias c ON p.categoria_id = c.id ORDER BY p.created_at DESC');
  const categorias = await db.all('SELECT * FROM categorias ORDER BY nome');
  res.render('admin/produtos', { config, produtos, categorias, adminUsuario: req.session.adminUsuario });
});

router.get('/produtos/novo', requireAdmin, async (req, res) => {
  const config = await getConfig();
  const categorias = await db.all('SELECT * FROM categorias ORDER BY nome');
  res.render('admin/produto-form', { config, categorias, produto: null, adminUsuario: req.session.adminUsuario });
});

router.post('/produtos/novo', requireAdmin, upload.single('imagem'), async (req, res) => {
  const { nome, preco, preco_original, descricao, categoria_id, link_compra, destaque, ativo } = req.body;
  const imagem_url = req.file ? '/uploads/' + req.file.filename : null;
  await db.run('INSERT INTO produtos (nome,preco,preco_original,descricao,categoria_id,imagem_url,link_compra,destaque,ativo) VALUES (?,?,?,?,?,?,?,?,?)',
    [nome, parseFloat(preco), preco_original ? parseFloat(preco_original) : null, descricao || '', categoria_id || null, imagem_url, link_compra || '', destaque ? 1 : 0, ativo ? 1 : 0]);
  res.redirect('/admin/produtos');
});

router.get('/produtos/:id/editar', requireAdmin, async (req, res) => {
  const config = await getConfig();
  const produto = await db.get('SELECT * FROM produtos WHERE id = ?', [req.params.id]);
  if (!produto) return res.redirect('/admin/produtos');
  const categorias = await db.all('SELECT * FROM categorias ORDER BY nome');
  res.render('admin/produto-form', { config, categorias, produto, adminUsuario: req.session.adminUsuario });
});

router.post('/produtos/:id/editar', requireAdmin, upload.single('imagem'), async (req, res) => {
  const { nome, preco, preco_original, descricao, categoria_id, link_compra, destaque, ativo } = req.body;
  const existing = await db.get('SELECT imagem_url FROM produtos WHERE id = ?', [req.params.id]);
  const imagem_url = req.file ? '/uploads/' + req.file.filename : existing?.imagem_url;
  await db.run('UPDATE produtos SET nome=?,preco=?,preco_original=?,descricao=?,categoria_id=?,imagem_url=?,link_compra=?,destaque=?,ativo=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [nome, parseFloat(preco), preco_original ? parseFloat(preco_original) : null, descricao || '', categoria_id || null, imagem_url, link_compra || '', destaque ? 1 : 0, ativo ? 1 : 0, req.params.id]);
  res.redirect('/admin/produtos');
});

router.post('/produtos/:id/excluir', requireAdmin, async (req, res) => {
  await db.run('UPDATE produtos SET ativo=0 WHERE id=?', [req.params.id]);
  res.redirect('/admin/produtos');
});

// CATEGORIAS
router.get('/categorias', requireAdmin, async (req, res) => {
  const config = await getConfig();
  const categorias = await db.all('SELECT c.*, COUNT(p.id) as total_produtos FROM categorias c LEFT JOIN produtos p ON c.id = p.categoria_id AND p.ativo=1 GROUP BY c.id ORDER BY c.ordem, c.nome');
  res.render('admin/categorias', { config, categorias, adminUsuario: req.session.adminUsuario });
});

router.post('/categorias/nova', requireAdmin, async (req, res) => {
  try { await db.run('INSERT INTO categorias (nome, ordem) VALUES (?, ?)', [req.body.nome, parseInt(req.body.ordem) || 0]); } catch(e) {}
  res.redirect('/admin/categorias');
});

router.post('/categorias/:id/excluir', requireAdmin, async (req, res) => {
  await db.run('DELETE FROM categorias WHERE id=?', [req.params.id]);
  res.redirect('/admin/categorias');
});

// CONFIGURAÇÕES
router.get('/configuracoes', requireAdmin, async (req, res) => {
  const config = await getConfig();
  const adminData = await db.get('SELECT totp_secret FROM admins WHERE usuario = ?', ['admin']).catch(() => null);
  const tem2fa = adminData && adminData.totp_secret ? true : false;
  res.render('admin/configuracoes', { config, adminUsuario: req.session.adminUsuario, success: req.query.success, tem2fa });
});

router.post('/configuracoes', requireAdmin, upload.single('banner'), async (req, res) => {
  const { nome_loja, cor_principal, slogan, url_personalizada } = req.body;
  const existing = await getConfig();
  const banner_url = req.file ? '/uploads/' + req.file.filename : existing?.banner_url;
  await db.run('UPDATE configuracoes SET nome_loja=?,cor_principal=?,slogan=?,banner_url=?,url_personalizada=?,updated_at=CURRENT_TIMESTAMP WHERE id=1',
    [nome_loja, cor_principal, slogan, banner_url, url_personalizada || null]);
  res.redirect('/admin/configuracoes?success=1');
});

router.post('/alterar-senha', requireAdmin, (req, res) => { res.redirect('/admin/configuracoes?success=2'); });

// CONFIGURAR 2FA
router.get('/configurar-2fa', requireAdmin, async (req, res) => {
  const config = await getConfig();
  const secret = generateSecret();
  req.session.temp2faSecret = secret;
  const url = generateOTPAuthURL(secret, 'admin', config.nome_loja || 'Shopping Car');
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  res.render('admin/configurar-2fa', { config, secret, qrUrl, error: null, adminUsuario: req.session.adminUsuario });
});

router.post('/configurar-2fa', requireAdmin, async (req, res) => {
  const config = await getConfig();
  const token = (req.body.token || '').trim();
  const secret = req.session.temp2faSecret;

  if (!secret) return res.redirect('/admin/configurar-2fa');

  if (verifyTOTP(secret, token)) {
    try {
      await db.run('ALTER TABLE admins ADD COLUMN totp_secret TEXT').catch(() => {});
      await db.run('UPDATE admins SET totp_secret = ? WHERE usuario = ?', [secret, 'admin']);
      req.session.temp2faSecret = null;
      return res.redirect('/admin/configuracoes?success=3');
    } catch(e) {
      console.error(e);
    }
  }

  const url = generateOTPAuthURL(secret, 'admin', config.nome_loja || 'Shopping Car');
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  res.render('admin/configurar-2fa', { config, secret, qrUrl, error: 'Código inválido! Tente novamente.', adminUsuario: req.session.adminUsuario });
});

// DESATIVAR 2FA
router.post('/desativar-2fa', requireAdmin, async (req, res) => {
  await db.run('UPDATE admins SET totp_secret = NULL WHERE usuario = ?', ['admin']).catch(() => {});
  res.redirect('/admin/configuracoes?success=4');
});

module.exports = router;
