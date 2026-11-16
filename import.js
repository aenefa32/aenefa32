/* AeneFlow - import.js: modul frontend Historical Data Import.
   Dipasang dari dalam aplikasi: AeneImport.mount(elemen, {api}) dengan api(action, params) -> Promise<data> (login Google & token dipegang shell aplikasi).
   File Excel/CSV dibaca DI PERANGKAT ini; file sumber tidak pernah diubah atau diunggah ke mana pun selain baris yang dikirim ke backend AeneFlow.
   Semua teks data ditampilkan lewat textContent (tidak ada innerHTML). Excel (.xlsx/.xls) membutuhkan pustaka SheetJS (global XLSX); CSV tidak. */
(function(root){'use strict';
const KINDS=[['customers','Pelanggan'],['products','Produk'],['invoices','Invoice (riwayat)'],['payments','Pembayaran'],['expenses','Pengeluaran / pemasukan lain']];
const SYN={name:['nama pelanggan','nama produk','nama','customer','pelanggan'],whatsapp:['whatsapp','wa','hp','telepon','no hp','no telp','phone'],organization:['instansi','organisasi','perusahaan','company'],email:['email','e mail'],address:['alamat','address'],city:['kota','city'],notes:['catatan','keterangan','notes'],
 category:['kategori','category','jenis'],unit:['satuan','unit'],sell_price:['harga jual','harga','price'],cost_price:['harga modal','modal','hpp','cost'],description:['deskripsi','description','spesifikasi'],
 invoice_number:['nomor invoice','no invoice','invoice no','invoice number','no inv','invoice','inv','nomor'],issue_date:['tanggal invoice','tgl invoice','invoice date','tanggal','tgl','date'],cust_name:['nama pelanggan','pelanggan','customer','nama customer','kepada','nama'],
 cust_whatsapp:['whatsapp','wa','hp','telepon','no hp','phone'],cust_org:['instansi','organisasi','perusahaan'],cust_email:['email'],cust_address:['alamat'],due_date:['jatuh tempo','due date','tempo'],item_name:['nama item','nama barang','nama produk','produk','barang','item'],
 item_description:['spesifikasi','deskripsi item','keterangan item'],qty:['qty','jumlah','kuantitas','quantity'],unit_price:['harga satuan','harga','unit price'],item_cost:['modal satuan','modal','hpp','cost'],discount_amount:['diskon rp','diskon nominal','diskon','discount'],discount_percent:['diskon %','diskon persen'],
 tax_rate:['ppn','pajak','tax'],shipping_fee:['ongkir','ongkos kirim','shipping'],extra_fee:['biaya tambahan','biaya lain','extra'],invoice_total:['total','grand total','total tagihan','jumlah tagihan'],paid_amount:['dibayar','sudah dibayar','total bayar','paid'],payment_text:['status bayar','status pembayaran','pembayaran','lunas'],status_text:['status invoice','status'],
 payment_date:['tanggal bayar','tgl bayar','tanggal pembayaran','payment date'],amount:['nominal','jumlah','amount','total'],method:['metode','metode bayar','payment method'],reference_no:['referensi','no referensi','ref'],
 txn_date:['tanggal','tgl','date'],party:['vendor','pihak','toko','supplier'],direction:['arah','jenis transaksi','tipe']};
const norm=s=>String(s==null?'':s).toLowerCase().replace(/[^a-z0-9% ]+/g,' ').replace(/\s+/g,' ').trim();
const normInv=s=>String(s==null?'':s).trim().toUpperCase().replace(/\s+/g,' ');
function parseCsv(text){if(text.charCodeAt(0)===0xFEFF)text=text.slice(1);const first=text.split(/\r?\n/)[0]||'';
 const delim=[',',';','\t'].map(d=>[d,first.split(d).length]).sort((a,b)=>b[1]-a[1])[0][0];
 const rows=[];let row=[],cur='',q=false;
 for(let i=0;i<text.length;i++){const ch=text[i];
  if(q){if(ch==='"'){if(text[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=ch;}
  else if(ch==='"')q=true;else if(ch===delim){row.push(cur);cur='';}
  else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cur);cur='';rows.push(row);row=[];}
  else cur+=ch;}
 if(cur!==''||row.length){row.push(cur);rows.push(row);}return rows;}
function toTable(matrix){const src=[],data=[];let hi=matrix.findIndex(r=>r.some(c=>String(c==null?'':c).trim()!==''));if(hi<0)return{headers:[],rows:[],src:[]};
 const headers=matrix[hi].map((h,i)=>String(h==null?'':h).trim()||('Kolom '+(i+1)));
 for(let i=hi+1;i<matrix.length;i++){const r=matrix[i];if(!r||!r.some(c=>c!==null&&c!==undefined&&String(c).trim()!==''))continue;data.push(headers.map((_,j)=>r[j]===undefined?null:r[j]));src.push(i+1);}
 return{headers:headers,rows:data,src:src};}
function suggest(fields,headers){const map={},used={},nh=headers.map(norm);
 // putaran 1: cocok persis untuk SEMUA field; putaran 2: cocok sebagian hanya untuk field yang belum terpetakan
 [false,true].forEach(partial=>fields.forEach(f=>{if(map[f[0]])return;
  for(const s of (SYN[f[0]]||[])){if(partial&&s.length<3)continue;const i=nh.findIndex((h,k)=>!used[k]&&(partial?h.indexOf(s)>=0:h===s));if(i>=0){used[i]=1;map[f[0]]=headers[i];break;}}}));return map;}
// kelompokkan baris per potongan; untuk invoice, semua baris satu nomor invoice selalu dalam potongan yang sama
function makeChunks(table,kind,mapping,size){const out=[];
 if(kind!=='invoices'||!mapping.invoice_number){for(let i=0;i<table.rows.length;i+=size)out.push({rows:table.rows.slice(i,i+size),src:table.src.slice(i,i+size)});return out;}
 const ki=table.headers.indexOf(mapping.invoice_number),groups=new Map();
 table.rows.forEach((r,i)=>{const k=normInv(r[ki])||('#blank'+i);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);});
 let cur={rows:[],src:[]};groups.forEach(idx=>{idx.forEach(i=>{cur.rows.push(table.rows[i]);cur.src.push(table.src[i]);});if(cur.rows.length>=size){out.push(cur);cur={rows:[],src:[]};}});
 if(cur.rows.length)out.push(cur);return out;}
function csvCell(v){let s=String(v==null?'':v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return /[",\n;]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function toCsv(rows){return '﻿'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');}
const rp=n=>'Rp '+Number(n||0).toLocaleString('id-ID');
const core={parseCsv:parseCsv,toTable:toTable,suggest:suggest,makeChunks:makeChunks,toCsv:toCsv,normInv:normInv,SYN:SYN};
if(typeof module!=='undefined'&&module.exports){module.exports=core;}
if(typeof document==='undefined')return;

function el(tag,props){const e=document.createElement(tag);props=props||{};Object.keys(props).forEach(k=>{if(k==='class')e.className=props[k];else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),props[k]);else if(k==='value')e.value=props[k];else if(props[k]!==false&&props[k]!==null&&props[k]!==undefined)e.setAttribute(k,props[k]);});
 for(let i=2;i<arguments.length;i++){const c=arguments[i];if(c===null||c===undefined||c===false)continue;e.appendChild(typeof c==='string'||typeof c==='number'?document.createTextNode(String(c)):c);}return e;}
function download(name,text){const a=el('a',{href:URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),download:name});document.body.appendChild(a);a.click();a.remove();}
function readFile(file){return new Promise((res,rej)=>{const fr=new FileReader(),isX=/\.xlsx?$/i.test(file.name);
 fr.onerror=()=>rej(new Error('File tidak bisa dibaca'));
 fr.onload=()=>{try{if(isX){if(!root.XLSX)throw new Error('Pustaka Excel (SheetJS) belum dimuat. Simpan sebagai CSV, atau muat SheetJS.');
   const wb=root.XLSX.read(fr.result,{type:'array'});res({sheets:wb.SheetNames,get:n=>root.XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:null})});}
  else res({sheets:['CSV'],get:()=>parseCsv(String(fr.result))});}catch(e){rej(e);}};
 if(isX)fr.readAsArrayBuffer(file);else fr.readAsText(file);});}

