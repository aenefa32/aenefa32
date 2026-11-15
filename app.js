/* AeneFlow - app.js: shell aplikasi (login Google, API klien, router, navigasi Home/Cashflow/More, integrasi Impor Data).
   Aturan: semua data ditampilkan lewat textContent; token Google hanya disimpan di memori (tidak di storage); tidak ada rahasia di frontend. */
(function(){'use strict';
const $=id=>document.getElementById(id),CFG_KEY='aeneflow.device',C=Object.assign({},window.AENEFLOW_CONFIG||{});
// Alamat Web App & Client ID TIDAK ada di file publik. Pengguna mengisinya sekali per perangkat (layar "Konfigurasi perangkat"); disimpan di perangkat ini saja.
const API_RE=/^https:\/\/script\.google\.com\/(a\/macros\/[A-Za-z0-9.-]+|macros)\/s\/[A-Za-z0-9_-]+\/exec$/,CID_RE=/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/;
function readStored(){try{const o=JSON.parse(localStorage.getItem(CFG_KEY)||'{}');return o&&typeof o==='object'?o:{};}catch(e){return{};}}
function writeStored(o){try{localStorage.setItem(CFG_KEY,JSON.stringify(o));return true;}catch(e){return false;}}
function clearStored(){try{localStorage.removeItem(CFG_KEY);}catch(e){}}
{const st=readStored();if(!C.apiUrl&&API_RE.test(st.apiUrl||''))C.apiUrl=st.apiUrl;if(!C.clientId&&CID_RE.test(st.clientId||''))C.clientId=st.clientId;}
const S={token:'',exp:0,boot:null,cache:{},tab:'Invoices',q:'',showSearch:false,seq:0};
function h(tag,props){const e=document.createElement(tag);props=props||{};Object.keys(props).forEach(k=>{const v=props[k];if(k==='class')e.className=v;else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),v);else if(v===true)e.setAttribute(k,'');else if(v!==false&&v!==null&&v!==undefined)e.setAttribute(k,v);});
 for(let i=2;i<arguments.length;i++){const c=arguments[i];if(c===null||c===undefined||c===false)continue;e.appendChild(typeof c==='string'||typeof c==='number'?document.createTextNode(String(c)):c);}return e;}
const ICONS={home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',cashflow:'<path d="M7 17V5M7 5L4 8M7 5l3 3M17 7v12M17 19l-3-3M17 19l3-3"/>',more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',graph:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',refresh:'<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'};
function icon(n,s){const w=h('span',{'aria-hidden':'true',style:'display:inline-flex'});w.innerHTML='<svg width="'+(s||22)+'" height="'+(s||22)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+ICONS[n]+'</svg>';return w;}// konstanta tepercaya, bukan data
const rp=n=>'Rp '+Number(n||0).toLocaleString('id-ID');
const MON=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const fdate=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(s||''));return m?(+m[3])+' '+MON[+m[2]-1]+' '+m[1]:'';};
function initials(n){const w=String(n||'').split(/\s+/).filter(x=>/^[A-Za-z]/.test(x));return w.length?(w[0][0]+(w[1]?w[1][0]:'')).toUpperCase():'AF';}
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),3200);}
function uuid(){return (crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random());}

