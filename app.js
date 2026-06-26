
const PEOPLE={KVR:["Vishnu (Manager)","Rajeev","Anandu","Thankachan"],MDM:["Ratheesh (Manager)","John Victor"],PKM:["Anoop K P (Manager)","Anoop P G"],SKT:["Karthick (Manager)","Mahalakshmi","Jothi"],NDD:["Yedhu (Manager)"]};
const SAMPLE_JOBS=[{wo:"KVR/2606/014",customer:"Victor Farms",phone:"9447000003",model:"MS460",serial:"11258975355",status:"RECEIVED",complaint:"Fuel leak / Service"},{wo:"KVR/2606/015",customer:"Jose Sawmill",phone:"9447000004",model:"FS120",serial:"",status:"ON HOLD",complaint:"Carburetor"},{wo:"KVR/2606/016",customer:"Joseph",phone:"9447000005",model:"BR600",serial:"77889911",status:"READY",complaint:"No power"}];
function session(){try{return JSON.parse(localStorage.getItem('tagro_session')||'null')}catch{return null}}
function saveSession(s){localStorage.setItem('tagro_session',JSON.stringify(s))}
function requireLogin(){let p=location.pathname.split('/').pop();if(!session() && !['login.html','index.html',''].includes(p)) location.href='login.html'}
function setupHeader(){let s=session()||{branch:'DEMO',staff:'Demo'};document.querySelectorAll('[data-logo]').forEach(i=>i.src=localStorage.getItem('tagro_logo_data'));let b=document.getElementById('branchBadge');if(b)b.textContent=s.branch;let u=document.getElementById('userBadge');if(u)u.textContent=(s.staff||'Demo').replace(' (Manager)','');setActiveNav()}
function loadUsers(){let b=document.getElementById('loginBranch')?.value||'KVR',u=document.getElementById('loginUser');if(!u)return;u.innerHTML='';(PEOPLE[b]||[]).forEach(n=>{let o=document.createElement('option');o.value=n;o.textContent=n;u.appendChild(o)})}
function doLogin(demo=false){saveSession({branch:demo?'DEMO':document.getElementById('loginBranch').value,staff:demo?'Demo':document.getElementById('loginUser').value,demo,loginAt:new Date().toISOString()});location.href='home.html'}
function logout(){localStorage.removeItem('tagro_session');location.href='login.html'}
function jobs(){let saved=JSON.parse(localStorage.getItem('tagro_jobs')||'null');if(!saved){localStorage.setItem('tagro_jobs',JSON.stringify(SAMPLE_JOBS));return SAMPLE_JOBS}return saved}
function renderQueue(){let el=document.getElementById('jobList');if(!el)return;el.innerHTML=jobs().map((j,i)=>`<div class="listitem"><div class="title">${j.customer} — ${j.model} <span class="pill ${j.status==='READY'?'green':j.status==='ON HOLD'?'amber':''}">${j.status}</span></div><div class="small">${j.wo} · ${j.phone} · Serial: ${j.serial||'MISSING'} · ${j.complaint}</div><div style="margin-top:12px"><a class="btn primary" href="job.html?id=${i}">Open job</a></div></div>`).join('')}
function renderPO(){let el=document.getElementById('poList');if(!el)return;let arr=JSON.parse(localStorage.getItem('tagro_po')||'[]');let sample=[{part:'Carburetor Kit',branch:'KVR',note:'Low stock · Qty 2 · Suggested: Check MDM'},{part:'SR450 Hose',branch:'MDM',note:'No stock · Qty 3 · Urgent'}];el.innerHTML=arr.concat(sample).map(p=>`<div class="listitem"><div class="title">${p.part} <span class="pill">${p.branch}</span></div><div class="small">${p.note||'Added from job · Manager decides transfer/buy/defer.'}</div></div>`).join('')}
function raisePO(part='Part required'){let s=session()||{branch:'DEMO',staff:'Demo'},arr=JSON.parse(localStorage.getItem('tagro_po')||'[]');arr.unshift({part,branch:s.branch,note:`Added by ${s.staff}. Purchase decision separate.`,at:new Date().toISOString()});localStorage.setItem('tagro_po',JSON.stringify(arr));alert('Added to Purchase Order. Purchase decision is separate.');renderPO()}
function addTimeline(title,desc){let arr=JSON.parse(localStorage.getItem('tagro_timeline')||'[]');arr.push({at:new Date().toISOString(),title,desc});localStorage.setItem('tagro_timeline',JSON.stringify(arr))}
function renderTimeline(){let el=document.getElementById('timeline');if(!el)return;let arr=[{at:new Date().toISOString(),title:'Received',desc:'By Rajeev at KVR'}].concat(JSON.parse(localStorage.getItem('tagro_timeline')||'[]'));el.innerHTML=arr.map(e=>`<div class="event"><div class="time">${new Date(e.at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div><div><b>${e.title}</b><div class="small">${e.desc||''}</div></div></div>`).join('')}
function toggle(el){el.classList.toggle('selected')}
function selectOne(el,sel){document.querySelectorAll(sel).forEach(x=>x.classList.remove('selected'));el.classList.add('selected')}
function toggleChoice(el){el.classList.toggle('selected')}
function openFeedback(){document.getElementById('feedbackModal')?.classList.add('open')}
function closeFeedback(){document.getElementById('feedbackModal')?.classList.remove('open')}
function submitFeedback(){let f=JSON.parse(localStorage.getItem('tagro_feedback')||'[]'),s=session()||{};f.push({at:new Date().toISOString(),staff:s.staff,branch:s.branch,rate:document.querySelector('.rate.selected')?.innerText||'',choices:[...document.querySelectorAll('.choice.selected')].map(x=>x.innerText),text:document.getElementById('feedbackText')?.value||'',page:location.pathname});localStorage.setItem('tagro_feedback',JSON.stringify(f));closeFeedback();alert('നന്ദി. Feedback saved on this device.')}
function setActiveNav(){let p=location.pathname.split('/').pop()||'home.html',key=p.includes('receive')?'receive':p.includes('queue')||p.includes('job')||p.includes('ready')||p.includes('work')||p.includes('estimate')||p.includes('approval')||p.includes('test')||p.includes('hold')?'queue':p.includes('purchase')?'purchase':['daily.html','exceptions.html','reports.html','links.html','settings.html','feedback.html','handbook.html','more.html'].includes(p)?'more':'home';document.querySelectorAll('.navbtn').forEach(n=>n.classList.toggle('active',n.dataset.nav===key))}
function commonInit(){requireLogin();setupHeader();renderQueue();renderPO();renderTimeline()}
document.addEventListener('DOMContentLoaded',commonInit);

