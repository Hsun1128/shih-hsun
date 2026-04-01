// Scroll reveal
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Mobile nav
function toggleMobileNav() {
  const mobileNav = document.getElementById('mobileNav');
  if (mobileNav) {
    mobileNav.classList.toggle('active');
  }
}
function closeMobileNav() {
  const mobileNav = document.getElementById('mobileNav');
  if (mobileNav) {
    mobileNav.classList.remove('active');
  }
}

// Active nav link on scroll
const sections = document.querySelectorAll('section[id]');
if (sections.length > 0) {
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY + 100;
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      const link = document.querySelector(`.nav-links a[href="#${id}"]`);
      if (link) {
        if (scrollY >= top && scrollY < top + height) {
          link.style.color = '#f5f5f7';
        } else {
          link.style.color = '';
        }
      }
    });
  });
}

// Lightbox
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxTitle = document.getElementById('lightboxTitle');
const lightboxClose = document.querySelector('.lightbox-close');
const lightboxTriggers = document.querySelectorAll('.lightbox-trigger');

function openLightbox(trigger) {
  if (!lightbox || !lightboxImg || !lightboxTitle) return;
  const src = trigger.getAttribute('data-src');
  const title = trigger.getAttribute('data-title');
  lightboxImg.src = src;
  lightboxImg.alt = title;
  lightboxTitle.textContent = title;
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Log specialized event for lightbox on main page
  logMainPageLightbox(title, src);
}

function closeLightbox() {
  if (!lightbox || !lightboxImg) return;
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
  setTimeout(() => { lightboxImg.src = ''; }, 300);
}

if (lightboxTriggers.length > 0) {
  lightboxTriggers.forEach(trigger => {
    trigger.style.cursor = 'pointer';
    trigger.addEventListener('click', () => openLightbox(trigger));
  });
}

if (lightboxClose) {
  lightboxClose.addEventListener('click', closeLightbox);
}
if (lightbox) {
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lightbox && lightbox.classList.contains('active')) closeLightbox(); });

function logMainPageLightbox(title, src) {
  if (window.visitorId && window._supabase) {
    const itemId = src ? src.split('/').pop().split('.')[0] : 'unknown';
    window._supabase.from('behavior_logs').insert({
      fingerprint: window.visitorId,
      event_type: 'lightbox_view',
      page_section: 'main_page_gallery',
      details: { item_id: itemId }
    }).then(({ error }) => { if (error) console.error('Lightbox log error:', error); });
  }
}

// document.addEventListener('DOMContentLoaded', trackVisitor); // Removed - handled by components.js after footer load
