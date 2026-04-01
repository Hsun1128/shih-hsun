// Common tracking and behavior logging logic
let visitorId = null;
let visitorFingerprint = null;
let sectionStartTime = null;
let currentSection = null;
let maxScroll = 0;
let behaviorLoggingInited = false;
window.__trackingPageLoadTime = window.__trackingPageLoadTime || Date.now();

const supabaseUrl = 'https://xywfuhbmukdwcxafjhyy.supabase.co';
const supabaseKey = 'sb_publishable_oOcl0wsgGySjaR1c4LT9hw_4Ms_l_tp';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Expose globally
window._supabase = _supabase;

async function trackVisitor() {
  // Wait a bit for other things to settle
  await new Promise(resolve => setTimeout(resolve, 200));
  try {
    // A. Fingerprint (client-generated)
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    visitorFingerprint = result.visitorId;

    // B. Resolve database visitor_id from RPC function
    const { data: resolvedVisitorId, error: visitorFnError } = await _supabase.rpc('get_or_create_visitor', {
      p_fingerprint: visitorFingerprint
    });

    if (visitorFnError) {
      throw visitorFnError;
    }

    visitorId = resolvedVisitorId;
    window.visitorId = visitorId;

    // Start behavior tracking as early as possible after fingerprint is ready.
    if (!behaviorLoggingInited) {
      initBehaviorLogging();
    }
    
    // C. Date
    const today = new Date().toISOString().split('T')[0];
    const referrer = document.referrer || 'Direct';
    const userAgent = navigator.userAgent;
    const screenSize = `${window.screen.width}x${window.screen.height}`;

    // D. Write to site_logs
    const { error: insertError } = await _supabase
      .from('site_logs')
      .insert({
        visitor_id: visitorId,
        visit_date: today, 
        referrer: referrer, 
        user_agent: userAgent, 
        screen_size: screenSize });

    if (insertError?.code === '23505') {
      console.log('Welcome back!');
    } else if (insertError) {
      console.error('Insert error:', insertError);
    }

    // E. Fetch visitor stats from RPC function
    const { data: statsData, error: statsError } = await _supabase.rpc('get_site_stats');
    if (!statsError) {
      const stats = Array.isArray(statsData) ? statsData[0] : statsData;
      const totalVisitors = stats?.total_visitors ?? stats?.count ?? null;
      const todayVisitors = stats?.today_visitors ?? null;

      const countEl = document.getElementById('visit-count');
      if (countEl && totalVisitors !== null) {
        countEl.innerText = totalVisitors;
      }

      const todayCountEl = document.getElementById('visit-count-today');
      if (todayCountEl && todayVisitors !== null) {
        todayCountEl.innerText = todayVisitors;
      }
    } else {
      console.error('Stats fetch error:', statsError);
    }

  } catch (err) {
    console.error('Visitor tracking failed:', err);
  }
}

