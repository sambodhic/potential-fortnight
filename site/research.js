const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const search = document.querySelector('#research-search');
const filter = document.querySelector('#research-filter');
const country = document.querySelector('#research-country');
let candidates = [];
function renderCandidates() {
  const query = search.value.trim().toLowerCase();
  const filtered = candidates.filter(p => (!country.value || p.country === country.value) && (!filter.value || p.screening.startsWith(filter.value)) && [p.country,p.location,p.title,p.potentialContactOrganization,p.region].join(' ').toLowerCase().includes(query));
  document.querySelector('#research-count').textContent = `${filtered.length} candidates · ${new Set(filtered.map(p=>p.country)).size} countries`;
  document.querySelector('#research-list').innerHTML = filtered.map(p => `<article class="card research-card" id="${escape(p.id)}"><div class="card-body"><div class="card-meta"><span>${escape(p.region)}</span><span>${escape(p.country)}</span></div><p class="research-status">${escape(p.screening)}</p><h2>${escape(p.title)}</h2><p class="card-summary">${escape(p.location)}</p><h3>Reported scope</h3><p>${escape(p.reportedScope)}</p><details><summary>Sources & review notes</summary><h3>Potential organization</h3><p>${escape(p.potentialContactOrganization)}</p><p class="form-note">${escape(p.contactBasis)}</p><h3>What needs checking</h3><p>${escape(p.reviewNotes)}</p>${p.reportedCost ? `<h3>Reported amount</h3><p>${escape(p.reportedCost.amount.toLocaleString())} ${escape(p.reportedCost.currency)} — ${escape(p.reportedCost.meaning)}</p>` : ''}<h3>Sources</h3><ul>${p.sources.filter(s=>/^https?:\/\//.test(s.url)).map((s,i)=>`<li><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">Source ${i+1} ↗</a><p class="form-note">${escape(s.publishedOrUpdated || 'Date not established')} · ${escape(s.access)}</p></li>`).join('')}</ul><h3>Next step</h3><p>${escape(p.nextStep)}</p></details><div class="card-bottom"><span>Not locally verified</span><span>Researched ${escape(p.researchDate)}</span></div></div></article>`).join('');
  const message = document.querySelector('#research-message');
  message.hidden = filtered.length > 0;
  message.textContent = candidates.length ? 'No matches. Try another search or reset the filters.' : 'No research candidates have been added yet.';
}
search.addEventListener('input',renderCandidates);
filter.addEventListener('change',renderCandidates);
country.addEventListener('change',renderCandidates);
document.querySelector('#research-reset').addEventListener('click',()=>{search.value='';filter.value='';country.value='';renderCandidates();});
fetch('research.json').then(response=>{if(!response.ok)throw Error('Load failed');return response.json();}).then(data=>{candidates=data;country.innerHTML='<option value="">All countries</option>'+[...new Set(data.map(p=>p.country))].sort((a,b)=>a.localeCompare(b)).map(name=>`<option value="${escape(name)}">${escape(name)}</option>`).join('');renderCandidates();}).catch(()=>{document.querySelector('#research-count').textContent='Candidates unavailable';const message=document.querySelector('#research-message');message.hidden=false;message.textContent='The research list could not load. Please refresh to try again.';});