// ---------- autentikasi & API ----------
let tok=null,freshP=null;
function jwtExp(t){try{return JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp*1000;}catch(e){return 0;}}
function onCred(r){S.token=r.credential;S.exp=jwtExp(S.token);if(tok){clearTimeout(tok.t);const t=tok;tok=null;t.res();}else enter();}
function ensureFresh(){if(freshP)return freshP;freshP=new Promise((res,rej)=>{tok={res:res,rej:rej,t:setTimeout(()=>{tok=null;logout('Sesi berakhir. Silakan masuk lagi.');rej(new Error('Sesi berakhir'));},9000)};try{google.accounts.id.prompt();}catch(e){}}).then(()=>{freshP=null;},e=>{freshP=null;throw e;});return freshP;}
const NOREQ=/(list|get|preview|fields|report|batches|bootstrap|ping)$/;
async function api(action,params){
 if(!S.token||S.exp-60000<Date.now())await ensureFresh();
 let res,j;
 if(!NOREQ.test(action))S.cache={};// setelah tulis (impor/bayar/dll) buang cache agar tampilan tidak basi
 try{res=await fetch(C.apiUrl,{method:'POST',body:JSON.stringify({idToken:S.token,action:action,params:params||{},request_id:NOREQ.test(action)?undefined:uuid()})});}
 catch(e){throw new Error('Tidak bisa menghubungi server. Periksa koneksi internet.');}
 try{j=await res.json();}catch(e){throw new Error('Respons server tidak valid.');}
 if(!j.ok){if(/Token|Belum login|Akun tidak diizinkan/.test(j.error||'')){logout(/Akun tidak/.test(j.error)?'Akun ini tidak diizinkan memakai AeneFlow.':'Sesi tidak valid. Silakan masuk lagi.');}throw new Error(j.error||'Terjadi kesalahan');}
 return j.data;}
function logout(msg){S.token='';S.exp=0;S.boot=null;S.cache={};try{google.accounts.id.disableAutoSelect();}catch(e){}$('app').hidden=true;showLogin(msg||'');}
function waitGoogle(){return new Promise((res,rej)=>{let n=0;const t=setInterval(()=>{if(window.google&&google.accounts&&google.accounts.id){clearInterval(t);res();}else if(++n>100){clearInterval(t);rej(new Error('Google Sign-In tidak bisa dimuat. Periksa koneksi internet lalu muat ulang.'));}},100);});}
function showLogin(msg,noBtn){$('splash').hidden=true;const l=$('login');l.hidden=false;l.textContent='';
 const btn=h('div',{id:'gbtn',style:'min-height:44px;display:flex;justify-content:center'});
 l.appendChild(h('div',{class:'panel'},h('div',{class:'mark','aria-hidden':'true',style:'margin:0 auto'},'AF'),h('h1',{class:'brand'},'AeneFlow'),h('p',{class:'tag'},'Your Business, Beautifully Organized.'),h('p',{class:'sub',style:'margin:14px 0'},'Masuk dengan akun Google pemilik usaha.'),noBtn?null:btn,h('p',{class:'err',role:'alert'},msg||''),h('button',{class:'linkbtn',type:'button',onclick:()=>{clearStored();delete C.apiUrl;delete C.clientId;showSetup('');}},'Ubah konfigurasi perangkat')));
 if(!noBtn&&window.google&&google.accounts&&google.accounts.id){try{google.accounts.id.renderButton(btn,{theme:'outline',size:'large',shape:'pill',text:'signin_with',width:280,locale:'id'});}catch(e){}}}
async function enter(){$('login').hidden=true;$('splash').hidden=false;
 try{S.boot=await api('bootstrap');}catch(e){if(!S.token)return;S.token='';$('splash').hidden=true;showLogin(e.message);return;}
 $('splash').hidden=true;$('app').hidden=false;buildNav();render();}

// ---------- navigasi ----------
const NAV=[['home','Home'],['cashflow','Cashflow'],['more','More']];
function buildNav(){const mk=cls=>NAV.map(n=>h('a',{class:'nv',href:'#/'+n[0],'data-nav':n[0]},icon(n[0]),n[1]));
 const side=$('side');side.textContent='';side.appendChild(h('div',{class:'brand2'},'AeneFlow'));mk().forEach(x=>side.appendChild(x));
 const b=$('bottom');b.textContent='';mk().forEach(x=>b.appendChild(x));}
function markNav(k){document.querySelectorAll('[data-nav]').forEach(a=>{if(a.getAttribute('data-nav')===k)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});}
function empty(t,d){return h('div',{class:'empty'},h('h2',null,t),h('p',null,d));}
const soon=(t,d)=>async el=>{el.appendChild(empty(t,d||'Bagian ini belum dibangun dan tidak menampilkan data apa pun.'));};
const ROUTES={
 home:{t:'AeneFlow',nav:'home',v:vHome},cashflow:{t:'Cashflow',nav:'cashflow',v:soon('Cashflow belum tersedia','Income, Expense, Monthly P&L, dan saldo akun akan tampil di sini setelah modul Cashflow dibangun.')},more:{t:'More',nav:'more',v:vMore},
 customers:{t:'Customers',nav:'more',back:'more',v:vCust},products:{t:'Products & Catalog',nav:'more',back:'more',v:vProd},reports:{t:'Business Reports',nav:'more',back:'more',v:soon('Business Reports belum tersedia','Laporan omzet, piutang, dan laba akan tampil di sini setelah modul Reports dibangun.')},
 settings:{t:'Settings',nav:'more',back:'more',v:vSettings},import:{t:'Impor Data',nav:'more',back:'settings',v:vImport}};
