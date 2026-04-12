// ===== SIDEBAR TOGGLE =====
document.addEventListener('DOMContentLoaded', () => {
  // Close sidebar on mobile when clicking outside
  document.addEventListener('click', e => {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.querySelector('.sidebar-toggle');
    if (sidebar && window.innerWidth <= 768) {
      if (!sidebar.contains(e.target) && !toggle?.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
  });

  // Auto-hide alerts
  document.querySelectorAll('.alert').forEach(alert => {
    setTimeout(() => {
      alert.style.transition = 'opacity 0.5s';
      alert.style.opacity = '0';
      setTimeout(() => alert.remove(), 500);
    }, 4000);
  });
});
