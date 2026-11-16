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
// Sesi perangkat (Versi 8): token acak 30 hari dari backend, disimpan di perangkat agar tidak perlu login Google tiap membuka aplikasi.
const SESS_KEY='aeneflow.sess',BOOT_KEY='aeneflow.boot',INV_KEY='aeneflow.inv';
const ls={get(k){try{return localStorage.getItem(k);}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,v);return true;}catch(e){return false;}},del(k){try{localStorage.removeItem(k);}catch(e){}}};
const lsJson=k=>{try{const v=JSON.parse(ls.get(k)||'null');return v&&typeof v==='object'?v:null;}catch(e){return null;}};
function dropCaches(){ls.del(BOOT_KEY);ls.del(INV_KEY);}// data bisnis di perangkat dibuang saat keluar
function jwtExp(t){try{return JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp*1000;}catch(e){return 0;}}
function onCred(r){S.token=r.credential;S.exp=jwtExp(S.token);if(tok){clearTimeout(tok.t);const t=tok;tok=null;t.res();}else enter();}
function ensureFresh(){if(freshP)return freshP;freshP=new Promise((res,rej)=>{tok={res:res,rej:rej,t:setTimeout(()=>{tok=null;logout('Sesi berakhir. Silakan masuk lagi.');rej(new Error('Sesi berakhir'));},9000)};try{google.accounts.id.prompt();}catch(e){}}).then(()=>{freshP=null;},e=>{freshP=null;throw e;});return freshP;}
const NOREQ=/(list|get|preview|fields|report|batches|bootstrap|ping)$/;
async function api(action,params){
 if(!S.sess&&(!S.token||S.exp-60000<Date.now()))await ensureFresh();
 let res,j;
 if(!NOREQ.test(action)){S.cache={};ls.del(INV_KEY);}// setelah tulis (impor/bayar/dll) buang cache agar tampilan tidak basi
 try{res=await fetch(C.apiUrl,{method:'POST',body:JSON.stringify(Object.assign(S.sess?{session:S.sess}:{idToken:S.token},{action:action,params:params||{},request_id:NOREQ.test(action)?undefined:uuid()}))});}
 catch(e){throw new Error('Tidak bisa menghubungi server. Periksa koneksi internet.');}
 try{j=await res.json();}catch(e){throw new Error('Respons server tidak valid.');}
 if(!j.ok){if(/^Aksi tidak dikenal/.test(j.error||''))throw new Error('Backend belum diperbarui ke versi R1. Tempel kode Apps Script terbaru lalu buat versi deployment baru.');if(/Token|Belum login|Akun tidak diizinkan|^Sesi (tidak valid|berakhir)/.test(j.error||'')){logout(/Akun tidak/.test(j.error)?'Akun ini tidak diizinkan memakai AeneFlow.':(/^Sesi berakhir/.test(j.error)?'Sesi berakhir. Silakan masuk lagi.':'Sesi tidak valid. Silakan masuk lagi.'),true);}throw new Error(j.error||'Terjadi kesalahan');}
 return j.data;}
function logout(msg,local){const s=S.sess;if(s&&!local){try{fetch(C.apiUrl,{method:'POST',body:JSON.stringify({session:s,action:'session.revoke',params:{session:s}}),keepalive:true}).catch(()=>{});}catch(e){}}
 S.sess='';ls.del(SESS_KEY);dropCaches();S.token='';S.exp=0;S.boot=null;S.cache={};try{google.accounts.id.disableAutoSelect();}catch(e){}$('app').hidden=true;showLogin(msg||'');}
