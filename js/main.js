// ================================================
// ApStore - Main JS
// ================================================

document.addEventListener('DOMContentLoaded', () => {

  // Mobile menu toggle
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');
  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => mainNav.classList.toggle('open'));
  }

  // Search
  const searchForm = document.getElementById('searchForm');
  if (searchForm) {
    searchForm.addEventListener('submit', e => {
      e.preventDefault();
      const q = document.getElementById('searchInput').value.trim();
      if (q) window.location.href = `catalogo.html?q=${encodeURIComponent(q)}`;
    });
  }

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(target)?.classList.add('active');
    });
  });

  // Qty buttons
  document.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('.qty-input');
      if (!input) return;
      const v = parseInt(input.value) || 1;
      if (btn.dataset.action === 'inc') input.value = v + 1;
      else if (btn.dataset.action === 'dec' && v > 1) input.value = v - 1;
    });
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });

});

// Auth check helper
function isLoggedIn() { return !!localStorage.getItem('apstore_user'); }
function getUser() { return JSON.parse(localStorage.getItem('apstore_user') || 'null'); }
