(() => {
  const id = window.UNSOLVED_ANALYTICS_ID || '';
  const configured = /^G-[A-Z0-9]+$/.test(id);
  const key = 'unsolved-analytics-consent';
  let choice;
  try { choice = localStorage.getItem(key); } catch {}
  let started = false;
  function start() {
    if (!configured || choice !== 'granted' || started) return;
    started = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', id, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: location.origin + location.pathname,
      page_referrer: ''
    });
    window.gtag('event', 'page_view', {
      page_location: location.origin + location.pathname,
      page_title: document.title, page_referrer: ''
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.append(script);
  }
  const panel = document.createElement('section');
  panel.className = 'analytics-choice';
  panel.setAttribute('aria-label', 'Analytics preferences');
  panel.hidden = true;
  panel.innerHTML = '<p>Allow optional Google Analytics cookies to help us understand site visits? <a href="privacy.html">Read our privacy page</a>.</p><div><button class="button" type="button" data-decline>Decline</button> <button class="button primary" type="button" data-allow>Allow analytics</button></div>';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  panel.prepend(status);
  document.body.append(panel);
  function show() {
    panel.hidden = false;
    status.textContent = configured ? 'Analytics is ' + (choice === 'granted' ? 'allowed.' : 'off.') : 'Analytics is not configured and is off.';
    panel.querySelector('[data-allow]').disabled = !configured;
  }
  function choose(value) {
    choice = value;
    try { localStorage.setItem(key, value); } catch {}
    window['ga-disable-' + id] = value !== 'granted';
    panel.hidden = true;
    if (value === 'granted') start();
    else if (started) location.reload();
  }
  panel.querySelector('[data-decline]').addEventListener('click', () => choose('denied'));
  panel.querySelector('[data-allow]').addEventListener('click', () => choose('granted'));
  document.querySelectorAll('[data-analytics-settings]').forEach(button => button.addEventListener('click', () => {
    show();
    panel.querySelector('[data-decline]').focus();
  }));
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) location.reload();
  });
  if (configured && !['granted', 'denied'].includes(choice)) show();
  start();
})();
