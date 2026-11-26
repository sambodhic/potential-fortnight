function setupIssueMap({getCandidates,getQuery=()=>'',getStatus=()=>'',getCountry=()=>'',matchesNeed=null,setCountry}) {
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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
  const query = getQuery().trim().toLowerCase();
  const counts = new Map();
  getCandidates().filter(p => matchesNeed ? matchesNeed(p) : (!getStatus() || (p.verificationStatus || 'Needs verification').startsWith(getStatus())) && [p.country,p.location,p.title,p.region].join(' ').toLowerCase().includes(query)).forEach(p => counts.set(p.country, (counts.get(p.country)||0)+1));
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
    pin.setAttribute('aria-label',`${name}: ${count} ${count===1?'need':'needs'}. Filter by ${name}`);
    pin.setAttribute('aria-pressed',String(getCountry()===name));
    pin.innerHTML = `<title>${escape(name)}: ${count} ${count===1?'need':'needs'}</title><circle r="10"/><text text-anchor="middle" dy=".35em">${count}</text>`;
    const select = () => setCountry(getCountry()===name?'':name);
    pin.addEventListener('click', () => {if (!mapDragged) select();});
    pin.addEventListener('keydown', event => {if (event.key==='Enter'||event.key===' ') {event.preventDefault();select();}});
    pins.append(pin);
  }
  // Keep the selected country's pin above neighbors.
  const selected = pins.querySelector('[aria-pressed="true"]');
  if (selected) pins.append(selected);
  document.querySelector('#map-summary').textContent = getCountry() ? `${getCountry()} selected · click again to clear` : `${[...counts.values()].reduce((a,b)=>a+b,0)} needs · ${counts.size} countries`;
  const unmapped = document.querySelector('#map-unmapped');
  unmapped.hidden = !missing.length;
  unmapped.textContent = `Available in the country filter: ${missing.join(', ')}`;
  updateMapView();
}
document.querySelector('#map-zoom-in').addEventListener('click',()=>zoomMap(.5));
document.querySelector('#map-zoom-out').addEventListener('click',()=>zoomMap(2));
document.querySelector('#map-home').addEventListener('click',()=>{mapView={x:0,y:0,width:720,height:360};updateMapView();});
document.querySelector('#map-clear').addEventListener('click',()=>setCountry(''));
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

return {render:renderMap};
}
