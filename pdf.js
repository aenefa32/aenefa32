/* AeneFlow - pdf.js (R2): PDF invoice untuk pelanggan + kirim lewat WhatsApp.
   PDF dibuat DI PERANGKAT dengan pdf-lib (file pdf-lib.min.js disajikan dari situs sendiri, tanpa CDN); tidak ada data yang dikirim ke server mana pun.
   PENTING: PDF hanya membaca field yang aman untuk pelanggan. Harga modal, laba, margin, dan catatan internal TIDAK PERNAH dibaca di sini. */
(window.AeneModules=window.AeneModules||[]).push(function(A){'use strict';
const h=A.h,ui=A.ui,S=A.S;
const DEF_WA='Halo {nama}, berikut invoice {nomor} dari {bisnis}. Total {total}, sisa tagihan {sisa}, jatuh tempo {jatuh_tempo}. Terima kasih';
const MON=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const money=n=>{n=Math.round(Number(n)||0);const neg=n<0;return (neg?'-':'')+'Rp '+String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');};
const dstr=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(s||''));return m?(+m[3])+' '+MON[+m[2]-1]+' '+m[1]:'';};
const SUB={'–':'-','—':'-','‘':"'",'’':"'",'“':'"','”':'"','•':'-','…':'...',' ':' '};
// Font standar PDF hanya mendukung Latin-1: ganti tanda baca umum, buang emoji/simbol, huruf non-Latin jadi '?'.
function clean(s){return String(s==null?'':s).replace(/\r/g,'').replace(/\t/g,' ').replace(/[–—‘’“”•… ]/g,c=>SUB[c]).replace(/[^\n\x20-\x7E\xA1-\xFF]/gu,c=>/\p{L}/u.test(c)?'?':'');}
function wrap(font,size,text,maxW){const out=[];clean(text).split('\n').forEach(par=>{let line='';par.split(' ').forEach(w=>{
  while(font.widthOfTextAtSize(w,size)>maxW){let k=w.length;while(k>1&&font.widthOfTextAtSize(w.slice(0,k),size)>maxW)k--;if(line){out.push(line);line='';}out.push(w.slice(0,k));w=w.slice(k);}
  const t=line?line+' '+w:w;if(line&&font.widthOfTextAtSize(t,size)>maxW){out.push(line);line=w;}else line=t;});out.push(line);});return out;}
function safeName(v){const iv=v.invoice;const s=(iv.invoice_number+'-'+(iv.cust_name||'')).replace(/[^A-Za-z0-9._-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');return 'Invoice-'+(s||'AeneFlow')+'.pdf';}
// Google Sheets bisa membuang angka 0 di depan nomor; untuk tampilan, nomor lokal yang diawali 8 dikembalikan menjadi 08…
function waShow(raw){const t=String(raw==null?'':raw).trim();return /^[\d\s-]+$/.test(t)&&/^8/.test(t)?'0'+t:t;}
function banks(s){try{const a=JSON.parse((s&&s.bank_accounts)||'[]');return Array.isArray(a)?a:[];}catch(e){return[];}}
const STATUS={Paid:'LUNAS','Partially Paid':'DIBAYAR SEBAGIAN',Unpaid:'BELUM DIBAYAR',Overdue:'JATUH TEMPO',Draft:'DRAFT',Cancelled:'DIBATALKAN'};

async function build(v,s){
 const P=window.PDFLib;if(!P)throw new Error('Modul PDF belum termuat. Muat ulang halaman lalu coba lagi.');
 s=s||{};const iv=v.invoice,t=v.totals,issued=iv.state==='Issued';
 const doc=await P.PDFDocument.create();doc.setTitle('Invoice '+clean(iv.invoice_number));doc.setProducer('AeneFlow');doc.setCreator('AeneFlow');
 const F=await doc.embedFont(P.StandardFonts.Helvetica),B=await doc.embedFont(P.StandardFonts.HelveticaBold);
 const W=595.28,H=841.89,M=48,R=W-M,CW=W-2*M;
 const rose=P.rgb(.545,.286,.353),ink=P.rgb(.2,.18,.18),mute=P.rgb(.46,.42,.42),ln=P.rgb(.9,.84,.85),blush=P.rgb(.98,.94,.94),good=P.rgb(.2,.5,.35);
 let page,y;
 const bar=()=>page.drawRectangle({x:0,y:H-12,width:W,height:12,color:rose});
 const mark=()=>{if(iv.state==='Draft'||iv.state==='Cancelled')page.drawText(iv.state==='Draft'?'DRAFT':'DIBATALKAN',{x:110,y:260,size:iv.state==='Draft'?110:70,font:B,color:rose,opacity:.09,rotate:P.degrees(35)});};
 const np=()=>{page=doc.addPage([W,H]);bar();mark();y=H-M-6;};
 const tx=(str,x,yy,size,font,color,right)=>{str=clean(str);if(!str)return;page.drawText(str,{x:right?x-font.widthOfTextAtSize(str,size):x,y:yy,size:size,font:font,color:color||ink});};
 const need=hh=>{if(y-hh<M+34){np();return true;}return false;};
 np();
 // kepala: usaha (kiri) & judul invoice (kanan)
 // logo usaha (opsional): gagal dibaca = diabaikan, PDF tetap jadi tanpa logo
 let logo=null,lw=0,lh=0;const lm=/^data:image\/(png|jpeg);base64,([A-Za-z0-9+\/]+={0,2})$/.exec(s.business_logo||'');
 if(lm){try{const bin=Uint8Array.from(atob(lm[2]),c=>c.charCodeAt(0));logo=lm[1]==='png'?await doc.embedPng(bin):await doc.embedJpg(bin);const sc=Math.min(64/logo.width,64/logo.height);lw=logo.width*sc;lh=logo.height*sc;}catch(e){logo=null;lw=lh=0;}}
 const tl=M+(logo?lw+14:0);if(logo)page.drawImage(logo,{x:M,y:y-lh,width:lw,height:lh});
 let ly=y-(logo?Math.max(8,lh/2-8):8);tx(s.business_name||'Invoice',tl,ly,20,B,rose);ly-=17;
 [].concat(wrap(F,9,s.business_address||'',270-(tl-M)),[s.business_phone?('Telp/WA '+waShow(s.business_phone)):'',s.business_email||'',s.business_instagram?('ig @'+String(s.business_instagram).replace(/^@+/,'')):'']).forEach(l=>{if(l){tx(l,tl,ly,9,F,mute);ly-=12;}});
 let ry=y-8;tx('INVOICE',R,ry,22,B,ink,true);ry-=17;tx(iv.invoice_number,R,ry,11,B,rose,true);ry-=15;
 const st=STATUS[A.payStatus(v.payment_status,v.totals.grand_total,v.balance)]||STATUS[iv.state]||'';if(st){tx(st,R,ry,9.5,B,v.payment_status==='Paid'?good:mute,true);ry-=13;}
 y=Math.min(ly,ry,logo?y-lh:1e9)-10;page.drawLine({start:{x:M,y:y},end:{x:R,y:y},thickness:.8,color:ln});y-=20;
 // pelanggan & tanggal
 const top=y;tx('DITAGIHKAN KEPADA',M,y,8,B,mute);y-=14;tx(iv.cust_name,M,y,11.5,B,ink);y-=14;
 if(iv.cust_org){tx(iv.cust_org,M,y,9.5,F,ink);y-=12;}
 wrap(F,9,iv.cust_address||'',250).forEach(l=>{if(l){tx(l,M,y,9,F,mute);y-=12;}});
 if(iv.cust_whatsapp){tx('WA '+waShow(iv.cust_whatsapp),M,y,9,F,mute);y-=12;}
 let dy=top;tx('Tanggal terbit',R-110,dy,8.5,F,mute,true);tx(dstr(iv.issue_date),R,dy,9.5,B,ink,true);dy-=15;tx('Jatuh tempo',R-110,dy,8.5,F,mute,true);tx(dstr(iv.due_date),R,dy,9.5,B,ink,true);
 y=Math.min(y,dy)-16;
 // tabel item
 const cNo=M+8,cDesc=M+30,cQty=R-190,cPrice=R-92,cAmt=R-8,dW=cQty-cDesc-30;
 const head=()=>{page.drawRectangle({x:M,y:y-17,width:CW,height:22,color:blush});tx('NO',cNo,y-9,8,B,mute);tx('DESKRIPSI',cDesc,y-9,8,B,mute);tx('QTY',cQty,y-9,8,B,mute,true);tx('HARGA',cPrice,y-9,8,B,mute,true);tx('JUMLAH',cAmt,y-9,8,B,mute,true);y-=28;};
 head();
 v.items.forEach((i,k)=>{const nm=wrap(B,9.5,i.name,dW),ds=i.description?wrap(F,8.5,i.description,dW):[],hh=nm.length*12+ds.length*11+10;
  if(need(hh+8))head();
  let yy=y;tx(String(k+1),cNo,yy,9,F,mute);nm.forEach(l=>{tx(l,cDesc,yy,9.5,B,ink);yy-=12;});ds.forEach(l=>{tx(l,cDesc,yy,8.5,F,mute);yy-=11;});
  tx(String(i.qty)+' '+(i.unit||''),cQty+30,y,9,F,ink,true);tx(money(i.unit_price),cPrice,y,9,F,ink,true);tx(money(Math.round(i.qty*i.unit_price)),cAmt,y,9.5,B,ink,true);
  y-=hh;page.drawLine({start:{x:M,y:y+4},end:{x:R,y:y+4},thickness:.4,color:ln});y-=6;});
 // total
 const rows=[['Subtotal',money(t.subtotal)]];
 if(t.discount)rows.push(['Diskon'+(iv.discount_type==='percent'?' '+iv.discount_value+'%':''),'- '+money(t.discount)]);
 if(t.tax)rows.push(['PPN '+iv.tax_rate+'%',money(t.tax)]);
 if(Number(iv.shipping_fee))rows.push(['Ongkir',money(iv.shipping_fee)]);
 A.extrasOf(iv).forEach(l=>{const t=Math.round(l.qty*l.unit_price);if(t)rows.push([clean(l.name)+(l.qty!==1?' ('+l.qty+' x '+money(l.unit_price)+')':''),money(t)]);});
 need(rows.length*16+70);y-=6;
 rows.forEach(r=>{tx(r[0],R-130,y,9.5,F,mute,true);tx(r[1],R,y,9.5,F,ink,true);y-=16;});
 y-=12;page.drawRectangle({x:R-250,y:y-6,width:250,height:26,color:blush});tx('TOTAL',R-130,y+2,10,B,rose,true);tx(money(t.grand_total),R-8,y+2,12.5,B,rose,true);y-=28;
 if(issued){tx('Dibayar',R-130,y,9.5,F,mute,true);tx(money(v.paid),R,y,9.5,F,ink,true);y-=16;tx('Sisa tagihan',R-130,y,10,B,ink,true);tx(money(v.balance),R,y,11,B,v.balance>0?rose:good,true);y-=22;}
 // riwayat pembayaran (hanya yang valid)
 const pays=(v.payments||[]).filter(p=>p.status==='valid').sort((a,b)=>String(a.payment_date).localeCompare(String(b.payment_date)));
 if(issued&&pays.length){need(30+pays.length*13);tx('RIWAYAT PEMBAYARAN',M,y,8,B,mute);y-=14;pays.forEach(p=>{need(14);tx(dstr(p.payment_date)+'  -  '+p.payment_type+'  -  '+p.method,M,y,9,F,ink);tx(money(p.amount),R,y,9,F,ink,true);y-=13;});y-=8;}
 // rekening
 const bk=banks(s);
 if(bk.length&&iv.state!=='Cancelled'&&!(issued&&v.balance<=0)){need(30+bk.length*13);tx('PEMBAYARAN DAPAT DITRANSFER KE',M,y,8,B,mute);y-=14;bk.forEach(b=>{need(14);tx(b.bank+'  '+b.number+'  a.n. '+b.holder,M,y,9.5,B,ink);y-=14;});y-=6;}
 // catatan & syarat
 const para=(label,txt)=>{if(!String(txt||'').trim())return;const ls=wrap(F,8.5,txt,CW);need(22);tx(label,M,y,8,B,mute);y-=13;ls.forEach(l=>{need(12);tx(l,M,y,8.5,F,ink);y-=11;});y-=8;};
 para('CATATAN',iv.notes);para('SYARAT & KETENTUAN',iv.terms);
 // footer tiap halaman
 const pages=doc.getPages();pages.forEach((pg,k)=>{const f='Terima kasih atas kepercayaan Anda.',w=F.widthOfTextAtSize(f,8.5);pg.drawText(f,{x:(W-w)/2,y:26,size:8.5,font:F,color:mute});
  const pn=(k+1)+'/'+pages.length;pg.drawText(pn,{x:R-F.widthOfTextAtSize(pn,8),y:26,size:8,font:F,color:mute});});
 return doc.save();}

// ---- WhatsApp ----
function waNumber(raw){let d=String(raw||'').replace(/\D/g,'');if(!d)return'';if(d.indexOf('00')===0)d=d.slice(2);if(d.indexOf('62')===0)return d;if(d.charAt(0)==='0')return '62'+d.slice(1);if(d.charAt(0)==='8')return '62'+d;return d;}
function waText(v,s){const iv=v.invoice,t=v.totals,tpl=(s&&s.wa_template)||A.waDefault||DEF_WA,sisa=iv.state==='Issued'?v.balance:t.grand_total;
 const map={nama:iv.cust_name,nomor:iv.invoice_number,bisnis:(s&&s.business_name)||'',total:money(t.grand_total),sisa:money(sisa),jatuh_tempo:dstr(iv.due_date)};
 return String(tpl).replace(/\{(nama|nomor|bisnis|total|sisa|jatuh_tempo)\}/g,(m,k)=>map[k]);}
function waLink(v,s){const n=waNumber(v.invoice.cust_whatsapp);return n?'https://wa.me/'+n+'?text='+encodeURIComponent(waText(v,s)):'';}

// ---- lembar "PDF & WhatsApp" ----
function shareSheet(v){const iv=v.invoice;let url='';
 if(iv.state==='Cancelled'){A.toast('Invoice dibatalkan tidak bisa dibagikan.');return;}
 ui.sheet('PDF & WhatsApp',(b,close)=>{
  let msg='';const status=h('div',{class:'sub',id:'sh-status',role:'status'},'Menyiapkan PDF…'),box=h('div'),msgBox=h('div',{class:'card pre',id:'sh-msg'});
  b.appendChild(status);b.appendChild(box);
  b.appendChild(h('div',{class:'sub',style:'margin-top:12px'},'Pesan untuk pelanggan'));b.appendChild(msgBox);
  if(iv.state==='Draft')b.appendChild(h('div',{class:'banner'},'Invoice masih Draft. PDF diberi tanda DRAFT. Terbitkan dulu sebelum dikirim ke pelanggan.'));
  // Ambil pengaturan TERBARU dari server tiap PDF dibuat (rekening/syarat bisa diubah dari perangkat lain); bila gagal, pakai salinan terakhir.
  A.api('bootstrap').then(r=>(r&&r.settings?(S.boot.settings=r.settings):S.boot.settings)||{},()=>S.boot.settings||{}).then(s=>{msg=waText(v,s);msgBox.textContent=msg;return build(v,s).then(bytes=>{
   const name=safeName(v),blob=new Blob([bytes],{type:'application/pdf'});url=URL.createObjectURL(blob);
   let file=null;try{file=new File([blob],name,{type:'application/pdf'});}catch(e){}
   status.textContent='PDF siap: '+name+' ('+Math.max(1,Math.round(bytes.length/1024))+' KB)';
   const canShare=!!(file&&navigator.canShare&&navigator.share&&navigator.canShare({files:[file]}));
   const row=h('div',{class:'btnrow wrapb'});
   if(canShare)row.appendChild(h('button',{class:'btn pri',type:'button',id:'sh-share',onclick:async()=>{try{await navigator.share({files:[file],title:name,text:msg});}catch(e){if(e&&e.name!=='AbortError')A.toast('Gagal membuka menu bagikan. Coba Unduh PDF.');}}},'Bagikan PDF'));
   row.appendChild(h('a',{class:'btn'+(canShare?'':' pri'),id:'sh-dl',href:url,download:name},'Unduh PDF'));
   box.appendChild(row);
   const link=waLink(v,s),r2=h('div',{class:'btnrow wrapb'});
   if(link)r2.appendChild(h('a',{class:'btn',id:'sh-wa',href:link,target:'_blank',rel:'noopener'},'Buka WhatsApp'));
   r2.appendChild(h('button',{class:'btn',type:'button',id:'sh-copy',onclick:async()=>{try{await navigator.clipboard.writeText(msg);A.toast('Pesan disalin');}catch(e){A.toast('Tidak bisa menyalin. Tekan lama pesan lalu salin.');}}},'Salin pesan'));
   box.appendChild(r2);
   if(!link)box.appendChild(h('div',{class:'sub'},'Nomor WhatsApp pelanggan belum diisi. Isi dulu di data pelanggan, atau kirim lewat Bagikan PDF.'));
   box.appendChild(h('div',{class:'sub',style:'margin-top:8px'},canShare?'Bagikan PDF lalu pilih WhatsApp. Pesan di bawah bisa dikirim terpisah lewat Buka WhatsApp (langsung ke nomor pelanggan).':'Perangkat ini tidak mendukung berbagi file langsung. Unduh PDF, lalu lampirkan di WhatsApp.'));
  });}).catch(e=>{status.textContent='';box.appendChild(h('div',{class:'banner',role:'alert'},'Gagal membuat PDF: '+(e&&e.message||e)));});
 },()=>{if(url)try{URL.revokeObjectURL(url);}catch(e){}});}


// ---- Surat Pesanan untuk tim produksi: gambar JPEG lebar A4 (2480 px), TANPA harga/diskon/pajak/pembayaran/modal/laba ----
// Hanya membaca: nama/deskripsi/qty/satuan item, biaya tambahan (nama+qty saja), catatan invoice, alamat penerima.
async function suratJpeg(v,s,opt){
 s=s||{};const iv=v.invoice,toJakarta=opt.dest==='jakarta',PW=2480,W=595.28,H=841.89,K=PW/W,M=48,R=W-M,CW=W-2*M;
 const FONT='Helvetica, Arial, sans-serif',rose='#8b495a',ink='#2e2929',mute='#756b6b',ln='#e6d5d9',blush='#faf2f4';
 const fnt=(b,sz)=>(b?'bold ':'')+sz+'px '+FONT;
 let logo=null;if(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/]+={0,2}$/.test(s.business_logo||'')){try{logo=await loadImg(s.business_logo);}catch(e){logo=null;}}
 const items=v.items.map(i=>({name:String(i.name||''),desc:i.description||'',qty:(String(i.qty)+' '+(i.unit||'')).trim()}));
 A.extrasOf(iv).forEach(l=>{if(l&&l.name&&Number(l.unit_price)>=0)items.push({name:String(l.name),desc:'',qty:String(l.qty)+' pcs'});});
 const ship=toJakarta?'Dikirim ke alamat '+(s.business_name||'kami')+' di Jakarta':'Dikirim langsung ke alamat pelanggan';
 const draw=(c,dry)=>{
  const tx=(str,x,y,sz,b,col,right)=>{str=String(str==null?'':str);if(dry||!str)return;c.font=fnt(b,sz);c.fillStyle=col||ink;c.textAlign=right?'right':'left';c.textBaseline='alphabetic';c.fillText(str,x,y);};
  const rect=(x,y,w,h,fill,stroke)=>{if(dry)return;if(fill){c.fillStyle=fill;c.fillRect(x,y,w,h);}if(stroke){c.strokeStyle=stroke;c.lineWidth=.8;c.strokeRect(x,y,w,h);}};
  const line=(x1,y,x2,col,w)=>{if(dry)return;c.strokeStyle=col;c.lineWidth=w||.5;c.beginPath();c.moveTo(x1,y);c.lineTo(x2,y);c.stroke();};
  const wrapC=(text,sz,b,maxW)=>{c.font=fnt(b,sz);const out=[];String(text||'').replace(/\r/g,'').split('\n').forEach(par=>{let ln_='';par.split(' ').forEach(w=>{
    while(c.measureText(w).width>maxW){let k=w.length;while(k>1&&c.measureText(w.slice(0,k)).width>maxW)k--;if(ln_){out.push(ln_);ln_='';}out.push(w.slice(0,k));w=w.slice(k);}
    const t=ln_?ln_+' '+w:w;if(ln_&&c.measureText(t).width>maxW){out.push(ln_);ln_=w;}else ln_=t;});out.push(ln_);});return out;};
  rect(0,0,W,12,rose);
  let y=M-6;
  let lw=0,lh=0;if(logo){const sc=Math.min(64/logo.width,64/logo.height);lw=logo.width*sc;lh=logo.height*sc;if(!dry)c.drawImage(logo,M,y,lw,lh);}
  const tl=M+(logo?lw+14:0);let ly=y+(logo?Math.max(8,lh/2-8):8)+10;
  tx(s.business_name||'Surat Pesanan',tl,ly,18,true,rose);ly+=16;
  [].concat(wrapC(s.business_address||'',9,false,270-(tl-M)),[s.business_phone?('Telp/WA '+waShow(s.business_phone)):'',s.business_instagram?('ig @'+String(s.business_instagram).replace(/^@+/,'')):'']).forEach(l=>{if(l){tx(l,tl,ly,9,false,mute);ly+=12;}});
  let ry=y+18;tx('SURAT PESANAN',R,ry,20,true,ink,true);ry+=16;tx('No. Ref '+iv.invoice_number,R,ry,10,true,rose,true);ry+=14;
  y=Math.max(ly,ry,logo?y+lh:0)+4;line(M,y,R,ln,.8);y+=22;
  // kotak: tanggal pesanan & kirim ke
  const L=[];
  if(toJakarta){L.push([s.business_name||'',true,11.5]);wrapC(s.business_address||'',9,false,250).forEach(l=>{if(l)L.push([l,false,9]);});if(s.business_phone)L.push(['WA '+waShow(s.business_phone),false,9]);}
  else{L.push([iv.cust_name||'',true,11.5]);if(iv.cust_org)L.push([iv.cust_org,false,9.5]);wrapC(iv.cust_address||'',9,false,250).forEach(l=>{if(l)L.push([l,false,9]);});if(iv.cust_whatsapp)L.push(['WA '+waShow(iv.cust_whatsapp),false,9]);}
  const bh=Math.max(52,28+L.length*12+6),bx=M+170,bw=R-bx;
  rect(M,y,160,bh,null,ln);rect(bx,y,bw,bh,null,ln);
  tx('TANGGAL PESANAN',M+10,y+15,8,true,mute);tx(dstr(iv.issue_date),M+10,y+31,11.5,true,ink);
  tx('KIRIM KE',bx+10,y+15,8,true,mute);let by=y+31;L.forEach((l,k)=>{tx(l[0],bx+10,by,l[2],l[1],(k===0||l[1])?ink:mute);by+=(k===0?14:12);});
  y+=bh+22;
  // tabel item (tanpa harga)
  const cNo=M+8,cDesc=M+34,cQty=R-8,dW=cQty-cDesc-90;
  rect(M,y,CW,22,blush);tx('NO',cNo,y+14,8,true,mute);tx('ITEM & SPESIFIKASI',cDesc,y+14,8,true,mute);tx('JUMLAH',cQty,y+14,8,true,mute,true);y+=30;
  items.forEach((i,k)=>{const nm=wrapC(i.name,10,true,dW),ds=i.desc?wrapC(i.desc,9,false,dW):[],hh=nm.length*13+ds.length*11+10;
   let yy=y+10;tx(String(k+1),cNo,yy,9,false,mute);nm.forEach(l=>{tx(l,cDesc,yy,10,true,ink);yy+=13;});ds.forEach(l=>{tx(l,cDesc,yy,9,false,mute);yy+=11;});
   tx(i.qty,cQty,y+10,10,true,ink,true);y+=hh;line(M,y+2,R,ln,.5);y+=6;});
  y+=10;
  if(String(iv.notes||'').trim()){tx('CATATAN PRODUKSI',M,y+8,8,true,mute);y+=22;wrapC(iv.notes,9.5,false,CW).forEach(l=>{tx(l,M,y,9.5,false,ink);y+=12;});y+=8;}
  y+=8;
  // deadline & pengiriman
  const sl=wrapC(ship,10.5,true,CW-210-14),bh2=44+sl.length*13;
  rect(M,y,CW,bh2,blush);rect(M,y,4,bh2,rose);
  tx('DEADLINE PRODUKSI',M+16,y+15,8,true,mute);tx(dstr(opt.deadline),M+16,y+33,14,true,ink);
  tx('PENGIRIMAN',M+210,y+15,8,true,mute);let sy=y+31;sl.forEach(l=>{tx(l,M+210,sy,10.5,true,ink);sy+=13;});
  y+=bh2;return y;};
 const m=document.createElement('canvas').getContext('2d');const endY=draw(m,true),HT=Math.max(300,Math.ceil(endY+M*.8));
 const cv=document.createElement('canvas');cv.width=PW;cv.height=Math.round(HT*K);const c=cv.getContext('2d');c.scale(K,K);c.fillStyle='#fff';c.fillRect(0,0,W,HT);draw(c,false);
 const blob=await new Promise((res,rej)=>cv.toBlob(b=>b?res(b):rej(new Error('Gagal membuat gambar')),'image/jpeg',.92));
 return{blob:blob,width:cv.width,height:cv.height};}
function suratName(v){return safeName(v).replace(/^Invoice-/,'SuratPesanan-').replace(/\.pdf$/,'.jpg');}
function suratSheet(v){const iv=v.invoice;let url='';
 if(iv.state==='Cancelled'){A.toast('Invoice dibatalkan tidak bisa dibuatkan surat pesanan.');return;}
 ui.sheet('Surat Pesanan untuk Tim',(b,close)=>{
  const dl=h('input',{type:'date',value:(v.order&&v.order.deadline_date)||'','aria-label':'Deadline produksi',id:'sp-dl'});
  const dest=ui.select([['customer','Langsung ke alamat pelanggan'],['jakarta','Ke alamat usaha di Jakarta']],'customer',{id:'sp-dest','aria-label':'Pengiriman hasil produksi'});
  const err=h('div'),box=h('div');
  b.appendChild(h('div',{class:'sub'},iv.invoice_number+' · '+(iv.cust_name||'')));
  b.appendChild(ui.field('Deadline produksi',dl));b.appendChild(ui.field('Pengiriman hasil produksi',dest,'Menentukan alamat di kotak "Kirim ke" pada gambar.'));
  b.appendChild(err);
  b.appendChild(h('button',{class:'btn pri',type:'button',id:'sp-go',onclick:async ev=>{
   err.textContent='';box.textContent='';if(!dl.value){ui.banner(err,'Isi deadline produksi dulu.');return;}
   const btn=ev.currentTarget;btn.disabled=true;btn.textContent='Membuat gambar…';
   try{
    const s=await A.api('bootstrap').then(r=>(r&&r.settings?(S.boot.settings=r.settings):S.boot.settings)||{},()=>S.boot.settings||{});
    const r=await suratJpeg(v,s,{dest:dest.value,deadline:dl.value});
    if(url){try{URL.revokeObjectURL(url);}catch(e){}}
    const name=suratName(v);url=URL.createObjectURL(r.blob);
    let file=null;try{file=new File([r.blob],name,{type:'image/jpeg'});}catch(e){}
    const canShare=!!(file&&navigator.canShare&&navigator.share&&navigator.canShare({files:[file]}));
    box.appendChild(h('div',{class:'sub',id:'sp-status',role:'status'},'Gambar siap: '+name+' ('+Math.max(1,Math.round(r.blob.size/1024))+' KB)'));
    box.appendChild(h('img',{id:'sp-img',src:url,alt:'Pratinjau surat pesanan '+(iv.cust_name||''),style:'width:100%;border:1px solid var(--line);border-radius:10px;margin:6px 0;background:#fff'}));
    const row=h('div',{class:'btnrow wrapb'});
    if(canShare)row.appendChild(h('button',{class:'btn pri',type:'button',id:'sp-share',onclick:async()=>{try{await navigator.share({files:[file],title:name});}catch(e){if(e&&e.name!=='AbortError')A.toast('Gagal membuka menu bagikan. Coba Unduh JPEG.');}}},'Bagikan ke WhatsApp'));
    row.appendChild(h('a',{class:'btn'+(canShare?'':' pri'),id:'sp-dl-a',href:url,download:name},'Unduh JPEG'));
    box.appendChild(row);
    if(!canShare)box.appendChild(h('div',{class:'sub',style:'margin-top:8px'},'Perangkat ini tidak mendukung berbagi file langsung. Unduh JPEG, lalu lampirkan di WhatsApp tim.'));
   }catch(e){ui.banner(err,'Gagal membuat gambar: '+(e&&e.message||e));}
   btn.disabled=false;btn.textContent='Buat gambar';}},'Buat gambar'));
  b.appendChild(box);
 },()=>{if(url)try{URL.revokeObjectURL(url);}catch(e){}});}

// ---- Surat Jalan: gambar JPEG ukuran 1/2 A4 (A5 landscape, 2480x1748 px = 300 dpi) untuk dicetak & ditempel di paket. TANPA harga. Selalu ke alamat pelanggan. ----
function jalanModel(v,s){s=s||{};const iv=v.invoice;
 const items=v.items.map(i=>({name:String(i.name||''),qty:(String(i.qty)+' '+(i.unit||'')).trim()}));
 A.extrasOf(iv).forEach(l=>{if(l&&l.name)items.push({name:String(l.name),qty:String(l.qty)+' pcs'});});
 return{to:{name:iv.cust_name||'',org:iv.cust_org||'',address:iv.cust_address||'',phone:iv.cust_whatsapp?('Telp/WA '+waShow(iv.cust_whatsapp)):''},items:items,
  from:{name:s.business_name||'',phone:s.business_phone?('Telp/WA '+waShow(s.business_phone)):'',ig:s.business_instagram?('ig @'+String(s.business_instagram).replace(/^@+/,'')):''}};}
function loadImg(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(new Error('logo'));im.src=src;});}
async function jalanJpeg(v,s){
 s=s||{};const m=jalanModel(v,s),PW=2480,W=595.28,H=420.94,K=PW/W,M=34,R=W-M;
 const cv=document.createElement('canvas');cv.width=PW;cv.height=Math.round(H*K);const c=cv.getContext('2d');c.scale(K,K);
 const FONT='Helvetica, Arial, sans-serif',rose='#8b495a',ink='#262121',mute='#756b6b',ln='#d9c2c7',blush='#fbf4f6';
 const fnt=(b,sz)=>(b?'bold ':'')+sz+'px '+FONT;
 c.fillStyle='#fff';c.fillRect(0,0,W,H);c.fillStyle=rose;c.fillRect(0,0,W,8);
 const tx=(str,x,y,sz,b,col,right)=>{str=String(str==null?'':str);if(!str)return;c.font=fnt(b,sz);c.fillStyle=col||ink;c.textAlign=right?'right':'left';c.textBaseline='alphabetic';c.fillText(str,x,y);};
 const wrapC=(text,sz,b,maxW)=>{c.font=fnt(b,sz);const out=[];String(text||'').replace(/\r/g,'').split('\n').forEach(par=>{let line='';par.split(' ').forEach(w=>{
   while(c.measureText(w).width>maxW){let k=w.length;while(k>1&&c.measureText(w.slice(0,k)).width>maxW)k--;if(line){out.push(line);line='';}out.push(w.slice(0,k));w=w.slice(k);}
   const t=line?line+' '+w:w;if(line&&c.measureText(t).width>maxW){out.push(line);line=w;}else line=t;});out.push(line);});return out;};
 const sendY=H-100,floor=sendY-12,top=30,BW=195,BX=R-BW;
 // kotak pesanan (kanan atas)
 const two=nm=>nm.length>2?[nm[0],nm[1].replace(/.{0,3}$/,'')+'...']:nm;
 const prow=[];let used=38,n=0;
 for(const i of m.items){const nm=two(wrapC(i.name,12,false,BW-24-64)),hh=nm.length*15+5,left=m.items.length-n-1;
  if(top+used+hh+(left>0?18:0)>floor&&n>0)break;prow.push({nm:nm,qty:i.qty});used+=hh;n++;}
 const more=m.items.length-prow.length,bh=used+(more>0?18:0)+2;
 c.fillStyle=blush;c.fillRect(BX,top,BW,bh);c.strokeStyle=ln;c.lineWidth=.8;c.strokeRect(BX,top,BW,bh);
 tx('PESANAN',BX+12,top+19,10,true,mute);let by=top+39;
 prow.forEach(r=>{r.nm.forEach((l,k)=>{tx(l,BX+12,by,12,false,ink);if(k===0)tx(r.qty,BX+BW-12,by,12,true,ink,true);by+=15;});by+=5;});
 if(more>0)tx('+ '+more+' item lain (lihat Surat Pesanan)',BX+12,by+3,9.5,false,mute);
 // penerima (kiri) - huruf besar agar terbaca kurir
 const LW=BX-M-16;let y=top+14;
 tx('Kepada Yth.',M,y,18,true,rose);
 {let fs=44,nl=[];for(const z of [44,38,33,28,24,20]){fs=z;nl=wrapC(m.to.name,fs,true,LW);if(nl.length<=2)break;}
  y+=12+fs;nl.slice(0,3).forEach((l,k)=>{tx(l,M,y,fs,true,ink);if(k<nl.length-1&&k<2)y+=fs*1.12;});y+=Math.max(8,fs*.28);}
 if(m.to.org){y+=14;tx(m.to.org,M,y,18,true,ink);y+=6;}
 {y+=22;const avail=floor-y-(m.to.phone?46:4);let fs=24,al=[];for(const z of [24,22,20,18,16.5,15,13.5,12,11]){fs=z;al=wrapC(m.to.address,fs,false,LW);if(al.length*fs*1.28<=avail)break;}
  al.forEach(l=>{if(l){tx(l,M,y,fs,false,ink);y+=fs*1.28;}});}
 if(m.to.phone){y+=14;tx(m.to.phone,M,y,30,true,ink);}
 // pengirim (bawah)
 c.strokeStyle=ln;c.lineWidth=.8;c.beginPath();c.moveTo(M,sendY);c.lineTo(R,sendY);c.stroke();
 let lw=0;const lm=/^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/]+={0,2}$/.exec(s.business_logo||'');
 const cy=sendY+(H-sendY)/2+2;
 if(lm){try{const im=await loadImg(s.business_logo),sc=Math.min(62/im.width,62/im.height);lw=im.width*sc;c.drawImage(im,M,cy-im.height*sc/2,lw,im.height*sc);}catch(e){lw=0;}}
 const px=M+(lw?lw+16:0);
 tx('Pengirim',px,cy-21,11,true,mute);tx(m.from.name,px,cy+4,23,true,rose);
 tx([m.from.phone,m.from.ig].filter(Boolean).join('    |    '),px,cy+27,15,false,ink);
 const blob=await new Promise((res,rej)=>cv.toBlob(b=>b?res(b):rej(new Error('Gagal membuat gambar')),'image/jpeg',.92));
 return{blob:blob,width:cv.width,height:cv.height,model:m};}
