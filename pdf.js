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
 [].concat(wrap(F,9,s.business_address||'',270-(tl-M)),[s.business_phone?('Telp/WA '+waShow(s.business_phone)):'',s.business_email||'']).forEach(l=>{if(l){tx(l,tl,ly,9,F,mute);ly-=12;}});
 let ry=y-8;tx('INVOICE',R,ry,22,B,ink,true);ry-=17;tx(iv.invoice_number,R,ry,11,B,rose,true);ry-=15;
 const st=STATUS[v.payment_status]||STATUS[iv.state]||'';if(st){tx(st,R,ry,9.5,B,v.payment_status==='Paid'?good:mute,true);ry-=13;}
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

A.pdf={build:build,waText:waText,waLink:waLink,waNumber:waNumber,safeName:safeName,clean:clean,money:money};
A.shareSheet=shareSheet;
});
