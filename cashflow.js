/* AeneFlow - cashflow.js (R4): halaman Cashflow (pemasukan, pengeluaran, saldo rekening, laba-rugi bulanan, transaksi) + Pengaturan Cashflow (saldo awal, kategori).
   Pembayaran invoice otomatis jadi pemasukan (dari server). Semua teks lewat textContent. Hanya pemilik. */
(window.AeneModules=window.AeneModules||[]).push(function(A){'use strict';
const h=A.h,ui=A.ui,rp=A.rp,S=A.S,api=A.api;
const ACCTS=['BCA','BRI','Mandiri','Tunai'];
const MON=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const monLabel=m=>{const p=String(m).split('-');return MON[Number(p[1])-1]||p[1];};
const dLabel=d=>{const p=String(d).split('-');return Number(p[2])+' '+(MON[Number(p[1])-1]||'')};
function period(k){const t=ui.today(),y=Number(t.slice(0,4)),m=Number(t.slice(5,7)),pad=n=>('0'+n).slice(-2);
 if(k==='month')return{from:y+'-'+pad(m)+'-01',to:t};
 if(k==='3m'){let mm=m-2,yy=y;if(mm<1){mm+=12;yy--;}return{from:yy+'-'+pad(mm)+'-01',to:t};}
 if(k==='year')return{from:y+'-01-01',to:t};
 return{from:'',to:''};}
const PER=[['month','Bulan ini'],['3m','3 bulan'],['year','Tahun ini'],['all','Semua']];
const kpi=(label,val,sub,cls,id)=>h('div',{class:'kpi',id:id||null},h('span',{class:'sub'},label),h('b',{class:cls||''},val),h('small',{class:'sub'},sub||''));
const row=(a,b,cls)=>h('div',{class:'mini'},h('span',null,a),h('span',{class:cls||''},b));
// ---------- form Catat ----------
function addForm(r,done,opt){opt=opt||{};ui.sheet(opt.title||'Catat',(b,close)=>{const err=h('div');b.appendChild(err);
 const E=opt.edit||null;let kind=E?E.kind:'out',amt=E?E.amount:0;const kinds=E?[[E.kind,'']]:opt.onlyOut?[['out','Pengeluaran']]:[['out','Pengeluaran'],['in','Pemasukan'],['transfer','Transfer']];
 const am=ui.money(amt,n=>{amt=n;},{'aria-label':'Nominal',id:'cf-amt'}),dt=h('input',{type:'date',id:'cf-date',value:E?E.date:ui.today(),'aria-label':'Tanggal'}),
  acc=ui.select(ACCTS.map(a=>[a,a]),E?E.account:'BCA',{id:'cf-acc','aria-label':'Rekening'}),to=ui.select(ACCTS.map(a=>[a,a]),E&&E.to_account?E.to_account:'Tunai',{id:'cf-to','aria-label':'Rekening tujuan'}),
  cat=h('select',{id:'cf-cat','aria-label':'Kategori'}),ds=ui.text({id:'cf-desc',value:E?E.desc||'':'',maxlength:'200',placeholder:'mis. Mika 100 pcs (boleh kosong)','aria-label':'Keterangan'}),pt=ui.text({id:'cf-party',value:E?E.party||'':'',maxlength:'100',placeholder:'mis. Toko Kain Jaya (boleh kosong)','aria-label':'Pihak terkait'});
 const chips=h('div',{class:'chips',role:'group','aria-label':'Jenis',id:'cf-kinds'}),dyn=h('div');
 function drawCats(){cat.textContent='';(r.categories||[]).filter(c=>c.direction===kind).sort((x,y)=>(x.prive?1:0)-(y.prive?1:0)).forEach(c=>cat.appendChild(h('option',{value:c.category_id},c.name)));
  if(E&&E.cat_id&&!(r.categories||[]).some(c=>c.category_id===E.cat_id)&&kind===E.kind)cat.appendChild(h('option',{value:E.cat_id},E.category||'Kategori lama'));if(E&&E.cat_id&&kind===E.kind)cat.value=E.cat_id;}
 function draw(){chips.textContent='';kinds.forEach(k=>chips.appendChild(h('button',{class:'chip','data-k':k[0],type:'button','aria-pressed':String(kind===k[0]),onclick:()=>{kind=k[0];draw();}},k[1])));
  dyn.textContent='';drawCats();
  if(kind==='transfer'){dyn.appendChild(h('div',{class:'grid2'},ui.field('Dari rekening',acc),ui.field('Ke rekening',to)));dyn.appendChild(ui.field('Catatan (boleh kosong)',ds));}
  else{dyn.appendChild(ui.field(kind==='in'?'Masuk ke rekening':'Dibayar dari rekening',acc));dyn.appendChild(ui.field('Kategori',cat));dyn.appendChild(ui.field('Keterangan',ds));dyn.appendChild(ui.field('Pihak terkait',pt));}}
 if(!opt.onlyOut&&!E)b.appendChild(chips);b.appendChild(ui.field('Nominal (Rp)',am));b.appendChild(ui.field('Tanggal',dt));b.appendChild(dyn);draw();
 const go=h('button',{class:'btn pri',type:'button',id:'cf-save'},'Simpan');
 go.addEventListener('click',()=>{if(!(amt>0)){ui.banner(err,'Nominal harus lebih dari 0.');return;}
  if(kind!=='transfer'&&!cat.value){ui.banner(err,'Pilih kategori. Tambahkan di Pengaturan Cashflow bila belum ada.');return;}
  if(kind==='transfer'&&acc.value===to.value){ui.banner(err,'Rekening asal dan tujuan tidak boleh sama.');return;}
  ui.run(go,async()=>{await api(E?'cash.update':'cash.add',{txn_id:E?E.id:undefined,kind:kind,amount:amt,date:dt.value,account:acc.value,to_account:to.value,category_id:kind==='transfer'?'':cat.value,description:ds.value.trim(),party:kind==='transfer'?'':pt.value.trim()});close();A.toast(E?'Perubahan disimpan':'Tercatat');done();},m=>ui.banner(err,m));});
 b.appendChild(go);});}
// baris transaksi. Catatan manual (bukan pembayaran invoice) bisa digeser ke kiri: muncul Ubah dan Hapus. Tombol "‹ Aksi" untuk laptop/akses keyboard.
const XW=150;let xOpen=null,xBound=false;
function xClose(){if(xOpen){xOpen.classList.remove('open');xOpen=null;}}
function txLine(t,r){const pos=t.kind==='pay'||t.kind==='in',tr=t.kind==='transfer';
  const sub=dLabel(t.date)+' · '+(tr?t.account+' → '+t.to_account:t.account)+' · '+t.sub+(t.modal?' · di modal':'');
  const amtEl=h('span',{class:tr?'':(t.prive?'cf-prv':(pos?'cf-in':'cf-out'))},(tr?'':(pos?'+ ':'- '))+rp(t.amount));
  const row=h('div',{class:'tx'+(t.prive?' prv':''),'data-kind':t.kind},h('div',{class:'txm'},h('b',null,t.title),h('small',{class:'sub'},sub)),h('div',{class:'txa'},amtEl));
  if(!t.can_void)return row;
  if(!xBound){xBound=true;document.addEventListener('pointerdown',e=>{if(xOpen&&!xOpen.contains(e.target))xClose();},true);}
  const del=async()=>{xClose();const c=await ui.confirm({title:'Hapus catatan?',message:t.title+' · '+rp(t.amount)+'. Saldo rekening dikembalikan. Catatan disimpan sebagai riwayat di spreadsheet.',reason:{label:'Alasan (boleh kosong)'},okText:'Hapus',danger:true});if(!c)return;
    try{await api('cash.void',{txn_id:t.id,reason:c.reason});A.toast('Dihapus');A.render();}catch(e){A.toast(e.message);}};
  const panel=h('div',{class:'xsw-panel',role:'group','aria-label':'Aksi '+t.title},
   h('button',{type:'button',class:'xb','data-act':'edit','aria-label':'Ubah '+t.title,onclick:()=>{xClose();addForm(r,()=>A.render(),{edit:t,title:'Ubah catatan'});}},'Ubah'),
   h('button',{type:'button',class:'xb xdel','data-act':'del','aria-label':'Hapus '+t.title,onclick:del},'Hapus'));
  const wrap=h('div',{class:'xsw'},panel,row);
  row.appendChild(h('button',{type:'button',class:'xsw-t','aria-label':'Tampilkan aksi '+t.title,onclick:()=>{const o=wrap.classList.contains('open');xClose();if(!o){wrap.classList.add('open');xOpen=wrap;}}},'‹ Aksi'));
  let sx=0,sy=0,base=0,dx=0,drag=false,moved=false,swallow=false;
  row.addEventListener('pointerdown',e=>{if(e.target.closest&&e.target.closest('button'))return;if(e.pointerType==='mouse'&&e.button!==0)return;drag=true;moved=false;sx=e.clientX;sy=e.clientY;base=wrap.classList.contains('open')?-XW:0;dx=base;});
  row.addEventListener('pointermove',e=>{if(!drag)return;const mx=e.clientX-sx,my=e.clientY-sy;
   if(!moved){if(Math.abs(mx)>10&&Math.abs(mx)>Math.abs(my)*1.2){moved=true;if(xOpen&&xOpen!==wrap)xClose();if(row.setPointerCapture){try{row.setPointerCapture(e.pointerId);}catch(_){}}row.style.transition='none';wrap.classList.add('drg');}else if(Math.abs(my)>10){drag=false;return;}}
   if(moved){dx=Math.max(-XW,Math.min(0,base+mx));row.style.transform='translateX('+dx+'px)';}});
  const end=()=>{if(!drag)return;drag=false;if(!moved)return;row.style.transition='';row.style.transform='';wrap.classList.remove('drg');
   const open=base===0?dx<-50:dx<-XW+50;wrap.classList.toggle('open',open);xOpen=open?wrap:(xOpen===wrap?null:xOpen);swallow=true;setTimeout(()=>{swallow=false;},350);};
  row.addEventListener('pointerup',end);row.addEventListener('pointercancel',end);
  row.addEventListener('click',e=>{if(swallow){e.preventDefault();e.stopPropagation();return;}if(wrap.classList.contains('open')&&!(e.target.closest&&e.target.closest('button'))){xClose();}},true);
  return wrap;}
// ---------- halaman Cashflow ----------
async function vCash(el,my){
 let cur=S.cfPeriod||'month';const box=h('div');
 el.appendChild(h('div',{class:'chips',role:'group','aria-label':'Periode'},...PER.map(p=>h('button',{class:'chip',type:'button','data-per':p[0],'aria-pressed':String(cur===p[0]),onclick:()=>{S.cfPeriod=p[0];A.render();}},p[1]))));
 el.appendChild(box);ui.skel?ui.skel(box):box.appendChild(h('div',{class:'skel'}));
 let r;try{r=await api('cash.summary',period(cur));}catch(e){if(my!==S.seq)return;box.textContent='';box.appendChild(h('div',{class:'banner',role:'alert'},e.message));return;}
 if(my!==S.seq)return;box.textContent='';const k=r.kpi;
 const neg=n=>(n<0?'- ':'')+rp(Math.abs(n));
 box.appendChild(h('div',{class:'kpis rp-kpis',id:'cf-kpis'},kpi('Uang masuk',rp(k.masuk),k.masuk_invoice?'invoice '+rp(k.masuk_invoice)+(k.masuk_lain?' + lain '+rp(k.masuk_lain):''):(k.masuk_lain?'lain-lain':'belum ada'),'cf-in','cf-k-in'),kpi('Pengeluaran',rp(k.pengeluaran),k.n_pengeluaran+' catatan'+(k.keluar?' · '+rp(k.keluar)+' mengurangi laba':''),'cf-out','cf-k-out'),
  h('div',{class:'kpi',style:'grid-column:span 2',id:'cf-k-net'},h('span',{class:'sub'},'Laba bersih'),h('b',{class:k.laba<0?'cf-out':'',style:'font-size:22px'},neg(k.laba)),h('small',{class:'sub'},'laba kotor invoice '+rp(k.laba_kotor)+(k.masuk_lain?' + pemasukan lain '+rp(k.masuk_lain):'')+(k.keluar?' - biaya operasional '+rp(k.keluar):'')+'. Pengeluaran lain sudah di modal item.')),
  k.prive?h('div',{class:'kpi prv',style:'grid-column:span 2',id:'cf-k-prive'},h('span',{class:'sub'},'Prive ke tabungan owner'),h('b',{class:'cf-prv'},rp(k.prive)),h('small',{class:'sub'},k.n_prive+' setoran · sisa laba setelah prive '+neg(k.sisa))):null));
 if(k.cost_coverage_pct<100)box.appendChild(h('p',{class:'sub',id:'cf-cov'},'Laba kotor hanya dari item invoice yang punya harga modal ('+k.cost_coverage_pct+'% dari omzet; '+k.uncosted_lines+' item tanpa modal belum dihitung).'));
 box.appendChild(h('h2',{class:'sec'},'Saldo rekening'));
 box.appendChild(h('div',{class:'acc',id:'cf-acc-list'},...r.accounts.map(a=>h('div',{class:'card','data-acc':a.name},h('small',{class:'sub'},a.name),h('b',{class:a.balance<0?'cf-out':''},(a.balance<0?'- ':'')+rp(Math.abs(a.balance)))))));
 const set=!r.accounts.some(a=>a.opening);
 if(set)box.appendChild(h('p',{class:'note',id:'cf-note'},'Saldo awal belum diisi, jadi saldo rekening hanya dari catatan di AeneFlow. ',h('a',{href:'#/cashset'},'Isi saldo awal')));
 box.appendChild(h('h2',{class:'sec'},'Laba-rugi bulanan'));
 const mx=Math.max(1,...r.months.map(m=>Math.max(m.laba,m.keluar)));
 box.appendChild(h('div',{class:'card',id:'cf-pnl'},h('div',{class:'rp-bars cf-bars',id:'cf-bars'},...r.months.map(m=>h('div',null,h('div',{class:'pair'},h('i',{class:'bin',style:'height:'+Math.max(3,Math.round(Math.max(0,m.laba)/mx*100))+'px','aria-label':monLabel(m.month)+' laba kotor '+rp(m.laba)}),h('i',{class:'bout',style:'height:'+Math.max(3,Math.round(m.keluar/mx*100))+'px','aria-label':monLabel(m.month)+' biaya usaha '+rp(m.keluar)})),h('span',{class:'sub'},monLabel(m.month))))),
  h('p',{class:'sub'},'Batang kiri laba kotor invoice (menurut tanggal terbit), kanan biaya yang mengurangi laba. 6 bulan terakhir.'),
  row('Laba kotor dari invoice',rp(k.laba_kotor)),...(k.masuk_lain?[row('Pemasukan lain',rp(k.masuk_lain))]:[]),...(k.keluar?[row('Biaya operasional (mengurangi laba)',rp(k.keluar))]:[]),row('Laba bersih',neg(k.laba),k.laba<0?'cf-out':'cf-in'),...(k.modal?[row('Pengeluaran yang sudah di modal item (tidak mengurangi laba)',rp(k.modal))]:[]),...(k.prive?[row('Prive (tabungan owner)',rp(k.prive),'cf-prv'),row('Sisa laba setelah prive',neg(k.sisa))]:[]),
  row('Arus kas (uang masuk - uang keluar)',neg(k.arus_kas))));
 if(r.by_category.length){box.appendChild(h('h2',{class:'sec'},'Pengeluaran per kategori'));const mc=Math.max(1,...r.by_category.map(c=>c.amount));
  box.appendChild(h('div',{class:'card',id:'cf-bycat'},...r.by_category.map(c=>h('div',{style:'margin-bottom:8px'},row(c.name,rp(c.amount)),h('div',{class:'bar2'},h('i',{style:'width:'+Math.round(c.amount/mc*100)+'%'}))))));}
 box.appendChild(h('h2',{class:'sec'},'Transaksi'));
 const list=h('div',{class:'card',id:'cf-list'});
 if(!r.recent.length)list.appendChild(h('p',{class:'sub',id:'cf-empty'},'Belum ada transaksi pada periode ini. Ketuk + untuk mencatat pengeluaran, pemasukan, atau transfer.'));
 r.recent.forEach(t=>list.appendChild(txLine(t,r)));
 if(r.total_recent>r.recent.length)list.appendChild(h('p',{class:'sub'},'Menampilkan '+r.recent.length+' dari '+r.total_recent+' transaksi terbaru. Persempit periode untuk melihat yang lain.'));
 box.appendChild(list);
 box.appendChild(h('div',{class:'card menu',style:'margin-top:14px'},h('a',{href:'#/cashset',id:'cf-setlink'},'Pengaturan Cashflow (saldo awal & kategori)',h('span',null,'›'))));
 const fab=h('button',{class:'fab',type:'button',id:'cf-fab','aria-label':'Catat pemasukan, pengeluaran, atau transfer',onclick:()=>addForm(r,()=>A.render())},'+');box.appendChild(fab);}
// ---------- menu Pengeluaran (More) ----------
async function vExp(el,my){
 let cur=S.exPeriod||'month',cf=S.exCat||'';const box=h('div');
 const addBtn=h('button',{class:'btn pri',type:'button',id:'ex-add',style:'width:100%;margin:0 0 8px'},'+ Tambah pengeluaran');el.appendChild(addBtn);
 el.appendChild(h('div',{class:'chips',role:'group','aria-label':'Periode'},...PER.map(p=>h('button',{class:'chip',type:'button','data-per':p[0],'aria-pressed':String(cur===p[0]),onclick:()=>{S.exPeriod=p[0];S.exCat='';A.render();}},p[1]))));
 el.appendChild(box);ui.skel?ui.skel(box):box.appendChild(h('div',{class:'skel'}));
 let r;try{r=await api('cash.summary',Object.assign({only:'out'},period(cur)));}catch(e){if(my!==S.seq)return;box.textContent='';box.appendChild(h('div',{class:'banner',role:'alert'},e.message));return;}
 if(my!==S.seq)return;box.textContent='';const k=r.kpi;
 addBtn.addEventListener('click',()=>addForm(r,()=>A.render(),{onlyOut:true,title:'Tambah pengeluaran'}));
 box.appendChild(h('div',{class:'kpis rp-kpis',id:'ex-kpis'},kpi('Total pengeluaran',rp(k.pengeluaran),k.n_pengeluaran+' catatan'+(k.n_pengeluaran?' · rata-rata '+rp(Math.round(k.pengeluaran/k.n_pengeluaran)):''),'cf-out','ex-k-out'),kpi('Prive (tabungan owner)',rp(k.prive),k.n_prive+' setoran','cf-prv','ex-k-prive'),
  h('div',{class:'kpi',style:'grid-column:span 2',id:'ex-k-modal'},h('span',{class:'sub'},'Mengurangi laba'),h('b',{class:'cf-out'},rp(k.keluar)),h('small',{class:'sub'},rp(k.modal)+' sisanya sudah di modal item (tidak mengurangi laba). Atur per kategori di Pengaturan Cashflow.'))));
 const tot=k.pengeluaran;
 if(r.by_category.length){box.appendChild(h('h2',{class:'sec'},'Per kategori'));const mc=Math.max(1,...r.by_category.map(c=>c.amount));
  box.appendChild(h('div',{class:'card',id:'ex-bycat'},...r.by_category.map(c=>h('div',{style:'margin-bottom:8px'},row(c.name+' '+(tot?Math.round(c.amount/tot*100)+'%':'')+(c.modal?' · di modal':''),rp(c.amount)),h('div',{class:'bar2'},h('i',{style:'width:'+Math.round(c.amount/mc*100)+'%'}))))));}
 box.appendChild(h('h2',{class:'sec'},'Daftar'));
 const names=[];r.recent.forEach(t=>{const n=t.category||'Lainnya';if(names.indexOf(n)<0)names.push(n);});
 if(cf&&names.indexOf(cf)<0)cf='';
 if(names.length>1)box.appendChild(h('div',{class:'chips',id:'ex-filter',role:'group','aria-label':'Kategori'},...[['','Semua']].concat(names.map(n=>[n,n])).map(c=>h('button',{class:'chip',type:'button','data-cat':c[0],'aria-pressed':String(cf===c[0]),onclick:()=>{S.exCat=c[0];A.render();}},c[1]))));
 const list=h('div',{class:'card',id:'ex-list'}),rows=r.recent.filter(t=>!cf||(t.category||'Lainnya')===cf);
 if(!rows.length)list.appendChild(h('p',{class:'sub',id:'ex-empty'},'Belum ada pengeluaran pada periode ini. Ketuk "+ Tambah pengeluaran" untuk mencatat.'));
 rows.forEach(t=>list.appendChild(txLine(t,r)));
 if(r.total_recent>r.recent.length)list.appendChild(h('p',{class:'sub'},'Menampilkan '+r.recent.length+' dari '+r.total_recent+' catatan terbaru. Persempit periode untuk melihat yang lain.'));
 box.appendChild(list);
 box.appendChild(h('p',{class:'sub'},'Pengeluaran dan Prive mengurangi saldo rekening. Pengeluaran yang sudah di modal item dan Prive tidak mengurangi laba bersih. Atur kategori mana yang mengurangi laba di Pengaturan Cashflow.'));}
// ---------- Pengaturan Cashflow ----------
async function vCashSet(el,my){
 const box=h('div');el.appendChild(box);ui.skel?ui.skel(box):box.appendChild(h('div',{class:'skel'}));
 let r;try{r=await api('cash.summary',{from:ui.today(),to:ui.today()});}catch(e){if(my!==S.seq)return;box.textContent='';box.appendChild(h('div',{class:'banner',role:'alert'},e.message));return;}
 if(my!==S.seq)return;box.textContent='';
 const op={};r.accounts.forEach(a=>{op[a.name]=a.opening||0;});const inp={},errBox=h('div');box.appendChild(errBox);
 box.appendChild(h('h2',{class:'sec'},'Saldo awal rekening'));box.appendChild(h('p',{class:'sub'},'Isi sekali: saldo tiap rekening sebelum Anda mulai mencatat di AeneFlow. Setelah itu saldo bergerak otomatis dari pembayaran invoice, pengeluaran, dan transfer.'));
 const card=h('div',{class:'card',id:'cs-open'});ACCTS.forEach(a=>{inp[a]=ui.money(op[a]||0,v=>{op[a]=v;},{'aria-label':'Saldo awal '+a,'data-acc':a,inputmode:'numeric'});card.appendChild(ui.field(a,inp[a]));});box.appendChild(card);
 const go=h('button',{class:'btn pri',type:'button',id:'cs-save'},'Simpan saldo awal');
 go.addEventListener('click',()=>ui.run(go,async()=>{const o={};ACCTS.forEach(a=>{o[a]=op[a]||0;});const rs=await api('settings.save',{settings:{opening_balances:o}});S.boot.settings=rs.settings;ui.banner(errBox,'');A.toast('Saldo awal disimpan');},m=>ui.banner(errBox,m)));
 box.appendChild(go);
 box.appendChild(h('h2',{class:'sec'},'Kategori'));box.appendChild(h('p',{class:'sub'},'Dipakai saat mencatat pengeluaran atau pemasukan. Kategori yang disembunyikan tidak muncul lagi di pilihan, tetapi riwayatnya tetap utuh.'));
 const cbox=h('div',{id:'cs-cats'});box.appendChild(cbox);
 function drawCats(){cbox.textContent='';[['out','Pengeluaran'],['in','Pemasukan']].forEach(g=>{
  const c=h('div',{class:'card'},h('b',null,g[1]));(r.categories||[]).filter(x=>x.direction===g[0]).forEach(x=>{
   const tg=(g[0]==='out'&&!x.prive)?h('button',{class:'chip cs-tg',type:'button','data-cat-id':x.category_id,'aria-pressed':String(!!x.in_pnl),style:'min-height:32px;font-size:11px',onclick:async()=>{try{await api('cash.category_set',{category_id:x.category_id,in_pnl:!x.in_pnl});x.in_pnl=!x.in_pnl;drawCats();}catch(e){A.toast(e.message);}}},x.in_pnl?'Kurangi laba: ya':'Sudah di modal'):(x.prive?h('span',{class:'sub'},'di luar laba'):null);
   c.appendChild(h('div',{class:'mini'},h('span',null,x.name),h('span',{style:'display:flex;gap:10px;align-items:center'},tg,x.prive?null:h('button',{class:'linkbtn',type:'button','aria-label':'Sembunyikan '+x.name,onclick:async()=>{try{await api('cash.category_off',{category_id:x.category_id});r.categories=r.categories.filter(y=>y.category_id!==x.category_id);drawCats();}catch(e){A.toast(e.message);}}},'Sembunyikan'))));});
  if(g[0]==='out')c.appendChild(h('p',{class:'sub'},'"Sudah di modal" (bawaan semua kategori): biaya ini sudah dihitung di harga modal per item di invoice, jadi tidak mengurangi laba lagi (tetap mengurangi saldo rekening). Pilih "Kurangi laba: ya" hanya untuk biaya yang TIDAK ada di hitungan modal per item, misalnya listrik, sewa, gaji tetap, iklan.'));
  const nm=ui.text({maxlength:'40',placeholder:'Kategori baru','aria-label':'Kategori '+g[1].toLowerCase()+' baru','data-dir':g[0]});
  const add=h('button',{class:'btn',type:'button','data-add':g[0],onclick:()=>ui.run(add,async()=>{const n=nm.value.trim();if(!n)throw new Error('Nama kategori wajib diisi');const x=await api('cash.category_add',{name:n,direction:g[0]});r.categories.push({category_id:x.category_id,name:n,direction:g[0]});drawCats();},m=>A.toast(m))},'Tambah');
  c.appendChild(h('div',{class:'row',style:'gap:8px;margin-top:8px'},nm,add));cbox.appendChild(c);});}
 drawCats();}
A.ROUTES.cashflow={t:'Cashflow',nav:'cashflow',v:vCash};
A.ROUTES.expenses={t:'Pengeluaran',nav:'more',back:'more',v:vExp};
A.ROUTES.cashset={t:'Pengaturan Cashflow',nav:'more',back:'cashflow',v:vCashSet};
});