function jalanName(v){return safeName(v).replace(/^Invoice-/,'SuratJalan-').replace(/\.pdf$/,'.jpg');}
function jalanSheet(v){const iv=v.invoice;let url='';
 if(iv.state==='Cancelled'){A.toast('Invoice dibatalkan tidak bisa dibuatkan surat jalan.');return;}
 ui.sheet('Surat Jalan',(b,close)=>{
  const status=h('div',{class:'sub',id:'sj-status',role:'status'},'Menyiapkan gambar…'),box=h('div');
  b.appendChild(status);b.appendChild(box);
  A.api('bootstrap').then(r=>(r&&r.settings?(S.boot.settings=r.settings):S.boot.settings)||{},()=>S.boot.settings||{}).then(s=>jalanJpeg(v,s)).then(r=>{
   const name=jalanName(v);url=URL.createObjectURL(r.blob);
   let file=null;try{file=new File([r.blob],name,{type:'image/jpeg'});}catch(e){}
   status.textContent='Gambar siap: '+name+' ('+Math.max(1,Math.round(r.blob.size/1024))+' KB)';
   box.appendChild(h('img',{id:'sj-img',src:url,alt:'Pratinjau surat jalan '+(iv.cust_name||''),style:'width:100%;border:1px solid var(--line);border-radius:10px;margin:6px 0;background:#fff','data-w':String(r.width),'data-h':String(r.height)}));
   const canShare=!!(file&&navigator.canShare&&navigator.share&&navigator.canShare({files:[file]}));
   const row=h('div',{class:'btnrow wrapb'});
   if(canShare)row.appendChild(h('button',{class:'btn pri',type:'button',id:'sj-share',onclick:async()=>{try{await navigator.share({files:[file],title:name});}catch(e){if(e&&e.name!=='AbortError')A.toast('Gagal membuka menu bagikan. Coba Unduh JPEG.');}}},'Bagikan / Cetak'));
   row.appendChild(h('a',{class:'btn'+(canShare?'':' pri'),id:'sj-dl',href:url,download:name},'Unduh JPEG'));
   box.appendChild(row);
   box.appendChild(h('div',{class:'sub',style:'margin-top:8px'},'Ukuran separuh A4 (landscape). Cetak dari menu Bagikan, atau simpan ke Foto lalu cetak. Gunakan skala 100% / ukuran sebenarnya.'));
  }).catch(e=>{status.textContent='';box.appendChild(h('div',{class:'banner',role:'alert'},'Gagal membuat gambar: '+(e&&e.message||e)));});
 },()=>{if(url)try{URL.revokeObjectURL(url);}catch(e){}});}

A.pdf={build:build,jalanJpeg:jalanJpeg,jalanModel:jalanModel,suratJpeg:suratJpeg,waText:waText,waLink:waLink,waNumber:waNumber,safeName:safeName,clean:clean,money:money};
A.shareSheet=shareSheet;A.suratSheet=suratSheet;A.jalanSheet=jalanSheet;
});
