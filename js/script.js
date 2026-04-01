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
}

function closeLightbox() {
  if (!lightbox || !lightboxImg) return;
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
  setTimeout(() => { lightboxImg.src = ''; }, 300);
}

lightboxTriggers.forEach(trigger => {
  trigger.style.cursor = 'pointer';
  trigger.addEventListener('click', () => openLightbox(trigger));
});

if (lightboxClose) {
  lightboxClose.addEventListener('click', closeLightbox);
}
if (lightbox) {
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lightbox && lightbox.classList.contains('active')) closeLightbox(); });

// Visitor Counter logic
const supabaseUrl = 'https://xywfuhbmukdwcxafjhyy.supabase.co';
const supabaseKey = 'sb_publishable_oOcl0wsgGySjaR1c4LT9hw_4Ms_l_tp';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

async function trackVisitor() {
  await new Promise(resolve => setTimeout(resolve, 100));
  try {
    // A. Fingerprint
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    const visitorId = result.visitorId;
    
    // B. Date
    const today = new Date().toISOString().split('T')[0];
    const referrer = document.referrer || 'Direct'; // source url
    const userAgent = navigator.userAgent; // browser info
    const screenSize = `${window.screen.width}x${window.screen.height}`; // screen size

    // C. Write to site_logs (using fingerprint + visit_date as unique key or just checking)
    const { error: insertError } = await _supabase
      .from('site_logs')
      .insert({
        fingerprint: visitorId, 
        visit_date: today, 
        referrer: referrer, 
        user_agent: userAgent, 
        screen_size: screenSize });

    if (insertError?.code === '23505') {
      console.log('Welcome back! You have been counted today.');
    } else if (insertError) {
      console.error('Insert error:', insertError);
    } else {
      console.log('New visit tracked!');
    }

    // D. Fetch total count
    const { count, error: countError } = await _supabase
      .from('site_logs')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      const countEl = document.getElementById('visit-count');
      if (countEl) countEl.innerText = count;
    } else {
      console.error('Count error:', countError);
    }
  } catch (err) {
    console.error('Visitor tracking failed:', err);
  }
}

// document.addEventListener('DOMContentLoaded', trackVisitor); // Removed - handled by components.js after footer load
