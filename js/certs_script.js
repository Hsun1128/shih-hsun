// Mobile nav
function toggleMobileNav() {
  const mobileNav = document.getElementById('mobileNav');
  if (mobileNav) mobileNav.classList.toggle('active');
}
function closeMobileNav() {
  const mobileNav = document.getElementById('mobileNav');
  if (mobileNav) mobileNav.classList.remove('active');
}

const chips = Array.from(document.querySelectorAll('.chip'));
const cards = Array.from(document.querySelectorAll('.card'));
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxPdf = document.getElementById('lightboxPdf');
const lightboxTitle = document.getElementById('lightboxTitle');
const lightboxDownload = document.getElementById('lightboxDownload');
const lightboxClose = document.querySelector('.lightbox-close');

function setActive(el) {
  chips.forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function applyFilter(tag) {
  cards.forEach(card => {
    const tags = (card.getAttribute('data-tags') || '').split(/\s+/).filter(Boolean);
    const show = tag === 'all' || tags.includes(tag);
    card.style.display = show ? '' : 'none';
  });
}

chips.forEach(chip => {
  const filter = chip.getAttribute('data-filter');
  if (filter) {
    chip.setAttribute('data-track-id', `cert_filter_${filter}`);
  }
  chip.addEventListener('click', () => {
    const filter = chip.getAttribute('data-filter');
    setActive(chip);
    applyFilter(filter);
  });
});

function openLightbox(card) {
  if (!lightbox || !lightboxTitle || !lightboxDownload) return;
  const src = card.getAttribute('data-src');
  const title = card.getAttribute('data-title');
  const type = card.getAttribute('data-type');

  lightboxTitle.textContent = title;
  lightboxDownload.href = src;

  if (type === 'pdf') {
    if (lightboxImg) lightboxImg.style.display = 'none';
    if (lightboxPdf) {
      lightboxPdf.style.display = 'block';
      lightboxPdf.src = src;
    }
  } else {
    if (lightboxPdf) lightboxPdf.style.display = 'none';
    if (lightboxImg) {
      lightboxImg.style.display = 'block';
      lightboxImg.src = src;
      lightboxImg.alt = title;
    }
  }

  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Log certificate view
  logCertificateClick(title, src);
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
  setTimeout(() => {
    if (lightboxImg) lightboxImg.src = '';
    if (lightboxPdf) lightboxPdf.src = '';
  }, 300);
}

cards.forEach(card => {
  card.addEventListener('click', (e) => {
    e.preventDefault();
    openLightbox(card);
  });
});

if (lightboxClose) {
  lightboxClose.addEventListener('click', closeLightbox);
}

if (lightbox) {
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && lightbox && lightbox.classList.contains('active')) {
    closeLightbox();
  }
});

function logCertificateClick(title, src) {
  if (window.visitorId && window._supabase) {
    const itemId = src ? src.split('/').pop().split('.')[0] : 'unknown';
    window._supabase.from('behavior_logs').insert({
      visitor_id: window.visitorId,
      event_type: 'certificate_view',
      page_section: 'cert_grid',
      details: { item_id: itemId }
    }).then(({ error }) => { if (error) console.error('Cert view log error:', error); });
  }
}