async function logoutAll(){try{await api('session.revoke_all');}catch(e){}logout('Anda sudah keluar dari semua perangkat.',true);}
function waitGoogle(){return new Promise((res,rej)=>{let n=0;const t=setInterval(()=>{if(window.google&&google.accounts&&google.accounts.id){clearInterval(t);res();}else if(++n>100){clearInterval(t);rej(new Error('Google Sign-In tidak bisa dimuat. Periksa koneksi internet lalu muat ulang.'));}},100);});}
function showLogin(msg,noBtn){$('splash').hidden=true;const l=$('login');l.hidden=false;l.textContent='';
 const btn=h('div',{id:'gbtn',style:'min-height:44px;display:flex;justify-content:center'});
 l.appendChild(h('div',{class:'panel'},h('img',{class:'mark-img',src:'icon-192.png',alt:'',width:'72',height:'72'}),h('h1',{class:'brand'},'AeneFlow'),h('p',{class:'tag'},'Your Business, Beautifully Organized.'),h('p',{class:'sub',style:'margin:14px 0'},'Masuk dengan akun Google pemilik usaha.'),noBtn?null:btn,h('p',{class:'err',role:'alert'},msg||''),noBtn&&S.sess?h('button',{class:'btn pri',type:'button',id:'retry',onclick:()=>{start();}},'Coba lagi'):null,h('button',{class:'linkbtn',type:'button',onclick:()=>{clearStored();delete C.apiUrl;delete C.clientId;showSetup('');}},'Ubah konfigurasi perangkat')));
 if(!noBtn&&window.google&&google.accounts&&google.accounts.id){try{google.accounts.id.renderButton(btn,{theme:'outline',size:'large',shape:'pill',text:'signin_with',width:280,locale:'id'});}catch(e){}}}
async function enter(){$('login').hidden=true;
 const cb=S.sess?lsJson(BOOT_KEY):null;
 if(cb&&cb.user&&cb.settings!==undefined){// tampil instan dari salinan tersimpan, lalu perbarui diam-diam
  S.boot=cb;$('splash').hidden=true;$('app').hidden=false;buildNav();render();
  api('bootstrap').then(b=>{ls.set(BOOT_KEY,JSON.stringify(b));if(JSON.stringify(b)!==JSON.stringify(S.boot)){S.boot=b;render();}}).catch(()=>{});return;}
 $('splash').hidden=false;
 try{S.boot=await api('bootstrap');}catch(e){if(!S.token&&!S.sess)return;if(S.sess&&!/Sesi|Token|login/.test(e.message)){$('splash').hidden=true;showLogin(e.message,true);return;}S.token='';$('splash').hidden=true;showLogin(e.message);return;}
 if(!S.sess){try{const r=await api('session.create');if(r&&r.session){S.sess=r.session;ls.set(SESS_KEY,r.session);}}catch(e){}}// gagal (mis. backend lama) = tetap bisa dipakai, hanya perlu login tiap kali
 if(S.sess)ls.set(BOOT_KEY,JSON.stringify(S.boot));
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
 if(r.back)top.appendChild(h('button',{class:'ib',type:'button','aria-label':'Kembali',onclick:()=>{location.hash='#/'+(typeof r.back==='function'?r.back():r.back);}},'‹'));else top.appendChild(h('div',{class:'logo','aria-hidden':'true'},initials(S.boot.settings&&S.boot.settings.business_name)));
 top.appendChild(h('h1',null,r.t));
 if(r===ROUTES.home){top.appendChild(h('button',{class:'ib',type:'button','aria-label':'Cari invoice',onclick:()=>{S.showSearch=!S.showSearch;render();}},icon('search')));
  top.appendChild(h('button',{class:'ib',type:'button','aria-label':'Muat ulang',onclick:()=>{delete S.cache.inv;render();}},icon('refresh')));
  top.appendChild(h('a',{class:'ib','aria-label':'Business Reports',href:'#/reports'},icon('graph')));}
 const m=$('main');m.textContent='';const box=h('div');m.appendChild(box);
 document.querySelectorAll('.fab').forEach(x=>x.remove());
 try{await r.v(box,my);}catch(e){if(my===S.seq){m.textContent='';m.appendChild(h('div',{class:'banner',role:'alert'},e.message));m.appendChild(h('button',{class:'btn',type:'button',onclick:()=>render()},'Coba lagi'));}}}