function initBehaviorLogging() {
  if (!visitorId || behaviorLoggingInited) return;
  behaviorLoggingInited = true;

  let pagePath = window.location.pathname;
  if (pagePath.endsWith('/index.html')) pagePath = pagePath.slice(0, -10);
  if (pagePath === '') pagePath = '/';

  const pageLoadTime = window.__trackingPageLoadTime || Date.now();
  let hiddenAt = null;
  let leaveDataSent = false;
  let pendingSectionRaf = null;

  function getScrollPercent() {
    const scrollableHeight = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      1
    );
    const percent = Math.round((window.scrollY / scrollableHeight) * 100);
    return Math.max(0, Math.min(100, percent));
  }

  function logStayTime(sectionName, seconds) {
    _supabase.from('behavior_logs').insert({
      visitor_id: visitorId,
      event_type: 'stay_time',
      page_section: sectionName,
      details: { seconds }
    }).then(({ error }) => { if (error) console.error('Stay time log error:', error); });
  }

  function switchSection(nextSection) {
    if (!nextSection || nextSection === currentSection || !sectionStartTime) return;
    const stayTime = Math.round((Date.now() - sectionStartTime) / 1000);
    if (stayTime > 1 && currentSection) {
      logStayTime(currentSection, stayTime);
    }
    currentSection = nextSection;
    sectionStartTime = Date.now();
  }

  function detectSectionByViewportCenter(sectionNodes) {
    const viewportCenterY = window.innerHeight / 2;
    let bestSection = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    sectionNodes.forEach(section => {
      const rect = section.getBoundingClientRect();
      const inView = rect.top <= viewportCenterY && rect.bottom >= viewportCenterY;
      if (inView) {
        bestSection = section.id || section.className;
        bestDistance = -1;
        return;
      }

      if (bestDistance >= 0) {
        const distance = Math.min(
          Math.abs(rect.top - viewportCenterY),
          Math.abs(rect.bottom - viewportCenterY)
        );
        if (distance < bestDistance) {
          bestDistance = distance;
          bestSection = section.id || section.className;
        }
      }
    });

    return bestSection;
  }

  // 1. Section-level stay time (pages with <section> elements)
  const sections = document.querySelectorAll('section');
  if (sections.length > 0) {
    currentSection = detectSectionByViewportCenter(Array.from(sections)) || sections[0]?.id || pagePath;
    sectionStartTime = Date.now();

    const behaviorObserver = new IntersectionObserver(() => {
      const detected = detectSectionByViewportCenter(Array.from(sections));
      switchSection(detected);
    }, { threshold: [0, 0.2, 0.4, 0.6, 0.8] });
    sections.forEach(section => behaviorObserver.observe(section));
  }

  // 2. Click tracking
  document.addEventListener('click', (e) => {
    if (!visitorId) return;
    const { target } = e;
    const trackedEl = target.closest('[data-track-id]');
    if (!trackedEl) return;

    const sectionId = trackedEl.closest('section')?.id || trackedEl.closest('main')?.id || 'body';
    const trackId = trackedEl.getAttribute('data-track-id');

    _supabase.from('behavior_logs').insert({
      visitor_id: visitorId,
      event_type: 'click',
      page_section: sectionId,
      details: {
        track_id: trackId,
        element: trackedEl.tagName
      }
    }).then(({ error }) => { if (error) console.error('Click log error:', error); });
  });

  // 3. Scroll depth: only track actual user scrolling
  window.addEventListener('scroll', () => {
    const scrollPercent = getScrollPercent();
    if (scrollPercent > maxScroll) maxScroll = scrollPercent;

    if (sections.length > 0 && pendingSectionRaf === null) {
      pendingSectionRaf = window.requestAnimationFrame(() => {
        pendingSectionRaf = null;
        const detected = detectSectionByViewportCenter(Array.from(sections));
        switchSection(detected);
      });
    }
  });

  // 4. Page leave — all leave-time metrics collected here
  function sendBeacon(data) {
    const endpoint = `${supabaseUrl}/rest/v1/behavior_logs`;
    const payload = JSON.stringify(data);
    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };
    fetch(endpoint, {
      method: 'POST',
      headers,
      body: payload,
      keepalive: true
    }).catch(() => {});
  }

  function sendLeaveData() {
    if (leaveDataSent || !visitorId) return;
    leaveDataSent = true;

    const finalScroll = getScrollPercent();
    sendBeacon({
      visitor_id: visitorId,
      event_type: 'scroll_depth',
      page_section: pagePath,
      details: { percent: Math.max(maxScroll, finalScroll) }
    });

    if (currentSection && sectionStartTime) {
      const lastStay = Math.round((Date.now() - sectionStartTime) / 1000);
      if (lastStay > 1) {
        sendBeacon({
          visitor_id: visitorId,
          event_type: 'stay_time',
          page_section: currentSection,
          details: { seconds: lastStay }
        });
      }
    }

    const pageStaySeconds = Math.round((Date.now() - pageLoadTime) / 1000);
    if (pageStaySeconds > 1) {
      sendBeacon({
        visitor_id: visitorId,
        event_type: 'page_stay_time',
        page_section: pagePath,
        details: { seconds: pageStaySeconds }
      });
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
    } else if (document.visibilityState === 'visible') {
      if (hiddenAt && sectionStartTime) {
        sectionStartTime += Date.now() - hiddenAt;
      }
      hiddenAt = null;
    }
  });

  window.addEventListener('pagehide', sendLeaveData);
  window.addEventListener('beforeunload', sendLeaveData);
}
