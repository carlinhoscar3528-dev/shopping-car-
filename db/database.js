// Banco de dados usando sqlite3 (compatível com Node.js v24)
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'loja.db');
const sqlite = new sqlite3.Database(dbPath);

sqlite.run('PRAGMA foreign_keys = ON');

sqlite.serialize(() => {
  sqlite.run(`CREATE TABLE IF NOT EXISTS configuracoes (
    id INTEGER PRIMARY KEY, nome_loja TEXT NOT NULL DEFAULT 'Shopping Car com Você',
    cor_principal TEXT NOT NULL DEFAULT '#e63946', banner_url TEXT DEFAULT NULL,
    url_personalizada TEXT DEFAULT NULL, slogan TEXT DEFAULT 'Os melhores produtos com os melhores preços!',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  sqlite.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT, usuario TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  sqlite.run(`CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT UNIQUE NOT NULL,
    ordem INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  sqlite.run(`CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, preco REAL NOT NULL,
    preco_original REAL DEFAULT NULL, descricao TEXT DEFAULT '', categoria_id INTEGER,
    imagem_url TEXT DEFAULT NULL, link_compra TEXT DEFAULT '', destaque INTEGER DEFAULT 0,
    ativo INTEGER DEFAULT 1, estoque INTEGER DEFAULT 999,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

  sqlite.get('SELECT id FROM configuracoes WHERE id = 1', (err, row) => {
    if (!row) sqlite.run(`INSERT INTO configuracoes (id,nome_loja,cor_principal,slogan) VALUES (1,'Shopping Car com Você','#e63946','Os melhores produtos com os melhores preços!')`);
  });
  sqlite.get('SELECT id FROM admins WHERE usuario = ?', ['admin'], (err, row) => {
    if (!row) {
      const hash = bcrypt.hashSync('admin123', 12);
      sqlite.run('INSERT INTO admins (usuario, senha) VALUES (?, ?)', ['admin', hash]);
      console.log('✅ Admin criado: usuário=admin, senha=admin123');
    }
  });
  sqlite.get('SELECT COUNT(*) as c FROM categorias', (err, row) => {
    if (row && row.c === 0) {
      ['Eletrônicos','Roupas e Moda','Casa e Jardim','Esportes','Beleza'].forEach((nome, i) => {
        sqlite.run('INSERT INTO categorias (nome, ordem) VALUES (?, ?)', [nome, i]);
      });
      [
        ['Smartphone Pro Max 256GB',1899.90,2299.90,'Tela AMOLED 6.7", Câmera 108MP',1,'#',1],
        ['Fone Bluetooth Premium',299.90,399.90,'Cancelamento de ruído ativo, 30h de bateria',1,'#',1],
        ['Notebook Gamer 16GB RAM',3499.90,4200.00,'Intel i7, SSD 512GB, Placa RTX 3060',1,'#',0],
        ['Camiseta Casual Premium',89.90,129.90,'100% Algodão, disponível em várias cores',2,'#',1],
        ['Tênis Running Ultra',249.90,320.00,'Solado em gel, ideal para corridas longas',4,'#',1],
        ['Kit Panelas Antiaderente',199.90,299.90,'Conjunto com 5 peças, alça ergonômica',3,'#',0],
        ['Perfume Importado 100ml',189.90,250.00,'Fragrância exclusiva, longa duração',5,'#',1],
        ['Mochila Executiva 30L',159.90,220.00,'Compartimento para notebook, USB externo',2,'#',0],
      ].forEach(p => sqlite.run('INSERT INTO produtos (nome,preco,preco_original,descricao,categoria_id,link_compra,destaque) VALUES (?,?,?,?,?,?,?)', p));
    }
  });
});

const db = {
  get: (sql, params = []) => new Promise((resolve, reject) => {
    sqlite.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  }),
  all: (sql, params = []) => new Promise((resolve, reject) => {
    sqlite.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
  }),
  run: (sql, params = []) => new Promise((resolve, reject) => {
    sqlite.run(sql, params, function(err) {
      if (err) reject(err); else resolve({ lastID: this.lastID, changes: this.changes });
    });
  }),
};

module.exports = db;