window.addEventListener('hashchange',render);window.addEventListener('offline',()=>toast('Anda sedang offline. Data tidak bisa dimuat.'));
function param(k){const q=(location.hash.split('?')[1]||'');const o=new URLSearchParams(q);return o.get(k)||'';}
const skel=el=>{for(let i=0;i<4;i++)el.appendChild(h('div',{class:'skel'}));};

// ---------- halaman ----------
const OST={'New Order':['Belum diproses','o-new'],'In Production':['In Production','o-prod'],'Ready to Ship':['Ready to Ship','o-ready'],'Shipped':['Shipped','o-ship'],'Completed':['\u2713 Completed','o-done']};
// Completed = otomatis saat pesanan Shipped dan invoice Paid (atau status lama 'Completed' hasil impor)
function effStatus(f,pay){return f==='Completed'||(f==='Shipped'&&pay==='Paid')?'Completed':f;}
function ostPill(f,pay,id){const e=effStatus(f,pay),m=OST[e]||[e,'o-new'];return h('span',{class:'pill '+m[1],id:id||null},m[0]);}
const PILL={Paid:['p-paid','Paid'],'Partially Paid':['p-part','Partially Paid'],Unpaid:['p-unpaid','Unpaid'],Overdue:['p-over','Overdue'],Draft:['p-draft','Draft'],Cancelled:['p-cancel','Cancelled']};
const TABS=[['Invoices'],['Unpaid'],['Paid'],['Cancelled'],['Belum Diproses'],['In Production'],['Ready to Ship'],['Shipped'],['Completed']]
const FUL={'Belum Diproses':'New Order','In Production':'In Production','Ready to Ship':'Ready to Ship','Shipped':'Shipped','Completed':'Completed'};;
const OPEN=['Unpaid','Partially Paid','Overdue'];
// ---------- baris invoice di Home: geser ke kiri = pilih status pesanan ----------
const SWW=232,SWP=150;
function closeSw(){if(S.openSw){S.openSw.classList.remove('open','openr');S.openSw=null;}}
function rowCard(x){const p=PILL[x.payment_status]||['p-draft',x.payment_status],iss=x.state==='Issued'&&x.fulfillment_status,done=iss&&effStatus(x.fulfillment_status,x.payment_status)==='Completed';return h('a',{class:'item lnk',href:'#/invoice?id='+encodeURIComponent(x.invoice_id)},h('div',{class:'row'},h('div',null,h('b',null,x.cust_name),h('div',{class:'sub'},x.invoice_number+' · '+fdate(x.issue_date))),h('b',null,rp(x.grand_total))),h('div',{class:'row',style:'margin-top:8px'},h('span',{class:'pills'},h('span',{class:'pill '+p[0]},p[1]),iss?ostPill(x.fulfillment_status,x.payment_status):null),x.balance>0&&x.state==='Issued'?h('span',{class:'sub'},'Sisa '+rp(x.balance)):null),iss?h('div',{class:'sub',style:'margin-top:6px;min-height:18px;padding-right:64px'},x.deadline_date&&!done&&x.fulfillment_status!=='Shipped'?'Deadline '+fdate(x.deadline_date):''):null);}
function rowEl(x){const card=rowCard(x);if(!(x.state==='Issued'&&x.fulfillment_status&&x.order_ver&&A.setOrderStatus&&A.ORD_ST))return card;
 const info=()=>{const prev=x.fulfillment_status,list=S.cache.inv;// api() membuang cache setelah tulis; salinan ini dipulihkan agar tampilan tidak berkedip
  const keep=()=>{if(list){S.cache.inv=list;ls.set(INV_KEY,JSON.stringify(list));}};
  return {invoice_id:x.invoice_id,ver:x.order_ver,cur:prev,balance:x.balance,
  opt:st=>{x.fulfillment_status=st;S.invStale=false;S.openSw=null;keep();render();},
  ok:v=>{if(v)x.order_ver=v;keep();},
  undo:()=>{x.fulfillment_status=prev;keep();S.invStale=true;render();}};};
 const panel=h('div',{class:'swp-panel',role:'group','aria-label':'Ubah status pesanan '+x.invoice_number},...A.ORD_ST.map(st=>h('button',{type:'button',class:'swb '+OST[st][1]+(st===x.fulfillment_status?' on':''),'data-st':st,onclick:()=>{A.setOrderStatus(info(),st,async()=>{delete S.cache.inv;S.openSw=null;render();},m=>toast(m));}},OST[st][0])));
 card.setAttribute('draggable','false');card.addEventListener('dragstart',e=>e.preventDefault());
 const canPay=A.quickPay&&x.balance>0&&OPEN.indexOf(x.payment_status)>=0;
 const pinfo=()=>{const prev={ps:x.payment_status,paid:x.paid,bal:x.balance},list=S.cache.inv,keep=()=>{if(list){S.cache.inv=list;ls.set(INV_KEY,JSON.stringify(list));}};
  return {invoice_id:x.invoice_id,balance:prev.bal,paid:prev.paid,
   opt:()=>{x.paid=prev.paid+prev.bal;x.balance=0;x.payment_status='Paid';S.invStale=false;S.openSw=null;keep();render();},
   ok:()=>keep(),undo:()=>{x.paid=prev.paid;x.balance=prev.bal;x.payment_status=prev.ps;keep();S.invStale=true;render();}};};
 const ppanel=canPay?h('div',{class:'swp-pay',role:'group','aria-label':'Ubah pembayaran '+x.invoice_number},
  h('button',{type:'button',class:'swb pay-full','data-pay':'full',onclick:()=>{closeSw();A.quickPay(pinfo());}},'Lunas'),
  h('button',{type:'button',class:'swb','data-pay':'part',onclick:()=>{closeSw();A.payPartial(pinfo(),async()=>{delete S.cache.inv;S.openSw=null;render();});}},'Bayar sebagian')):null;
 const wrap=h('div',{class:'swp'},panel,...(ppanel?[ppanel]:[]),card);
 const tg=h('button',{type:'button',class:'swt','aria-label':'Ubah status pesanan '+x.invoice_number,onclick:()=>{const o=wrap.classList.contains('open');closeSw();if(!o){wrap.classList.add('open');S.openSw=wrap;}}},'Status ‹');wrap.appendChild(tg);
 if(canPay){const tp=h('button',{type:'button',class:'swt swt-l','aria-label':'Ubah pembayaran '+x.invoice_number,onclick:()=>{const o=wrap.classList.contains('openr');closeSw();if(!o){wrap.classList.add('openr');S.openSw=wrap;}}},'› Bayar');wrap.appendChild(tp);}
 let sx=0,sy=0,base=0,dx=0,drag=false,moved=false,swallow=false;const cur=()=>wrap.classList.contains('open')?-SWW:wrap.classList.contains('openr')?SWP:0;
 card.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;sx=e.clientX;sy=e.clientY;dx=0;drag=true;moved=false;base=cur();});
 card.addEventListener('pointermove',e=>{if(!drag)return;const mx=e.clientX-sx,my=e.clientY-sy;
  if(!moved){if(Math.abs(mx)>10&&Math.abs(mx)>Math.abs(my)*1.2){moved=true;if(S.openSw&&S.openSw!==wrap)closeSw();if(card.setPointerCapture){try{card.setPointerCapture(e.pointerId);}catch(_){}}card.style.transition='none';wrap.classList.add('drg');}else if(Math.abs(my)>10){drag=false;return;}}
  if(moved){dx=Math.max(-SWW,Math.min(canPay?SWP:0,base+mx));card.style.transform='translateX('+dx+'px)';wrap.classList.toggle('dr',dx>0);}});
 const end=()=>{if(!drag)return;drag=false;if(!moved)return;card.style.transition='';card.style.transform='';setTimeout(()=>wrap.classList.remove('drg','dr'),220);
  wrap.classList.remove('open','openr');let st='';if(base===0){st=dx<-50?'open':(dx>50&&canPay?'openr':'');}else if(base<0){st=dx<-SWW+50?'open':'';}else{st=dx>SWP-50?'openr':'';}
  if(st)wrap.classList.add(st);S.openSw=st?wrap:(S.openSw===wrap?null:S.openSw);swallow=true;setTimeout(()=>{swallow=false;},350);};
 card.addEventListener('pointerup',end);card.addEventListener('pointercancel',end);
 card.addEventListener('click',e=>{if(swallow){e.preventDefault();e.stopPropagation();return;}if(wrap.classList.contains('open')||wrap.classList.contains('openr')){e.preventDefault();closeSw();}},true);
 return wrap;}
