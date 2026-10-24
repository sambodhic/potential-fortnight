const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const search = document.querySelector('#research-search');
const filter = document.querySelector('#research-filter');
const country = document.querySelector('#research-country');
let candidates = [];
function renderCandidates() {
  renderMap();
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

// Shared map state stays in sync with the country selector and list filters.
const mapPanel = document.querySelector('.issue-map');
const mapSvg = document.querySelector('#world-map');
const mapDialog = document.querySelector('#map-dialog');
const mapPlaceholder = document.createComment('Inline map position');
mapPanel.before(mapPlaceholder);
let mapData;
let mapView = {x:0,y:0,width:720,height:360};
function updateMapView() {
  mapSvg.setAttribute('viewBox', `${mapView.x} ${mapView.y} ${mapView.width} ${mapView.height}`);
  const scale = mapView.width / 720;
  document.querySelectorAll('.map-pin').forEach(pin => pin.setAttribute('transform', `translate(${pin.dataset.x} ${pin.dataset.y}) scale(${scale})`));
  document.querySelector('#map-zoom-in').disabled = mapView.width <= 45;
  document.querySelector('#map-zoom-out').disabled = mapView.width >= 720;
}
function zoomMap(factor) {
  const width = Math.max(45, Math.min(720, mapView.width * factor));
  const height = width / 2;
  mapView = {x:mapView.x+(mapView.width-width)/2,y:mapView.y+(mapView.height-height)/2,width,height};
  updateMapView();
}
function renderMap() {
  if (!mapData) return;
  const query = search.value.trim().toLowerCase();
  const counts = new Map();
  candidates.filter(p => (!filter.value || p.screening.startsWith(filter.value)) && [p.country,p.location,p.title,p.potentialContactOrganization,p.region].join(' ').toLowerCase().includes(query)).forEach(p => counts.set(p.country, (counts.get(p.country)||0)+1));
  const pins = document.querySelector('#map-pins');
  pins.replaceChildren();
  const missing = [];
  for (const [name,count] of counts) {
    const center = mapData.centers[name];
    if (!center) {missing.push(name);continue;}
    const [lon,lat] = center;
    const pin = document.createElementNS('http://www.w3.org/2000/svg','g');
    pin.classList.add('map-pin');
    pin.dataset.x = (lon+180)*2;
    pin.dataset.y = (90-lat)*2;
    pin.setAttribute('role','button');
    pin.setAttribute('tabindex','0');
    pin.setAttribute('aria-label',`${name}: ${count} ${count===1?'issue':'issues'}. Filter by ${name}`);
    pin.setAttribute('aria-pressed',String(country.value===name));
    pin.innerHTML = `<title>${escape(name)}: ${count} ${count===1?'issue':'issues'}</title><circle r="10"/><text text-anchor="middle" dy=".35em">${count}</text>`;
    const select = () => {country.value=country.value===name?'':name;renderCandidates();};
    pin.addEventListener('click', () => {if (!mapDragged) select();});
    pin.addEventListener('keydown', event => {if (event.key==='Enter'||event.key===' ') {event.preventDefault();select();}});
    pins.append(pin);
  }
  // Keep the selected country's pin above neighbors.
  const selected = pins.querySelector('[aria-pressed="true"]');
  if (selected) pins.append(selected);
  document.querySelector('#map-summary').textContent = country.value ? `${country.value} selected · click again to clear` : `${[...counts.values()].reduce((a,b)=>a+b,0)} issues · ${counts.size} countries`;
  const unmapped = document.querySelector('#map-unmapped');
  unmapped.hidden = !missing.length;
  unmapped.textContent = `Available in the country filter: ${missing.join(', ')}`;
  updateMapView();
}
document.querySelector('#map-zoom-in').addEventListener('click',()=>zoomMap(.5));
document.querySelector('#map-zoom-out').addEventListener('click',()=>zoomMap(2));
document.querySelector('#map-home').addEventListener('click',()=>{mapView={x:0,y:0,width:720,height:360};updateMapView();});
document.querySelector('#map-clear').addEventListener('click',()=>{country.value='';renderCandidates();});
document.querySelector('#map-expand').addEventListener('click',()=>{
  if(mapDialog.open) {mapDialog.close();return;}
  document.querySelector('#map-expanded-host').append(mapPanel);
  document.querySelector('#map-expand span').textContent='Close';
  document.querySelector('#map-expand').setAttribute('aria-label','Close expanded map');
  mapDialog.showModal();
});
mapDialog.addEventListener('close',()=>{
  mapPlaceholder.after(mapPanel);
  document.querySelector('#map-expand span').textContent='Expand';
  document.querySelector('#map-expand').setAttribute('aria-label','Expand world map');
  document.querySelector('#map-expand').focus();
});
let dragStart;
let mapDragged=false;
mapSvg.addEventListener('pointerdown',event=>{
  if (event.button!==0) return;
  mapDragged=false;
  dragStart={x:event.clientX,y:event.clientY,view:{...mapView},id:event.pointerId};
});
mapSvg.addEventListener('pointermove',event=>{
  if (!dragStart) return;
  const dx=event.clientX-dragStart.x,dy=event.clientY-dragStart.y;
  if(Math.hypot(dx,dy)<4&&!mapDragged)return;
  mapDragged=true;
  mapSvg.setPointerCapture(event.pointerId);
  const rect=mapSvg.getBoundingClientRect();
  const ratio=Math.max(dragStart.view.width/rect.width,dragStart.view.height/rect.height);
  mapView.x=Math.max(-180,Math.min(900-mapView.width,dragStart.view.x-dx*ratio));
  mapView.y=Math.max(-90,Math.min(450-mapView.height,dragStart.view.y-dy*ratio));
  updateMapView();
});
mapSvg.addEventListener('pointerup',()=>{dragStart=null;});
mapSvg.addEventListener('pointercancel',()=>{dragStart=null;});
mapSvg.addEventListener('wheel',event=>{if(event.ctrlKey||event.metaKey){event.preventDefault();zoomMap(event.deltaY>0?1.2:1/1.2);}}, {passive:false});
fetch('world-map.json').then(r=>{if(!r.ok)throw Error('Map unavailable');return r.json();}).then(data=>{
  mapData=data;
  document.querySelector('#map-geography').innerHTML = data.paths.map(d=>`<path d="${d}"/>`).join('');
  renderMap();
}).catch(()=>{document.querySelector('#map-summary').textContent='Map unavailable. Use the country filter below.';});
