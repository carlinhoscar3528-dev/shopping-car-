// ===== ADD TO CART =====
async function addToCart(productId, btn) {
  const qty = document.getElementById('qty')?.value || 1;
  try {
    const res = await fetch('/carrinho/adicionar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produto_id: productId, qty: parseInt(qty) })
    });
    const data = await res.json();
    if (data.success) {
      // Update cart badge
      const badge = document.getElementById('cart-count');
      if (badge) badge.textContent = data.cartCount;

      // Button feedback
      if (btn) {
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Adicionado!';
        btn.classList.add('added');
        setTimeout(() => {
          btn.innerHTML = original;
          btn.classList.remove('added');
        }, 2000);
      }

      showToast(data.msg || 'Produto adicionado!');
    }
  } catch (e) {
    console.error('Erro ao adicionar ao carrinho:', e);
  }
}

// ===== TOAST =====
function showToast(msg) {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<i class="fas fa-check-circle"></i> ${msg}`;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== NAV TOGGLE =====
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('navToggle');
  const list = document.getElementById('navList');
  if (toggle && list) {
    toggle.addEventListener('click', () => list.classList.toggle('open'));
  }

  // Cart quantity update in cart page
  document.querySelectorAll('.qty-form button').forEach(btn => {
    btn.addEventListener('click', function (e) {
      const qty = parseInt(this.value);
      if (qty <= 0) {
        const msg = 'Produto removido do carrinho.';
        // allow form to submit
      }
    });
  });
});

// ===== SMOOTH SCROLL to #produtos =====
document.querySelectorAll('a[href="#produtos"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' });
  });
});

// ===== SCROLL REVEAL =====
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.product-card').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.4s ease ${i * 0.05}s, transform 0.4s ease ${i * 0.05}s`;
    observer.observe(el);
  });
});
