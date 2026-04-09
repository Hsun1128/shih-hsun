// js/dashboard.js — Analytics dashboard data fetching and chart rendering

// ── Chart.js global theme ────────────────────────────────────────────────
const COLORS = {
  blue:   '#2997ff',
  green:  '#30d158',
  purple: '#bf5af2',
  orange: '#ff9f0a',
  muted:  '#6e6e73',
  border: 'rgba(255,255,255,0.08)',
  cardBg: '#1d1d1f',
};

Chart.defaults.color       = '#a1a1a6';
Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
Chart.defaults.font.size   = 12;

function gridOpts() {
  return { color: COLORS.border, drawBorder: false };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatTrackId(id) {
  const map = {
    cta_download_cv_zh:        'Download CV (ZH)',
    cta_download_cv_en:        'Download CV (EN)',
    cta_get_in_touch:          'Get in Touch',
    cta_view_work:             'View My Work',
    cta_view_all_certificates: 'View All Certs',
    cta_back_to_site:          'Back to Site',
    contact_linkedin:          'LinkedIn',
    contact_github:            'GitHub',
  };
  return map[id] || id.replace(/^cta_|^contact_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatSection(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatSeconds(s) {
  if (s === null || s === undefined) return '—';
  const n = Math.round(Number(s));
  if (n >= 60) return `${Math.floor(n / 60)}m ${n % 60}s`;
  return `${n}s`;
}

// Animated counter for numeric KPI values
function animateCounter(el, target, suffix = '') {
  const duration = 800;
  const start = performance.now();
  const isFloat = String(target).includes('.');
  el.classList.remove('loading');
  el.classList.add('animated');

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = isFloat
      ? (ease * parseFloat(target)).toFixed(1)
      : Math.round(ease * parseInt(target));
    el.textContent = current + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function setKpi(id, value, animate = true) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!value || value === '—') {
    el.classList.remove('loading');
    el.textContent = '—';
    return;
  }
  // Animate numeric values
  const numMatch = String(value).match(/^([\d.]+)(.*)$/);
  if (animate && numMatch) {
    animateCounter(el, numMatch[1], numMatch[2]);
  } else {
    el.classList.remove('loading');
    el.textContent = value;
  }
}

function renderLegend(containerId, labels, colors) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = labels.map((label, i) => `
    <span class="legend-item">
      <span class="legend-dot" style="background:${colors[i % colors.length]}"></span>
      ${label}
    </span>`).join('');
}

// ── Chart renderers ──────────────────────────────────────────────────────

// State for visitor trend chart
let visitorChart = null;
let allDailyData = [];
let currentView  = 'daily';
let currentDays  = 14;

function buildTrendDataset(data, view) {
  const labels = data.map(r => {
    const d = new Date(r.visit_date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  let values;
  if (view === 'cumulative') {
    let running = 0;
    values = data.map(r => { running += Number(r.visitors); return running; });
  } else {
    values = data.map(r => Number(r.visitors));
  }
  return { labels, values };
}

function renderDailyVisits(data) {
  allDailyData = data;
  const { labels, values } = buildTrendDataset(data, currentView);

  const isCumulative = currentView === 'cumulative';
  const color = isCumulative ? COLORS.green : COLORS.blue;
  const bg    = isCumulative ? 'rgba(48,209,88,0.08)' : 'rgba(41,151,255,0.08)';

  const canvas = document.getElementById('chart-daily-visits');
  if (visitorChart) { visitorChart.destroy(); visitorChart = null; }

  visitorChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: isCumulative ? 'Total Visitors' : 'Daily Visitors',
        data: values,
        borderColor: color,
        backgroundColor: bg,
        pointBackgroundColor: color,
        pointRadius: 4,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500, easing: 'easeInOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: ctx => ctx[0].label,
            label: ctx => ` ${ctx.parsed.y} ${isCumulative ? 'total' : 'visitors'}`,
          },
        },
      },
      scales: {
        x: { grid: gridOpts(), ticks: { maxRotation: 0, maxTicksLimit: 7 } },
        y: { grid: gridOpts(), beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
}

async function updateTrendChart(days, view) {
  currentDays = days;
  currentView = view;
  const { data } = await window._supabase.rpc('get_daily_visits', { days });
  if (data) renderDailyVisits(data);
}

function initTrendControls() {
  document.getElementById('view-toggle')?.addEventListener('click', e => {
    const btn = e.target.closest('.toggle-btn');
    if (!btn) return;
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentView = btn.dataset.view;
    renderDailyVisits(allDailyData);
  });

  document.getElementById('range-toggle')?.addEventListener('click', e => {
    const btn = e.target.closest('.range-btn');
    if (!btn) return;
    document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateTrendChart(parseInt(btn.dataset.days), currentView);
  });
}

function renderReferrers(data) {
  const labels  = data.map(r => r.source);
  const values  = data.map(r => Number(r.visits));
  const palette = [COLORS.blue, COLORS.green, COLORS.orange, COLORS.purple, COLORS.muted];

  new Chart(document.getElementById('chart-referrers'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: palette,
        borderColor: COLORS.cardBg,
        borderWidth: 3,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} visits` } },
      },
    },
  });

  renderLegend('legend-referrers', labels, palette);
}

function renderDevices(data) {
  const labels  = data.map(r => r.device_type);
  const values  = data.map(r => Number(r.visitors));
  const palette = [COLORS.blue, COLORS.green, COLORS.purple];

  new Chart(document.getElementById('chart-devices'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: palette,
        borderColor: COLORS.cardBg,
        borderWidth: 3,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} visitors` } },
      },
    },
  });

  renderLegend('legend-devices', labels, palette);

  // Cross-metric table: avg scroll + avg stay per device
  const tableEl = document.getElementById('device-cross-metric');
  if (tableEl && data.length) {
    tableEl.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Device</th>
            <th>Avg Scroll</th>
            <th>Avg Stay</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(r => `
            <tr>
              <td>${r.device_type}</td>
              <td>${r.avg_scroll_depth}%</td>
              <td>${formatSeconds(r.avg_page_stay_s)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  }
}

function renderSections(data) {
  const labels     = data.map(r => formatSection(r.section));
  const values     = data.map(r => parseFloat(r.avg_seconds));
  const palette    = [COLORS.blue, COLORS.green, COLORS.purple, COLORS.orange];
  const barColors  = values.map((_, i) => palette[i % palette.length]);

  new Chart(document.getElementById('chart-sections'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Avg seconds',
        data: values,
        backgroundColor: barColors,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: gridOpts(), beginAtZero: true },
        y: { grid: { display: false } },
      },
    },
  });
}

function renderCtaClicks(data) {
  const labels    = data.map(r => formatTrackId(r.track_id));
  const values    = data.map(r => Number(r.clicks));

  new Chart(document.getElementById('chart-cta'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Clicks',
        data: values,
        backgroundColor: COLORS.purple,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: gridOpts(), beginAtZero: true, ticks: { precision: 0 } },
        y: { grid: { display: false } },
      },
    },
  });
}

function renderScrollDist(data) {
  const labels    = data.map(r => r.depth_bucket);
  const values    = data.map(r => Number(r.sessions));
  const barColors = [COLORS.muted, COLORS.orange, COLORS.green, COLORS.blue];

  new Chart(document.getElementById('chart-scroll-dist'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Sessions',
        data: values,
        backgroundColor: barColors,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: gridOpts(), beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
}

// ── Main orchestrator ────────────────────────────────────────────────────

async function initDashboard() {
  const tsEl = document.getElementById('dash-last-updated');
  if (tsEl) tsEl.textContent = new Date().toLocaleTimeString();

  try {
    initTrendControls();

    const [
      { data: overview,   error: e1 },
      { data: daily,      error: e2 },
      { data: devices,    error: e3 },
      { data: sections,   error: e4 },
      { data: ctas,       error: e5 },
      { data: referrers,  error: e6 },
      { data: scrollDist, error: e7 },
    ] = await Promise.all([
      window._supabase.rpc('get_dashboard_overview'),
      window._supabase.rpc('get_daily_visits', { days: currentDays }),
      window._supabase.rpc('get_device_breakdown'),
      window._supabase.rpc('get_section_engagement'),
      window._supabase.rpc('get_cta_clicks'),
      window._supabase.rpc('get_referrer_sources'),
      window._supabase.rpc('get_scroll_depth_distribution'),
    ]);

    // KPI cards + footer visitor stats
    if (overview && overview.length) {
      const o = overview[0];
      setKpi('kpi-total-visits', o.total_visits);
      setKpi('kpi-today',        o.today_visits);
      setKpi('kpi-unique',       o.unique_visitors);
      setKpi('kpi-scroll',       o.avg_scroll_depth != null ? `${o.avg_scroll_depth}%` : '—');

      // Populate footer counts (tracking.js not loaded on dashboard)
      const populateFooter = () => {
        const countEl = document.getElementById('visit-count');
        const todayEl = document.getElementById('visit-count-today');
        if (countEl) countEl.textContent = o.unique_visitors;
        if (todayEl) todayEl.textContent = o.today_visits;
      };
      populateFooter();
      // Also run after footer loads (race condition safety)
      document.getElementById('footer-placeholder')
        ?.addEventListener('componentLoaded', populateFooter);
    }

    if (daily      && daily.length)      renderDailyVisits(daily);
    if (referrers  && referrers.length)  renderReferrers(referrers);
    if (devices    && devices.length)    renderDevices(devices);
    if (sections   && sections.length)   renderSections(sections);
    if (ctas       && ctas.length)       renderCtaClicks(ctas);
    if (scrollDist && scrollDist.length) renderScrollDist(scrollDist);

  } catch (err) {
    console.error('Dashboard fetch error:', err);
    const wrap = document.querySelector('.dash-wrap');
    if (wrap) {
      wrap.insertAdjacentHTML('afterbegin',
        '<div class="dash-error">Could not load analytics data. Please try again later.</div>');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (window._supabase) {
    initDashboard();
  } else {
    setTimeout(initDashboard, 100);
  }
});