const CUSTOMER_MEMORY=[
 {name:'Victor Farms', phone:'9447000003', alias:'Victor Estate / KVR', machines:['MS460 — Serial 11258975355','FS120 — Serial 8877001122']},
 {name:'Jose Sawmill', phone:'9447000004', alias:'Sawmill Jose', machines:['MS250 — Serial 5566778899','SR450 — Serial 22334455']},
 {name:'Venu', phone:'9447000011', alias:'Venu Rubber', machines:['MS250 — Serial 99887766','New machine / serial unknown']}
];
function searchCustomers(){
  const q=(document.getElementById('custSearch')?.value||'').trim().toLowerCase();
  const box=document.getElementById('customerSuggestions');
  if(!box)return;
  if(q.length<2){box.classList.remove('show');box.innerHTML='';return;}
  const matches=CUSTOMER_MEMORY.filter(c=>[c.name,c.phone,c.alias,...c.machines].join(' ').toLowerCase().includes(q));
  box.classList.add('show');
  if(!matches.length){
    box.innerHTML=`<div class="listitem"><div class="title">New customer</div><div class="small">No match found. Continue entering details.</div></div>`;
    return;
  }
  box.innerHTML=matches.map((c,i)=>`<div class="listitem clickable" onclick="pickCustomerMemory(${i})"><div class="title">${c.name}</div><div class="small">${c.phone} · Alias: ${c.alias} · Machines: ${c.machines.join(', ')}</div></div>`).join('');
}
function pickCustomerMemory(i){
  const c=CUSTOMER_MEMORY[i];
  const input=document.getElementById('custSearch');
  const machine=document.getElementById('machineSelect');
  const box=document.getElementById('customerSuggestions');
  if(input)input.value=`${c.name} — ${c.phone}`;
  if(machine){
    machine.innerHTML=c.machines.map(m=>`<option>${m}</option>`).join('')+`<option>+ Add new machine</option>`;
  }
  if(box){box.classList.remove('show');box.innerHTML='';}
}
