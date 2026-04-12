// Middleware para proteger rotas administrativas
const requireAdmin = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/admin/login');
};

// Middleware para redirecionar admin já logado
const redirectIfAdmin = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return res.redirect('/admin/dashboard');
  }
  next();
};

module.exports = { requireAdmin, redirectIfAdmin };