async function vHome(el,my){
 el.appendChild(h('div',{class:'chips',role:'group','aria-label':'Filter'},...TABS.map(t=>h('button',{class:'chip',type:'button','aria-pressed':String(S.tab===t[0]),onclick:()=>{S.tab=t[0];render();}},t[0]))));
 setTimeout(()=>{const c=el.querySelector('.chip[aria-pressed="true"]');if(c&&c.scrollIntoView)c.scrollIntoView({inline:'center',block:'nearest'});},0);
 if(S.showSearch){const i=h('input',{class:'search',type:'search',placeholder:'Cari nomor invoice atau nama pelanggan','aria-label':'Cari invoice',value:S.q,oninput:e=>{S.q=e.target.value;paint();}});el.appendChild(i);}
 const sum=h('div'),list=h('div'),note=h('p',{class:'sub',id:'h-stale'},'Memperbarui…');
 let all=S.cache.inv,stale=!!S.invStale;
 if(!all){const c=lsJson(INV_KEY);if(Array.isArray(c)){all=S.cache.inv=c;stale=true;S.invStale=true;}}// salinan tersimpan: tampil instan, lalu diperbarui di latar belakang
 if(stale)el.appendChild(note);el.appendChild(sum);el.appendChild(list);
 if(!all){skel(list);all=S.cache.inv=await api('invoices.list');ls.set(INV_KEY,JSON.stringify(all));}
 if(my!==S.seq)return;
 function drawSum(){sum.textContent='';const open=all.filter(x=>OPEN.indexOf(x.payment_status)>=0);
  sum.appendChild(h('div',{class:'kpis k3'},...[['Belum Bayar',rp(open.reduce((n,x)=>n+x.balance,0))],['Diterima',rp(all.filter(x=>x.state==='Issued').reduce((n,x)=>n+x.paid,0))],['Invoice',all.filter(x=>x.state!=='Cancelled').length]].map(k=>h('div',{class:'kpi'},h('span',{class:'sub'},k[0]),h('b',null,k[1])))));}
 function paint(){list.textContent='';const q=S.q.trim().toLowerCase();let rows=all.slice().sort((a,b)=>String(b.issue_date).localeCompare(String(a.issue_date))||String(b.invoice_number).localeCompare(String(a.invoice_number)));
  if(S.tab==='Unpaid')rows=rows.filter(x=>OPEN.indexOf(x.payment_status)>=0);else if(S.tab==='Paid')rows=rows.filter(x=>x.payment_status==='Paid');else if(S.tab==='Cancelled')rows=rows.filter(x=>x.state==='Cancelled');else if(FUL[S.tab])rows=rows.filter(x=>x.state==='Issued'&&effStatus(x.fulfillment_status,x.payment_status)===FUL[S.tab]);else rows=rows.filter(x=>x.state!=='Cancelled');
  if(q)rows=rows.filter(x=>String(x.invoice_number).toLowerCase().indexOf(q)>=0||String(x.cust_name).toLowerCase().indexOf(q)>=0);
  if(!rows.length){list.appendChild(empty(S.tab==='Cancelled'&&!q?'Belum ada invoice dibatalkan':FUL[S.tab]&&!q?'Belum ada pesanan di tab '+S.tab:(all.length?'Tidak ada invoice':'Belum ada invoice'),S.tab==='Cancelled'&&!q?'Invoice yang dibatalkan akan tampil di tab ini.':all.length?'Coba filter atau kata kunci lain.':'Invoice yang dibuat atau diimpor akan tampil di sini.'));return;}
  rows.slice(0,300).forEach(x=>list.appendChild(rowEl(x)));
  if(rows.length>300)list.appendChild(h('p',{class:'sub'},'Menampilkan 300 pertama dari '+rows.length+'. Gunakan pencarian untuk mempersempit.'));}
 drawSum();paint();
 if(stale)api('invoices.list').then(n=>{S.cache.inv=n;ls.set(INV_KEY,JSON.stringify(n));if(my!==S.seq)return;S.invStale=false;all=n;note.remove();drawSum();paint();}).catch(()=>{if(my===S.seq)note.textContent='Tidak bisa memperbarui. Menampilkan data tersimpan.';});
 const f=h('button',{class:'fab',type:'button','aria-label':'Buat invoice baru',onclick:()=>{location.hash='#/invoice-edit';}},'+');document.body.appendChild(f);}
