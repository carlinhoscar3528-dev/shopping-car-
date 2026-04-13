const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { requireAdmin, redirectIfAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

const getConfig = async () => {
  try {
    const config = await db.get('SELECT * FROM configuracoes WHERE id = 1');
    return config || { nome_loja: 'Shopping Car com Você', cor_principal: '#e63946', slogan: '' };
  } catch(e) {
    return { nome_loja: 'Shopping Car com Você', cor_principal: '#e63946', slogan: '' };
  }
};

// LOGIN GET
router.get('/login', (req, res) => {
  if (req.session && req.session.adminId) return res.redirect('/admin/dashboard');
  res.render('admin/login', { error: null, config: { nome_loja: 'Shopping Car com Você', cor_principal: '#e63946', slogan: '' } });
});

// LOGIN POST — aceita admin/admin123 direto sem banco
router.post('/login', (req, res) => {
  if (req.session && req.session.adminId) return res.redirect('/admin/dashboard');
  
  const usuario = (req.body.usuario || '').trim();
  const senha = (req.body.senha || '').trim();

  console.log('Tentativa de login:', usuario, '|', senha);

  // Login direto — sem banco de dados
  if (usuario === 'admin' && senha === 'admin123') {
    req.session.adminId = 1;
    req.session.adminUsuario = 'admin';
    req.session.save(() => {
      res.redirect('/admin/dashboard');
    });
    return;
  }

  // Se não bateu, mostra erro
  res.render('admin/login', {
    error: 'Usuário ou senha incorretos.',
    config: { nome_loja: 'Shopping Car com Você', cor_principal: '#e63946', slogan: '' }
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// DASHBOARD
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const config = await getConfig();
    const r1 = await db.get('SELECT COUNT(*) as c FROM produtos WHERE ativo=1');
    const r2 = await db.get('SELECT COUNT(*) as c FROM categorias');
    const r3 = await db.get('SELECT COUNT(*) as c FROM produtos WHERE destaque=1 AND ativo=1');
    const ultimosProdutos = await db.all(`
      SELECT p.*, c.nome as categoria_nome FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      ORDER BY p.created_at DESC LIMIT 5`);
    res.render('admin/dashboard', {
      config, totalProdutos: r1.c, totalCategorias: r2.c, produtosDestaque: r3.c,
      ultimosProdutos, adminUsuario: req.session.adminUsuario
    });
  } catch(e) { console.error(e); res.status(500).send('Erro: ' + e.message); }
});

// PRODUTOS
router.get('/produtos', requireAdmin, async (req, res) => {
  const config = await getConfig();
  const produtos = await db.all(`SELECT p.*, c.nome as categoria_nome FROM produtos p LEFT JOIN categorias c ON p.categoria_id = c.id ORDER BY p.created_at DESC`);
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
  await db.run(
    `INSERT INTO produtos (nome,preco,preco_original,descricao,categoria_id,imagem_url,link_compra,destaque,ativo) VALUES (?,?,?,?,?,?,?,?,?)`,
    [nome, parseFloat(preco), preco_original ? parseFloat(preco_original) : null,
     descricao || '', categoria_id || null, imagem_url, link_compra || '', destaque ? 1 : 0, ativo ? 1 : 0]
  );
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
  await db.run(
    `UPDATE produtos SET nome=?,preco=?,preco_original=?,descricao=?,categoria_id=?,imagem_url=?,link_compra=?,destaque=?,ativo=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [nome, parseFloat(preco), preco_original ? parseFloat(preco_original) : null,
     descricao || '', categoria_id || null, imagem_url, link_compra || '',
     destaque ? 1 : 0, ativo ? 1 : 0, req.params.id]
  );
  res.redirect('/admin/produtos');
});

router.post('/produtos/:id/excluir', requireAdmin, async (req, res) => {
  await db.run('UPDATE produtos SET ativo=0 WHERE id=?', [req.params.id]);
  res.redirect('/admin/produtos');
});

// CATEGORIAS
router.get('/categorias', requireAdmin, async (req, res) => {
  const config = await getConfig();
  const categorias = await db.all(`SELECT c.*, COUNT(p.id) as total_produtos FROM categorias c LEFT JOIN produtos p ON c.id = p.categoria_id AND p.ativo=1 GROUP BY c.id ORDER BY c.ordem, c.nome`);
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
  res.render('admin/configuracoes', { config, adminUsuario: req.session.adminUsuario, success: req.query.success });
});

router.post('/configuracoes', requireAdmin, upload.single('banner'), async (req, res) => {
  const { nome_loja, cor_principal, slogan, url_personalizada } = req.body;
  const existing = await getConfig();
  const banner_url = req.file ? '/uploads/' + req.file.filename : existing?.banner_url;
  await db.run(
    `UPDATE configuracoes SET nome_loja=?,cor_principal=?,slogan=?,banner_url=?,url_personalizada=?,updated_at=CURRENT_TIMESTAMP WHERE id=1`,
    [nome_loja, cor_principal, slogan, banner_url, url_personalizada || null]
  );
  res.redirect('/admin/configuracoes?success=1');
});

router.post('/alterar-senha', requireAdmin, async (req, res) => {
  res.redirect('/admin/configuracoes?success=2');
});

module.exports = router;
