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