async function vMore(el,my){const b=S.boot,s=b.settings||{};
 el.appendChild(h('div',{class:'hero'},h('div',{class:'row'},h('div',{class:'mark','aria-hidden':'true',style:'width:56px;height:56px;font-size:22px'},initials(s.business_name)),h('div',{style:'flex:1;min-width:0'},h('div',{style:'font:700 22px var(--serif)'},s.business_name||'AeneFlow'),h('div',{class:'sub'},b.user.email+' · '+b.user.role)))));
 const k=h('div',{class:'kpis'});el.appendChild(k);
 el.appendChild(h('div',{class:'card menu'},h('a',{href:'#/customers'},'Customers',h('span',null,'›')),h('a',{href:'#/products'},'Products & Catalog',h('span',null,'›')),h('a',{href:'#/reports'},'Reports',h('span',null,'›')),h('a',{href:'#/expenses',id:'m-exp'},'Pengeluaran',h('span',null,'›')),h('a',{href:'#/settings'},'Settings',h('span',null,'›'))));
 el.appendChild(h('p',{class:'sub'},'Revenue, laba, dan margin akan tampil di sini bersama modul Reports.'));
 const [c,p,i]=await Promise.all([api('customers.list'),api('products.list'),S.cache.inv?Promise.resolve(S.cache.inv):api('invoices.list')]);if(my!==S.seq)return;S.cache.inv=i;
 [['Customers',c.length],['Products',p.length],['Invoices',i.length]].forEach(x=>k.appendChild(h('div',{class:'kpi'},h('span',{class:'sub'},'Total '+x[0]),h('b',null,x[1]))));}
