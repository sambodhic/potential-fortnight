const $ = (selector) => document.querySelector(selector);
const styles = {
  Water: ['≈', '#eaf1e8', '#769b81'],
  Sanitation: ['◌', '#edf0e0', '#909c5d'],
  Bridges: ['⌒', '#f1ebdf', '#aa9268'],
  Schools: ['▤', '#e8edf2', '#8093ac'],
  Electricity: ['ϟ', '#f5efd9', '#b5a15b'],
  Accessibility: ['↗', '#eee9ef', '#a08ca5'],
  Healthcare: ['+', '#eee9ef', '#a08ca5'],
  Infrastructure: ['▦', '#edf0e0', '#909c5d'],
};
let records = [], category = '', visibleLimit = 24;
const sourceIcon = p => p.origin === 'report'
  ? '<span class="origin-icon" title="From a research report"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2h7l4 4v12H5zM12 2v5h4M8 10h5M8 13h5"/></svg><span class="sr-only">From a research report</span></span>'
  : '<span class="origin-icon" title="From the curated directory"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="3"/><path d="M7 3v8l3-2 3 2V3"/></svg><span class="sr-only">From the curated directory; see details for verification status</span></span>';
function verificationIndicator(p) {
  const unverified = p.isExample || !p.lastVerified || /needs verification|unverified|not verified/i.test(p.status);
  if (!unverified) return e(p.status);
  return `<span class="verification-badge" title="Current conditions have not been locally verified"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m10 2 8 15H2z"/><path d="M10 7v4m0 3v.1"/></svg>${p.isExample ? 'Example · unverified' : 'Unverified'}</span>`;
}
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e = escapeHTML;
const dialog = $('#detail');
const needsMap = setupIssueMap({
  getCandidates: () => records,
  getCountry: () => $('#country').value,
  matchesNeed: p => matchesFilters(p, false),
  setCountry: value => { $('#country').value = value; filterNeeds(); },
});
function matchesFilters(p, includeCountry = true) {
  const query = $('#search').value.trim().toLowerCase();
  return (!category || p.categories.includes(category)) &&
    (!includeCountry || !$('#country').value || p.country === $('#country').value) &&
    [p.title, p.summary, p.country, p.location, ...p.categories, ...p.needs].join(' ').toLowerCase().includes(query);
}
function render() {
  const filtered = records.filter(p => matchesFilters(p));
  needsMap.render();
  $('#result-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'need' : 'needs'}${category ? ` in ${category.toLowerCase()}` : ' to explore'}`;
  $('#clear').hidden = !$('#search').value.trim() && !category && !$('#country').value;
  $('#empty').hidden = filtered.length > 0;
  $('#load-more').hidden = filtered.length <= visibleLimit;
  $('#problems').innerHTML = filtered.slice(0, visibleLimit).map(p => {
    const [icon, tint, accent] = styles[p.category] || ['↗', '#edf0e0', '#909c5d'];
    return `<article class="card"><div class="card-top" style="--tint:${tint};--accent:${accent}"><span class="card-icon" aria-hidden="true">${icon}</span>${p.isExample ? '<span class="sample-tag">Illustrative example</span>' : ''}</div><div class="card-body"><div class="card-meta"><span>${e(p.categories.join(" · "))}</span><span>${e(p.country)}</span></div><h3><a href="#problem/${encodeURIComponent(p.id)}">${e(p.title)}</a></h3><p class="card-summary">${e(p.summary)}</p><div class="needs">${p.needs.slice(0, 3).map(n => `<span class="need">${e(n)}</span>`).join('')}</div><div class="card-bottom"><span>${verificationIndicator(p)}</span><a href="#problem/${encodeURIComponent(p.id)}" aria-label="Explore ${e(p.title)}">View need</a></div></div></article>`;
  }).join('');
  document.querySelectorAll('.category').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
}
function reset() { visibleLimit = 24; category = ''; $('#search').value = ''; $('#country').value = ''; render(); }
function show(content) { dialog.removeAttribute('aria-labelledby'); $('#detail-content').innerHTML = content; if (!dialog.open) dialog.showModal(); }
function openFromHash() {
  if (!location.hash.startsWith('#problem/')) { if (dialog.open) dialog.close(); return; }
  let id;
  try { id = decodeURIComponent(location.hash.slice(9)); } catch { id = ''; }
  const p = records.find(record => record.id === id);
  if (!p) { show('<h2>Problem not found</h2><p>This record may have moved or been removed. Close this window to explore other problems.</p>'); return; }
  show(`<p class="eyebrow">${sourceIcon(p)}${e(p.category)} · ${e(p.country)}</p><h2>${e(p.title)}</h2><span class="detail-label">${e(p.isExample ? 'Illustrative example · not verified' : p.status)}</span><p style="margin-top:20px">${e(p.description || p.summary)}</p><h3>Where it happens</h3><p>${e(p.location)}, ${e(p.country)}</p><h3>Who it affects</h3><p>${e(p.affected || 'Not yet documented.')}</p><section class="help-needs"><h3>What’s needed</h3><ul>${p.needs.map(need => `<li>${e(need)}</li>`).join('')}</ul><button class="button primary" id="offer-help">I can help ↗</button></section><h3>Evidence & sources</h3>${p.sources.length ? `<ul>${p.sources.map(source => `<li><a href="${e(source.url)}" target="_blank" rel="noopener noreferrer">${e(source.label)} ↗</a></li>`).join('')}</ul>` : '<p>No sources have been added yet.</p>'}${p.reportedAt ? `<h3>Report date</h3><p>${e(p.reportedAt)} · Current conditions still need checking.</p>` : ''}<h3>Last verified</h3><p>${e(p.lastVerified || 'Not yet verified')}</p>${p.isExample ? '<p class="sample-notice">This is a fictional sample, not a real project seeking help. Replace it with sourced information before publishing your directory.</p>' : ''}<button class="button" id="copy-link">Copy link ↗</button>`);
  $('#offer-help').addEventListener('click', () => openHelpForm(p));
  $('#copy-link').addEventListener('click', async event => {
    try { await navigator.clipboard.writeText(location.href); event.target.textContent = 'Link copied ✓'; }
    catch { event.target.textContent = 'Copy the URL from your address bar'; }
  });
}
function filterNeeds() { visibleLimit = 24; render(); }
$('#load-more').addEventListener('click', () => { visibleLimit += 24; render(); });
$('#search').addEventListener('input', filterNeeds);
$('#country').addEventListener('change', filterNeeds);
$('#clear').addEventListener('click', reset);
$('#reset').addEventListener('click', reset);
$('#categories').addEventListener('click', event => { const button = event.target.closest('button'); if (button) { category = button.dataset.category; filterNeeds(); } });
$('.close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { const box = dialog.getBoundingClientRect(); if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close(); });
dialog.addEventListener('close', () => { if (location.hash.startsWith('#problem/')) history.replaceState(null, '', location.pathname + location.search + '#explore'); });
window.addEventListener('hashchange', openFromHash);
function openSubmissionForm() {
  show(`<p class="eyebrow">GROW THE DIRECTORY</p><h2 id="submission-title">Make a local need visible.</h2>
    <p>Tell us about a problem in your community. A little detail can be the start of something good.</p>
    <form id="submission-form">
      <div class="form-row"><label>Your name<input name="name" autocomplete="name" maxlength="100" required></label>
      <label>Your email<input name="email" type="email" autocomplete="email" maxlength="254" required></label></div>
      <label>What’s the problem?<input name="title" placeholder="e.g. A broken water pump at a village school" maxlength="180" required></label>
      <div class="form-row"><label>Country<input name="country" autocomplete="country-name" maxlength="100" required></label>
      <label>Town, village, or region<input name="location" maxlength="200" required></label></div>
      <label>Category<select name="category" required><option value="">Choose a category</option>${Object.keys(styles).map(c => `<option>${e(c)}</option>`).join('')}<option>Other</option></select></label>
      <label>Tell us more<textarea name="description" rows="4" minlength="20" maxlength="6000" placeholder="What is happening, who is affected, and what help is needed?" required></textarea></label>
      <label>Source or reference link <span class="optional">(optional)</span><input name="source" type="url" placeholder="https://" maxlength="2000"></label>
      <div class="form-trap" aria-hidden="true"><label>Leave this blank<input name="_honey" tabindex="-1" autocomplete="off"></label></div>
      <p class="form-note">Your submission will be sent to <a href="mailto:problems@unsolved.fyi">problems@unsolved.fyi</a> via FormSubmit for review. Your email is only for follow-up and won’t be published.</p>
      <p id="submission-error" class="form-error" role="alert" hidden></p>
      <button class="button primary" type="submit">Submit problem <span aria-hidden="true">↗</span></button>
      <span id="submission-status" class="form-note" role="status" aria-live="polite"></span>
    </form>`);
  dialog.setAttribute('aria-labelledby', 'submission-title');
  $('#submission-form').addEventListener('submit', submitProblem);
}
function openHelpForm(problem) {
  show(`<p class="eyebrow">A LITTLE HELP CAN GO A LONG WAY</p><h2 id="submission-title">Offer a hand.</h2>
    <p>For: <strong>${e(problem.title)}</strong><br>${e(problem.location)}, ${e(problem.country)}</p>
    ${problem.isExample ? '<p class="sample-notice">This is an illustrative example, not a real request for help. Any offer will be marked as a demo.</p>' : ''}
    <form id="submission-form">
      <div class="form-row"><label>Your name<input name="name" autocomplete="name" maxlength="100" required></label>
      <label>Your email<input name="email" type="email" autocomplete="email" maxlength="254" required></label></div>
      <label>How can you help?<select name="help_type" required><option value="">Choose an option</option><option>Expertise</option><option>Materials</option><option>Funding</option><option>Local coordination</option><option>Something else</option></select></label>
      <label>Where can you help?<select name="availability" required><option value="">Choose an option</option><option>I’m nearby</option><option>I can help remotely</option><option>Both locally and remotely</option></select></label>
      <label>Your offer<textarea name="message" rows="4" maxlength="4000" required placeholder="What could you offer? Share any relevant experience or availability."></textarea></label>
      <div class="form-trap" aria-hidden="true"><label>Leave this blank<input name="_honey" tabindex="-1" autocomplete="off"></label></div>
      <p class="form-note">Your offer will be sent to <a href="mailto:problems@unsolved.fyi">problems@unsolved.fyi</a> via FormSubmit. We’ll contact you about next steps and ask before sharing your contact details.</p>
      <p id="submission-error" class="form-error" role="alert" hidden></p>
      <div class="form-actions"><button class="button primary" type="submit">Send offer ↗</button><button class="button" type="button" id="back-to-problem">Back to problem</button></div>
      <span id="submission-status" class="form-note" role="status" aria-live="polite"></span>
    </form>`);
  dialog.setAttribute('aria-labelledby', 'submission-title');
  dialog.scrollTop = 0;
  $('#back-to-problem').addEventListener('click', openFromHash);
  $('#submission-form').addEventListener('submit', event => submitProblem(event, problem));
}
async function submitProblem(event, problem = null) {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.sending || !form.reportValidity()) return;
  const payload = Object.fromEntries(new FormData(form));
  if (payload._honey) return;
  for (const name of (problem ? ['name', 'message'] : ['name', 'title', 'country', 'location', 'description'])) {
    if (!payload[name].trim()) { form.elements[name].focus(); return; }
    payload[name] = payload[name].trim();
  }
  payload._subject = problem ? `Unsolved.fyi — ${problem.isExample ? 'Demo help offer' : 'Help offer'} — ${problem.id}` : 'Unsolved.fyi — New problem submission';
  if (problem) {
    payload.problem_id = problem.id;
    payload.problem_title = problem.title;
    payload.problem_url = new URL(`#problem/${encodeURIComponent(problem.id)}`, location.href).href;
    payload.illustrative_example = problem.isExample ? 'Yes — demo only' : 'No';
  }
  payload._template = 'table';
  const button = form.querySelector('button[type="submit"]');
  const error = form.querySelector('#submission-error');
  const status = form.querySelector('#submission-status');
  const originalButton = button.innerHTML;
  form.dataset.sending = 'true';
  button.disabled = true;
  button.textContent = 'Sending…';
  error.hidden = true;
  status.textContent = problem ? 'Please wait while we send your offer.' : 'Please wait while we send your problem.';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch('https://formsubmit.co/ajax/problems@unsolved.fyi', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload), signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok || !(result.success === true || result.success === 'true')) throw new Error('Submission not accepted');
    // A closed/reopened dialog must not be overwritten by an earlier request.
    if (!form.isConnected || !dialog.open) return;
    show(`<div class="submission-success"><span class="success-mark" aria-hidden="true">✓</span><p class="eyebrow">A STARTING POINT FOR CHANGE</p><h2 id="submission-title" tabindex="-1">${problem ? 'Thank you for offering to help.' : 'Thank you for sharing.'}</h2>${problem ? '<p>We’ll review your offer and get in touch about possible next steps.</p>' : '<p>You’ve helped make a local need visible. We’ll review your submission and add it to the site soon, once the details are verified.</p><p>We may reach out by email if we need a little more information.</p>'}<button class="button primary" id="submission-done">Back to exploring ↗</button></div>`);
    dialog.setAttribute('aria-labelledby', 'submission-title');
    $('#submission-title').focus();
    $('#submission-done').addEventListener('click', () => dialog.close());
  } catch (failure) {
    error.textContent = 'We couldn’t confirm your submission. Your details are still here. Please try again, or email problems@unsolved.fyi directly.';
    error.hidden = false;
    status.textContent = '';
  } finally {
    clearTimeout(timeout);
    delete form.dataset.sending;
    button.disabled = false;
    button.innerHTML = originalButton;
  }
}
document.querySelectorAll('[data-share-need]').forEach(button => button.addEventListener('click', openSubmissionForm));
$('#contribute-button').addEventListener('click', openSubmissionForm);
$('.header-cta').addEventListener('click', event => { event.preventDefault(); openSubmissionForm(); });
async function init() {
  try {
    const results = await Promise.allSettled(['problems.json', 'research.json'].map(async url => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Needs could not be loaded');
      return response.json();
    }));
    if (results.every(result => result.status === 'rejected')) throw new Error('Needs unavailable');
    const curated = results[0].status === 'fulfilled' ? results[0].value : [];
    const reports = results[1].status === 'fulfilled' ? results[1].value : [];
    records = mergeNeeds(curated, reports);
    $('#load-warning').hidden = results.every(result => result.status === 'fulfilled');
    const countries = [...new Set(records.map(p => p.country))].sort();
    $('#country').innerHTML += countries.map(c => `<option value="${e(c)}">${e(c)}</option>`).join('');
    const categories = [...new Set(records.flatMap(p => p.categories))].sort();
    $('#categories').innerHTML = ['', ...categories].map(c => `<button class="category" data-category="${e(c)}" aria-pressed="${!c}">${c ? `${styles[c]?.[0] || '↗'} &nbsp;${e(c)}` : 'All needs'}</button>`).join('');
    render(); openFromHash();
  } catch (error) { $('#result-count').textContent = 'Problems unavailable'; $('#error').hidden = false; console.error(error); }
}
init();