function mount(host,cfg){const api=cfg.api,S={kind:'invoices',file:null,book:null,table:null,fields:null,meta:null,mapping:{},options:{date_order:'dmy',paid_without_detail:'none',fulfillment_default:'Completed',create_customers:true,include_mismatch:false,tolerance:0},preview:null,busy:'',err:'',report:null,history:null};
 const call=async(a,p)=>{S.err='';try{return await api(a,p||{});}catch(e){S.err=String(e.message||e);throw e;}};
 async function ensureMeta(){if(!S.meta)S.meta=await call('import.fields');S.fields=S.meta.fields[S.kind];}
 async function onFile(f){S.file=f;S.preview=null;S.report=null;try{S.err='';await ensureMeta();S.book=await readFile(f);useSheet(S.book.sheets[0]);}catch(e){S.err=e.message;}draw();}
 function useSheet(n){S.sheet=n;S.table=toTable(S.book.get(n));S.mapping=suggest(S.fields,S.table.headers);S.preview=null;}
 const payload=()=>({kind:S.kind,headers:S.table.headers,rows:S.table.rows,src_rows:S.table.src,mapping:S.mapping,options:S.options,filename:S.file?S.file.name:''});
 async function runPreview(){S.busy='Memeriksa data (tidak ada yang ditulis)...';draw();try{S.preview=await call('import.preview',payload());}catch(e){}S.busy='';draw();}
 async function runImport(){const pv=S.preview,total=S.table.rows.length;S.busy='Membuat backup...';draw();
  try{const exp=Object.assign({},pv);delete exp.issues;const b=await call('import.begin',{kind:S.kind,filename:S.file.name,mapping:S.mapping,options:S.options,expected:exp,approved:true});
   const chunks=makeChunks(S.table,S.kind,S.mapping,b.chunk_rows||300);let done=0;
   for(const ch of chunks){S.busy='Mengimpor '+done+' / '+total+' baris...';draw();await call('import.commit',{batch_id:b.batch_id,headers:S.table.headers,rows:ch.rows,src_rows:ch.src});done+=ch.rows.length;}
   S.busy='Rekonsiliasi...';draw();const f=await call('import.finish',{batch_id:b.batch_id});S.report=await call('import.report',{batch_id:b.batch_id});S.report.recon=f.reconciliation;S.preview=null;}
  catch(e){}S.busy='';draw();}
 async function loadHistory(){try{S.history=await call('import.batches');}catch(e){}draw();}
 async function rollback(id){const c=root.prompt('Membatalkan batch ini menandai datanya nonaktif/void (tidak dihapus). Ketik BATALKAN untuk melanjutkan:');if(c!=='BATALKAN')return;S.busy='Membatalkan batch...';draw();try{await call('import.rollback',{batch_id:id,confirm:c});S.history=await call('import.batches');}catch(e){}S.busy='';draw();}
 const sel=(opts,val,fn)=>{const s=el('select',{onchange:e=>fn(e.target.value)});opts.forEach(o=>{const op=el('option',{value:o[0]},o[1]);if(o[0]===val)op.selected=true;s.appendChild(op);});return s;};
 const kpi=(a,b,c)=>el('div',{class:'kpi'},el('span',{class:'note'},a),el('b',{class:c||''},b));
 function viewPreview(){const p=S.preview;if(!p)return null;const k=S.kind,card=el('div',{class:'card'},el('h3',null,'Pratinjau & rekonsiliasi (belum ada data yang ditulis)'));
  card.appendChild(el('div',{class:'kpis'},kpi('Siap diimpor',p.importable,'ok'),kpi('Duplikat (dilewati)',p.duplicate),kpi('Error (ditolak)',p.error,p.error?'bad':''),kpi('Ditahan (selisih total)',p.held,p.held?'warn':''),kpi('Peringatan',p.warning)));
  const L=el('div',{class:'note',style:'margin-top:10px;line-height:1.7'});const add=t=>{L.appendChild(document.createTextNode(t));L.appendChild(el('br'));};
  if(k==='invoices'){add('Total invoice siap impor: '+rp(p.sum_grand_total)+' · rentang tanggal asli '+p.date_min+' s/d '+p.date_max);
   add('Rekonsiliasi total: hitung '+rp(p.recon.computed_sum)+' vs sumber '+rp(p.recon.source_sum)+' ('+p.recon.compared+' invoice dibandingkan) · selisih '+rp(p.recon.diff));
   add('Cakupan modal: '+p.cost_coverage_pct+'% omzet punya harga modal. Sisanya (Rp '+Number(p.revenue_uncosted).toLocaleString('id-ID')+') dikecualikan dari laba & margin.');
   add('Pelanggan baru dibuat: '+p.new_customers+' · dibatalkan di sumber: '+p.cancelled+' · nomor di luar format INV-YYYYMM-NNNN: '+p.number_format_other);
   add('Dinyatakan sudah dibayar di sumber: '+rp(p.paid_declared_sum)+' · invoice dibayar tanpa rincian bayar: '+p.paid_declared_without_payment+(S.options.paid_without_detail==='undated'?' (dicatat TANPA tanggal: '+p.undated_payments.count+' / '+rp(p.undated_payments.sum)+')':' (tetap Unpaid)'));}
  if(k==='payments'){add('Total pembayaran siap impor: '+rp(p.sum_payments)+' pada '+p.invoices+' invoice · tanggal asli '+p.date_min+' s/d '+p.date_max);}
  if(k==='expenses'){add('Pemasukan lain: '+rp(p.sum_in)+' · Pengeluaran: '+rp(p.sum_out));}
  if(k==='products')add('Produk tanpa harga modal: '+p.without_cost+' (dikecualikan dari laba/margin)');card.appendChild(L);
  if(p.issues.length){const t=el('table',null,el('tr',null,el('th',null,'Baris'),el('th',null,'Status'),el('th',null,'Kunci'),el('th',null,'Catatan')));p.issues.forEach(i=>t.appendChild(el('tr',null,el('td',null,i.row),el('td',{class:i.status==='error'?'bad':(i.status==='held'?'warn':'')},i.status),el('td',null,i.key),el('td',null,i.msg))));
   card.appendChild(el('div',{class:'scroll'},t));if(p.issues_truncated)card.appendChild(el('div',{class:'note'},'Daftar dipotong 300 baris pertama.'));
   card.appendChild(el('button',{onclick:()=>download('pratinjau-'+S.kind+'.csv',toCsv([['baris','status','kunci','catatan']].concat(p.issues.map(i=>[i.row,i.status,i.key,i.msg]))))},'Unduh daftar ini (CSV)'));}
  const conf=el('input',{type:'text',placeholder:'Ketik IMPOR',autocomplete:'off'}),ck=el('input',{type:'checkbox'}),go=el('button',{class:'pri',disabled:true,onclick:runImport},'Cadangkan lalu impor');
  const upd=()=>{go.disabled=!(ck.checked&&conf.value.trim()==='IMPOR'&&p.importable>0&&!S.busy);};ck.addEventListener('change',upd);conf.addEventListener('input',upd);
  card.appendChild(el('div',{class:'card gold'},el('label',{class:'check'},ck,'Saya sudah memeriksa pratinjau dan rekonsiliasi di atas'),el('label',null,'Ketik IMPOR untuk menyetujui',conf),el('div',{class:'note',style:'margin:8px 0'},'Backup otomatis dibuat sebagai tab tersembunyi di spreadsheet sebelum data ditulis. File sumber Anda tidak diubah.'),go));return card;}
 function viewReport(){const r=S.report;if(!r)return null;const c=el('div',{class:'card'},el('h3',null,'Laporan hasil impor'));
  c.appendChild(el('div',{class:'kpis'},kpi('Dibuat',r.counts.created,'ok'),kpi('Duplikat',r.counts.duplicate),kpi('Error',r.counts.error),kpi('Ditahan',r.counts.held),kpi('Rekonsiliasi',r.recon.ok?'Cocok':'TIDAK cocok',r.recon.ok?'ok':'bad')));
  const t=el('table',null,el('tr',null,el('th',null,'Pemeriksaan'),el('th',null,'Diharapkan'),el('th',null,'Aktual')));r.recon.checks.forEach(x=>t.appendChild(el('tr',null,el('td',null,x.label),el('td',null,x.expected),el('td',{class:x.ok?'ok':'bad'},x.actual))));c.appendChild(t);
  c.appendChild(el('div',{class:'note',style:'margin:8px 0'},'Backup: '+r.batch.backup_tabs+'. Batch '+r.batch.batch_id+'.'));
  c.appendChild(el('button',{onclick:()=>download('laporan-impor-'+r.batch.batch_id+'.csv',toCsv([['baris','status','kunci','catatan']].concat(r.not_imported.map(x=>[x.row,x.status,x.key,x.message]))))},'Unduh baris yang tidak diimpor (CSV)'));return c;}
 function viewHistory(){const c=el('div',{class:'card'},el('h3',null,'Riwayat impor'));if(!S.history){c.appendChild(el('button',{onclick:loadHistory},'Tampilkan riwayat'));return c;}
  if(!S.history.length)c.appendChild(el('div',{class:'note'},'Belum ada impor.'));
  S.history.forEach(b=>c.appendChild(el('div',{style:'padding:8px 0;border-top:1px solid var(--line)'},el('b',null,b.kind+' · '+b.filename),' ',el('span',{class:'pill'},b.status),el('div',{class:'note'},b.created_at+' · dibuat '+b.created_count+', duplikat '+b.duplicate_count+', error '+b.error_count+', ditahan '+b.held_count),
   (b.status==='committed'||b.status==='failed'||b.status==='committing')?el('button',{onclick:()=>rollback(b.batch_id)},'Batalkan batch'):null)));return c;}
 function draw(){host.textContent='';const root_=el('div',{class:'ai-imp'});host.appendChild(root_);
  root_.appendChild(el('h2',null,'Impor Data Historis'));root_.appendChild(el('div',{class:'note'},'Unggah Excel/CSV lama Anda. File dibaca di perangkat ini dan tidak diubah. Urutan yang disarankan: Pelanggan → Produk → Invoice → Pembayaran → Pengeluaran.'));
  if(S.err)root_.appendChild(el('div',{class:'card bad'},S.err));if(S.busy)root_.appendChild(el('div',{class:'card'},S.busy,el('div',{class:'bar',style:'margin-top:8px'},el('i',{style:'width:60%'}))));
  const c1=el('div',{class:'card'},el('h3',null,'1. Jenis data & file'));
  c1.appendChild(el('div',{class:'row'},el('label',null,'Jenis data',sel(KINDS,S.kind,v=>{S.kind=v;S.fields=S.meta?S.meta.fields[v]:null;S.preview=null;S.report=null;if(S.table){S.mapping=suggest(S.fields,S.table.headers);}draw();})),
   el('label',null,'File (.csv, .xlsx)',el('input',{type:'file',accept:'.csv,.xlsx,.xls',onchange:e=>e.target.files[0]&&onFile(e.target.files[0])}))));
  if(S.book&&S.book.sheets.length>1)c1.appendChild(el('label',null,'Sheet di dalam file',sel(S.book.sheets.map(x=>[x,x]),S.sheet,v=>{useSheet(v);draw();})));
  if(S.table)c1.appendChild(el('div',{class:'note'},S.table.rows.length+' baris data, '+S.table.headers.length+' kolom.'));root_.appendChild(c1);
  if(S.table&&S.fields){const c2=el('div',{class:'card'},el('h3',null,'2. Petakan kolom'));const none=[['','(tidak dipakai)']].concat(S.table.headers.map(h=>[h,h]));
   S.fields.forEach(f=>c2.appendChild(el('label',{style:'margin-bottom:8px'},f[1]+(f[2]?' *':''),sel(none,S.mapping[f[0]]||'',v=>{if(v)S.mapping[f[0]]=v;else delete S.mapping[f[0]];S.preview=null;}))));
   const o=S.options,c3=el('div',{class:'row'},el('label',null,'Format tanggal lokal',sel([['dmy','hari/bulan/tahun'],['mdy','bulan/hari/tahun']],o.date_order,v=>{o.date_order=v;S.preview=null;})));
   if(S.kind==='invoices'){c3.appendChild(el('label',null,'Invoice dinyatakan lunas tanpa rincian bayar',sel([['none','Biarkan Unpaid (tidak membuat data pembayaran)'],['undated','Catat pembayaran TANPA tanggal']],o.paid_without_detail,v=>{o.paid_without_detail=v;S.preview=null;})));
    c3.appendChild(el('label',null,'Status pesanan untuk invoice lama',sel(S.meta.fulfillment.map(x=>[x,x]),o.fulfillment_default,v=>{o.fulfillment_default=v;S.preview=null;})));
    c3.appendChild(el('label',null,'Toleransi selisih total (Rp)',el('input',{type:'number',min:'0',value:String(o.tolerance),onchange:e=>{o.tolerance=Number(e.target.value)||0;S.preview=null;}})));
    c3.appendChild(el('label',{class:'check'},el('input',{type:'checkbox',checked:o.create_customers?'checked':false,onchange:e=>{o.create_customers=e.target.checked;S.preview=null;}}),'Buat pelanggan baru bila belum ada'));
    c3.appendChild(el('label',{class:'check'},el('input',{type:'checkbox',onchange:e=>{o.include_mismatch=e.target.checked;S.preview=null;}}),'Tetap impor invoice yang totalnya berselisih'));}
   c2.appendChild(c3);c2.appendChild(el('div',{style:'margin-top:10px'},el('button',{class:'pri',disabled:!!S.busy,onclick:runPreview},'3. Periksa (pratinjau)')));root_.appendChild(c2);}
  const pv=viewPreview();if(pv)root_.appendChild(pv);const rp_=viewReport();if(rp_)root_.appendChild(rp_);root_.appendChild(viewHistory());}
 ensureMeta().then(draw).catch(e=>{S.err=e.message||String(e);draw();});draw();}
root.AeneImport={mount:mount,core:core};
})(typeof window!=='undefined'?window:globalThis);