async function vCust(el,my){skel(el);const c=await api('customers.list');if(my!==S.seq)return;el.textContent='';if(!c.length)return el.appendChild(empty('Belum ada pelanggan','Pelanggan yang dibuat atau diimpor akan tampil di sini.'));
 c.forEach(x=>el.appendChild(h('div',{class:'item'},h('b',null,x.name),h('div',{class:'sub'},[x.organization,x.whatsapp].filter(Boolean).join(' · ')))));}
async function vProd(el,my){skel(el);const p=await api('products.list');if(my!==S.seq)return;el.textContent='';if(!p.length)return el.appendChild(empty('Belum ada produk','Produk yang dibuat atau diimpor akan tampil di sini.'));
 p.forEach(x=>el.appendChild(h('div',{class:'item'},h('div',{class:'row'},h('b',null,x.name),h('b',null,rp(x.sell_price))),h('div',{class:'sub'},[x.category,x.unit].filter(Boolean).join(' · ')))));}
async function vSettings(el){const owner=S.boot.user.role==='owner';
 if(owner)el.appendChild(h('div',{class:'card menu'},h('a',{href:'#/import'},'Impor Data Historis',h('span',null,'›'))));
 el.appendChild(h('div',{class:'card'},h('div',{class:'sub'},'Akun'),h('div',null,S.boot.user.email),h('div',{style:'margin-top:10px'},h('button',{class:'btn',type:'button',onclick:()=>logout('Anda sudah keluar.')},'Keluar'),' ',h('button',{class:'btn',type:'button',id:'logout-all',onclick:()=>logoutAll()},'Keluar dari semua perangkat'))));
 el.appendChild(h('p',{class:'sub'},'AeneFlow · shell v0.1. Pengaturan usaha, rekening, dan Google Calendar belum dibangun.'));}