async function render(){if(!S.boot)return;const my=++S.seq,key=(location.hash.replace(/^#\/?/,'')||'home').split('?')[0],r=ROUTES[key]||ROUTES.home;
 markNav(r.nav);document.title=(r===ROUTES.home?'':r.t+' · ')+'AeneFlow';
 const top=$('top');top.textContent='';
 if(r.back)top.appendChild(h('button',{class:'ib',type:'button','aria-label':'Kembali',onclick:()=>{location.hash='#/'+r.back;}},'‹'));else top.appendChild(h('div',{class:'logo','aria-hidden':'true'},initials(S.boot.settings&&S.boot.settings.business_name)));
 top.appendChild(h('h1',null,r.t));
 if(r===ROUTES.home){top.appendChild(h('button',{class:'ib',type:'button','aria-label':'Cari invoice',onclick:()=>{S.showSearch=!S.showSearch;render();}},icon('search')));
  top.appendChild(h('button',{class:'ib',type:'button','aria-label':'Muat ulang',onclick:()=>{delete S.cache.inv;render();}},icon('refresh')));
  top.appendChild(h('a',{class:'ib','aria-label':'Business Reports',href:'#/reports'},icon('graph')));}
 const m=$('main');m.textContent='';const box=h('div');m.appendChild(box);
 document.querySelectorAll('.fab').forEach(x=>x.remove());
 try{await r.v(box,my);}catch(e){if(my===S.seq){m.textContent='';m.appendChild(h('div',{class:'banner',role:'alert'},e.message));m.appendChild(h('button',{class:'btn',type:'button',onclick:()=>render()},'Coba lagi'));}}}
window.addEventListener('hashchange',render);window.addEventListener('offline',()=>toast('Anda sedang offline. Data tidak bisa dimuat.'));
const skel=el=>{for(let i=0;i<4;i++)el.appendChild(h('div',{class:'skel'}));};

// ---------- halaman ----------
const PILL={Paid:['p-paid','Paid'],'Partially Paid':['p-part','Partially Paid'],Unpaid:['p-unpaid','Unpaid'],Overdue:['p-over','Overdue'],Draft:['p-draft','Draft'],Cancelled:['p-cancel','Cancelled']};
const TABS=[['Invoices'],['New Orders',1],['Unpaid'],['Paid'],['In Production',1],['Ready to Ship',1],['Shipped',1],['Completed',1]];
const OPEN=['Unpaid','Partially Paid','Overdue'];
async function vHome(el,my){
 el.appendChild(h('div',{class:'chips',role:'group','aria-label':'Filter'},...TABS.map(t=>h('button',{class:'chip',type:'button','aria-pressed':String(S.tab===t[0]),disabled:!!t[1],title:t[1]?'Menunggu modul Order Fulfillment':'',onclick:()=>{S.tab=t[0];render();}},t[0]))));
 if(S.showSearch){const i=h('input',{class:'search',type:'search',placeholder:'Cari nomor invoice atau nama pelanggan','aria-label':'Cari invoice',value:S.q,oninput:e=>{S.q=e.target.value;paint();}});el.appendChild(i);}
 const sum=h('div'),list=h('div');el.appendChild(sum);el.appendChild(list);skel(list);
 if(!S.cache.inv)S.cache.inv=await api('invoices.list');if(my!==S.seq)return;const all=S.cache.inv;
 const open=all.filter(x=>OPEN.indexOf(x.payment_status)>=0);
 sum.appendChild(h('div',{class:'kpis'},...[['Piutang',rp(open.reduce((n,x)=>n+x.balance,0))],['Diterima',rp(all.filter(x=>x.state==='Issued').reduce((n,x)=>n+x.paid,0))],['Invoice',all.length]].map(k=>h('div',{class:'kpi'},h('span',{class:'sub'},k[0]),h('b',null,k[1])))));
 if(S.tab!=='Invoices')el.appendChild(h('p',{class:'sub'},'Tab yang redup menunggu modul Order Fulfillment.'));
 function paint(){list.textContent='';const q=S.q.trim().toLowerCase();let rows=all.slice().sort((a,b)=>String(b.issue_date).localeCompare(String(a.issue_date))||String(b.invoice_number).localeCompare(String(a.invoice_number)));
  if(S.tab==='Unpaid')rows=rows.filter(x=>OPEN.indexOf(x.payment_status)>=0);else if(S.tab==='Paid')rows=rows.filter(x=>x.payment_status==='Paid');
  if(q)rows=rows.filter(x=>String(x.invoice_number).toLowerCase().indexOf(q)>=0||String(x.cust_name).toLowerCase().indexOf(q)>=0);
  if(!rows.length){list.appendChild(empty(all.length?'Tidak ada invoice':'Belum ada invoice',all.length?'Coba filter atau kata kunci lain.':'Invoice yang dibuat atau diimpor akan tampil di sini.'));return;}
  rows.slice(0,300).forEach(x=>{const p=PILL[x.payment_status]||['p-draft',x.payment_status];list.appendChild(h('div',{class:'item'},h('div',{class:'row'},h('div',null,h('b',null,x.cust_name),h('div',{class:'sub'},x.invoice_number+' · '+fdate(x.issue_date))),h('b',null,rp(x.grand_total))),h('div',{class:'row',style:'margin-top:8px'},h('span',{class:'pill '+p[0]},p[1]),x.balance>0&&x.state==='Issued'?h('span',{class:'sub'},'Sisa '+rp(x.balance)):null)));});
  if(rows.length>300)list.appendChild(h('p',{class:'sub'},'Menampilkan 300 pertama dari '+rows.length+'. Gunakan pencarian untuk mempersempit.'));}
 paint();
 const f=h('button',{class:'fab',type:'button','aria-label':'Buat invoice baru',onclick:()=>toast('Editor invoice belum dibangun.')},'+');document.body.appendChild(f);}
async function vMore(el,my){const b=S.boot,s=b.settings||{};
 el.appendChild(h('div',{class:'hero'},h('div',{class:'row'},h('div',{class:'mark','aria-hidden':'true',style:'width:56px;height:56px;font-size:22px'},initials(s.business_name)),h('div',{style:'flex:1;min-width:0'},h('div',{style:'font:700 22px var(--serif)'},s.business_name||'AeneFlow'),h('div',{class:'sub'},b.user.email+' · '+b.user.role)))));
 const k=h('div',{class:'kpis'});el.appendChild(k);
 el.appendChild(h('div',{class:'card menu'},h('a',{href:'#/customers'},'Customers',h('span',null,'›')),h('a',{href:'#/products'},'Products & Catalog',h('span',null,'›')),h('a',{href:'#/reports'},'Reports',h('span',null,'›')),h('a',{href:'#/settings'},'Settings',h('span',null,'›'))));
 el.appendChild(h('p',{class:'sub'},'Revenue, laba, dan margin akan tampil di sini bersama modul Reports.'));
 const [c,p,i]=await Promise.all([api('customers.list'),api('products.list'),S.cache.inv?Promise.resolve(S.cache.inv):api('invoices.list')]);if(my!==S.seq)return;S.cache.inv=i;
 [['Customers',c.length],['Products',p.length],['Invoices',i.length]].forEach(x=>k.appendChild(h('div',{class:'kpi'},h('span',{class:'sub'},'Total '+x[0]),h('b',null,x[1]))));}
async function vCust(el,my){skel(el);const c=await api('customers.list');if(my!==S.seq)return;el.textContent='';if(!c.length)return el.appendChild(empty('Belum ada pelanggan','Pelanggan yang dibuat atau diimpor akan tampil di sini.'));
 c.forEach(x=>el.appendChild(h('div',{class:'item'},h('b',null,x.name),h('div',{class:'sub'},[x.organization,x.whatsapp].filter(Boolean).join(' · ')))));}
async function vProd(el,my){skel(el);const p=await api('products.list');if(my!==S.seq)return;el.textContent='';if(!p.length)return el.appendChild(empty('Belum ada produk','Produk yang dibuat atau diimpor akan tampil di sini.'));
 p.forEach(x=>el.appendChild(h('div',{class:'item'},h('div',{class:'row'},h('b',null,x.name),h('b',null,rp(x.sell_price))),h('div',{class:'sub'},[x.category,x.unit].filter(Boolean).join(' · ')))));}
async function vSettings(el){const owner=S.boot.user.role==='owner';
 if(owner)el.appendChild(h('div',{class:'card menu'},h('a',{href:'#/import'},'Impor Data Historis',h('span',null,'›'))));
 el.appendChild(h('div',{class:'card'},h('div',{class:'sub'},'Akun'),h('div',null,S.boot.user.email),h('div',{style:'margin-top:10px'},h('button',{class:'btn',type:'button',onclick:()=>logout('Anda sudah keluar.')},'Keluar'))));
 el.appendChild(h('p',{class:'sub'},'AeneFlow · shell v0.1. Pengaturan usaha, rekening, dan Google Calendar belum dibangun.'));}
async function vImport(el){if(S.boot.user.role!=='owner')return el.appendChild(empty('Khusus pemilik','Hanya pemilik yang boleh mengimpor data.'));
 if(!window.AeneImport)return el.appendChild(h('div',{class:'banner',role:'alert'},'Modul impor tidak termuat.'));window.AeneImport.mount(el,{api:api});}
window.AeneApp={api:api};

// ---------- mulai ----------
function showSetup(msg){$('splash').hidden=true;const l=$('login');l.hidden=false;l.textContent='';
 const api_=h('input',{type:'text',inputmode:'url',autocomplete:'off',autocapitalize:'none',spellcheck:'false',placeholder:'https://script.google.com/macros/s/.../exec','aria-label':'Alamat Web App'}),
  cid=h('input',{type:'text',autocomplete:'off',autocapitalize:'none',spellcheck:'false',placeholder:'1234567890-abc.apps.googleusercontent.com','aria-label':'Client ID Google'}),err=h('p',{class:'err',role:'alert'},msg||'');
 const save=()=>{const a=api_.value.trim(),c=cid.value.trim();
  if(!API_RE.test(a))return void(err.textContent='Alamat Web App tidak valid. Harus berawalan https://script.google.com/macros/s/ dan berakhiran /exec.');
  if(!CID_RE.test(c))return void(err.textContent='Client ID tidak valid. Bentuknya angka-huruf.apps.googleusercontent.com.');
  const ok=writeStored({apiUrl:a,clientId:c});C.apiUrl=a;C.clientId=c;if(!ok)toast('Penyimpanan perangkat tidak tersedia; konfigurasi hanya berlaku sementara.');start();};
 l.appendChild(h('div',{class:'panel setup'},h('div',{class:'mark','aria-hidden':'true',style:'margin:0 auto'},'AF'),h('h1',{class:'brand'},'AeneFlow'),h('p',{class:'tag'},'Konfigurasi perangkat'),
  h('p',{class:'sub',style:'margin:12px 0'},'Isi sekali di perangkat ini. Kedua nilai ini bukan kata sandi dan hanya disimpan di perangkat ini.'),
  h('label',null,'Alamat Web App',api_),h('label',null,'Client ID Google',cid),err,h('button',{class:'btn pri',type:'button',onclick:save},'Simpan')));}
async function start(){
 if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'))navigator.serviceWorker.register('sw.js').catch(()=>{});
 if(!C.apiUrl||!C.clientId){showSetup('');return;}
 try{await waitGoogle();}catch(e){showLogin(e.message,true);return;}
 google.accounts.id.initialize({client_id:C.clientId,callback:onCred,auto_select:true,cancel_on_tap_outside:false});
 showLogin('');google.accounts.id.prompt();}
start();
})();
