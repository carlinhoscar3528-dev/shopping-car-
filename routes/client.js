const express = require('express');
const router = express.Router();
const db = require('../db/database');

const getConfig = () => db.get('SELECT * FROM configuracoes WHERE id = 1');
const cartCount = (req) => req.session.cart ? req.session.cart.reduce((a, i) => a + i.qty, 0) : 0;

// HOME
router.get('/', async (req, res) => {
  try {
    const config = await getConfig();
    const categorias = await db.all('SELECT * FROM categorias ORDER BY ordem, nome');
    const destaques = await db.all(`
      SELECT p.*, c.nome as categoria_nome FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.ativo = 1 AND p.destaque = 1 ORDER BY p.created_at DESC LIMIT 8`);
    const todosProdutos = await db.all(`
      SELECT p.*, c.nome as categoria_nome FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.ativo = 1 ORDER BY c.ordem, p.nome`);

    const produtosPorCategoria = {};
    todosProdutos.forEach(p => {
      const cat = p.categoria_nome || 'Outros';
      if (!produtosPorCategoria[cat]) produtosPorCategoria[cat] = [];
      produtosPorCategoria[cat].push(p);
    });

    res.render('client/home', { config, categorias, destaques, produtosPorCategoria, cartCount: cartCount(req) });
  } catch(e) { console.error(e); res.status(500).send('Erro interno'); }
});

// CATEGORIA
router.get('/categoria/:id', async (req, res) => {
  try {
    const config = await getConfig();
    const categorias = await db.all('SELECT * FROM categorias ORDER BY ordem, nome');
    const categoria = await db.get('SELECT * FROM categorias WHERE id = ?', [req.params.id]);
    if (!categoria) return res.redirect('/');
    const produtos = await db.all(`
      SELECT p.*, c.nome as categoria_nome FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.ativo = 1 AND p.categoria_id = ? ORDER BY p.nome`, [req.params.id]);
    res.render('client/categoria', { config, categorias, categoria, produtos, cartCount: cartCount(req) });
  } catch(e) { console.error(e); res.status(500).send('Erro interno'); }
});

// PRODUTO
router.get('/produto/:id', async (req, res) => {
  try {
    const config = await getConfig();
    const categorias = await db.all('SELECT * FROM categorias ORDER BY ordem, nome');
    const produto = await db.get(`
      SELECT p.*, c.nome as categoria_nome FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.id = ? AND p.ativo = 1`, [req.params.id]);
    if (!produto) return res.redirect('/');
    const relacionados = await db.all(`
      SELECT p.*, c.nome as categoria_nome FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.ativo = 1 AND p.categoria_id = ? AND p.id != ? LIMIT 4`, [produto.categoria_id, produto.id]);
    res.render('client/produto', { config, categorias, produto, relacionados, cartCount: cartCount(req) });
  } catch(e) { console.error(e); res.status(500).send('Erro interno'); }
});

// CARRINHO
router.get('/carrinho', async (req, res) => {
  try {
    const config = await getConfig();
    const categorias = await db.all('SELECT * FROM categorias ORDER BY ordem, nome');
    const cart = req.session.cart || [];
    const total = cart.reduce((sum, item) => sum + item.preco * item.qty, 0);
    res.render('client/carrinho', { config, categorias, cart, total, cartCount: cartCount(req) });
  } catch(e) { console.error(e); res.status(500).send('Erro interno'); }
});

// ADICIONAR AO CARRINHO
router.post('/carrinho/adicionar', async (req, res) => {
  try {
    const { produto_id, qty = 1 } = req.body;
    const produto = await db.get('SELECT * FROM produtos WHERE id = ? AND ativo = 1', [produto_id]);
    if (!produto) return res.json({ success: false, msg: 'Produto não encontrado' });
    if (!req.session.cart) req.session.cart = [];
    const idx = req.session.cart.findIndex(i => i.id == produto_id);
    if (idx >= 0) req.session.cart[idx].qty += parseInt(qty);
    else req.session.cart.push({ id: produto.id, nome: produto.nome, preco: produto.preco, imagem_url: produto.imagem_url, qty: parseInt(qty) });
    res.json({ success: true, cartCount: cartCount(req), msg: 'Produto adicionado ao carrinho!' });
  } catch(e) { res.json({ success: false, msg: 'Erro interno' }); }
});

// ATUALIZAR CARRINHO
router.post('/carrinho/atualizar', (req, res) => {
  const { produto_id, qty } = req.body;
  if (!req.session.cart) return res.redirect('/carrinho');
  const q = parseInt(qty);
  if (q <= 0) req.session.cart = req.session.cart.filter(i => i.id != produto_id);
  else { const idx = req.session.cart.findIndex(i => i.id == produto_id); if (idx >= 0) req.session.cart[idx].qty = q; }
  res.redirect('/carrinho');
});

// REMOVER DO CARRINHO
router.post('/carrinho/remover', (req, res) => {
  if (req.session.cart) req.session.cart = req.session.cart.filter(i => i.id != req.body.produto_id);
  res.redirect('/carrinho');
});

// BUSCA
router.get('/busca', async (req, res) => {
  try {
    const config = await getConfig();
    const categorias = await db.all('SELECT * FROM categorias ORDER BY ordem, nome');
    const q = req.query.q || '';
    const produtos = q ? await db.all(`
      SELECT p.*, c.nome as categoria_nome FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.ativo = 1 AND (p.nome LIKE ? OR p.descricao LIKE ?) ORDER BY p.nome`,
      [`%${q}%`, `%${q}%`]) : [];
    res.render('client/busca', { config, categorias, produtos, q, cartCount: cartCount(req) });
  } catch(e) { console.error(e); res.status(500).send('Erro interno'); }
});

module.exports = router;