async function vImport(el){if(S.boot.user.role!=='owner')return el.appendChild(empty('Khusus pemilik','Hanya pemilik yang boleh mengimpor data.'));
 if(!window.AeneImport)return el.appendChild(h('div',{class:'banner',role:'alert'},'Modul impor tidak termuat.'));window.AeneImport.mount(el,{api:api});}
window.AeneApp={api:api,logout:logout,logoutAll:logoutAll};
const A={eff:effStatus,ostPill:ostPill,OST:OST,h:h,icon:icon,rp:rp,fdate:fdate,toast:toast,S:S,api:api,ROUTES:ROUTES,render:render,param:param,empty:empty,skel:skel,initials:initials};
(window.AeneModules||[]).forEach(f=>{try{f(A);}catch(e){console.error('Modul gagal dimuat',e);}});

// ---------- mulai ----------
function showSetup(msg){$('splash').hidden=true;const l=$('login');l.hidden=false;l.textContent='';
 const api_=h('input',{type:'text',inputmode:'url',autocomplete:'off',autocapitalize:'none',spellcheck:'false',placeholder:'https://script.google.com/macros/s/.../exec','aria-label':'Alamat Web App'}),
  cid=h('input',{type:'text',autocomplete:'off',autocapitalize:'none',spellcheck:'false',placeholder:'1234567890-abc.apps.googleusercontent.com','aria-label':'Client ID Google'}),err=h('p',{class:'err',role:'alert'},msg||'');
 const save=()=>{const a=api_.value.trim(),c=cid.value.trim();
  if(!API_RE.test(a))return void(err.textContent='Alamat Web App tidak valid. Harus berawalan https://script.google.com/macros/s/ dan berakhiran /exec.');
  if(!CID_RE.test(c))return void(err.textContent='Client ID tidak valid. Bentuknya angka-huruf.apps.googleusercontent.com.');
  const ok=writeStored({apiUrl:a,clientId:c});C.apiUrl=a;C.clientId=c;if(!ok)toast('Penyimpanan perangkat tidak tersedia; konfigurasi hanya berlaku sementara.');start();};
 l.appendChild(h('div',{class:'panel setup'},h('img',{class:'mark-img',src:'icon-192.png',alt:'',width:'72',height:'72'}),h('h1',{class:'brand'},'AeneFlow'),h('p',{class:'tag'},'Konfigurasi perangkat'),
  h('p',{class:'sub',style:'margin:12px 0'},'Isi sekali di perangkat ini. Kedua nilai ini bukan kata sandi dan hanya disimpan di perangkat ini.'),
  h('label',null,'Alamat Web App',api_),h('label',null,'Client ID Google',cid),err,h('button',{class:'btn pri',type:'button',onclick:save},'Simpan')));}
async function start(){
 if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'))navigator.serviceWorker.register('sw.js').catch(()=>{});
 if(!C.apiUrl||!C.clientId){showSetup('');return;}
 S.sess=ls.get(SESS_KEY)||'';
 if(S.sess){// sesi tersimpan: langsung masuk tanpa menunggu/menekan Google Sign-In
  waitGoogle().then(()=>{google.accounts.id.initialize({client_id:C.clientId,callback:onCred,auto_select:false,cancel_on_tap_outside:false});}).catch(()=>{});
  enter();return;}
 try{await waitGoogle();}catch(e){showLogin(e.message,true);return;}
 google.accounts.id.initialize({client_id:C.clientId,callback:onCred,auto_select:true,cancel_on_tap_outside:false});
 showLogin('');google.accounts.id.prompt();}
start();
})();
