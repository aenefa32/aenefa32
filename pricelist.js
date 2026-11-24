/* AeneFlow - pricelist.js (Versi 18): pricelist otomatis dari katalog produk, per kategori. PDF (teks asli) dan gambar JPEG untuk WhatsApp.
   Hanya membaca nama, satuan, kategori, harga jual. Harga modal/laba TIDAK PERNAH dibaca di sini. Dibuat di perangkat, tidak ada data keluar. */
(window.AeneModules=window.AeneModules||[]).push(function(A){'use strict';
const h=A.h,ui=A.ui,S=A.S,PD=A.pdf;
const W=595.28,M=48,R=W-M,A4H=841.89,TALL=1190;
const MON=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const hex=c=>c;const COL={rose:'#8b495a',ink:'#2e2929',mute:'#756b6b',ln:'#e6d5d9',blush:'#faf2f4'};
function catOrder(prods){let l=[];try{l=JSON.parse((S.boot.settings||{}).product_categories||'[]');}catch(e){l=[];}if(!Array.isArray(l))l=[];const out=[],seen={};
 l.forEach(c=>{const n=String(c&&c.name||'').trim(),k=n.toLowerCase();if(n&&!seen[k]){seen[k]=1;out.push(n);}});
 prods.forEach(p=>{const n=String(p.category||'').trim(),k=n.toLowerCase();if(n&&!seen[k]){seen[k]=1;out.push(n);}});return out;}
function groups(prods,only){const act=prods.filter(p=>String(p.is_active)!=='false'&&p.is_active!==false&&String(p.name||'').trim());const by={},order=catOrder(act);
 act.forEach(p=>{const n=String(p.category||'').trim()||'Lainnya';(by[n.toLowerCase()]=by[n.toLowerCase()]||{name:n,items:[]}).items.push(p);});
 const res=[];order.concat(['Lainnya']).forEach(n=>{const g=by[n.toLowerCase()];if(g&&!res.includes(g)&&(!only||only.indexOf(g.name)>=0))res.push(g);});
 res.forEach(g=>g.items.sort((a,b)=>String(a.name).localeCompare(String(b.name),'id')));return res;}
const loadImg=u=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=u;});
// foto dipotong (cover) ke ukuran kartu; hasil: {src: JPEG data URL (untuk PDF), cv: kanvas (untuk gambar)}
async function cropPhoto(u,w,hh){const im=await loadImg(u),K=2.4,cw=Math.round(w*K),ch=Math.round(hh*K),c=document.createElement('canvas');c.width=cw;c.height=ch;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,cw,ch);
 const sc=Math.max(cw/im.width,ch/im.height),dw=im.width*sc,dh=im.height*sc;x.drawImage(im,(cw-dw)/2,(ch-dh)/2,dw,dh);return{src:c.toDataURL('image/jpeg',.85),cv:c};}
// ---- tata letak: daftar operasi gambar (koordinat pt, y ke bawah), dipakai oleh PDF dan gambar
async function layout(P,prods,opt,mode){
 const doc=await P.PDFDocument.create(),F=await doc.embedFont(P.StandardFonts.Helvetica),B=await doc.embedFont(P.StandardFonts.HelveticaBold),s=S.boot.settings||{},clean=PD.clean,money=PD.money;
 const PH=mode==='image'?TALL:A4H,ops=[];let page=0,y=0;
 const T=(str,x,yy,size,bold,color,right)=>{str=clean(str);if(str)ops.push({k:'t',p:page,s:str,x:right?x-(bold?B:F).widthOfTextAtSize(str,size):x,y:yy,z:size,b:bold,c:color});};
 const Rc=(x,yy,w,hh,color)=>ops.push({k:'r',p:page,x:x,y:yy,w:w,h:hh,c:color}),L=(x1,yy,x2,color,wd)=>ops.push({k:'l',p:page,x:x1,y:yy,x2:x2,c:color,w:wd||.5});
 const wrap=(f,sz,t,mw)=>PD.wrap(f,sz,t,mw);
 const newPage=first=>{page=first?0:page+1;y=M;if(!first){T(clean(s.business_name||'Pricelist')+'  -  '+(opt.title||'Pricelist'),M,y+8,9,true,COL.mute);L(M,y+16,R,COL.ln,.8);y+=30;}};
 const need=hh=>{if(y+hh>PH-M-26){newPage(false);return true;}return false;};
 newPage(true);
 // kepala: logo + nama usaha + info (kiri), PRICELIST (kanan)
 let logo=null,lw=0,lh=0;const lm=/^data:image\/(png|jpeg);base64,/.exec(s.business_logo||'');
 if(lm){try{const im=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=s.business_logo;});const sc=Math.min(60/im.width,60/im.height);lw=im.width*sc;lh=im.height*sc;logo=im;}catch(e){logo=null;}}
 const tl=M+(logo?lw+14:0),nm=clean(s.business_name||'Pricelist');let nz=20;while(nz>11&&B.widthOfTextAtSize(nm,nz)>R-tl-150)nz--;
 const waShow=r=>{const t=String(r==null?'':r).trim();return /^[\d\s-]+$/.test(t)&&/^8/.test(t)?'0'+t:t;};
 const info=[].concat(wrap(F,9,s.business_address||'',R-tl-160),[s.business_phone?('Telp/WA '+waShow(s.business_phone)):'',s.business_email||'',s.business_instagram?('ig @'+String(s.business_instagram).replace(/^@+/,'')):'']).filter(Boolean);
 const textH=nz+6+info.length*12,rowH=Math.max(logo?lh:0,textH),tTop=y+(rowH-textH)/2;
 if(logo)ops.push({k:'i',p:0,img:logo,src:s.business_logo,x:M,y:y+(rowH-lh)/2,w:lw,h:lh});
 let ly=tTop+nz*.85;T(nm,tl,ly,nz,true,COL.rose);T((opt.title||'Pricelist').toUpperCase(),R,ly,22,true,COL.ink,true);
 const d=new Date(),ds=d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear();T('Per '+ds,R,ly+16,9.5,true,COL.rose,true);
 ly+=17;info.forEach(l=>{T(l,tl,ly,9,false,COL.mute);ly+=12;});
 y+=rowH+10;L(M,y,R,COL.ln,.8);y+=16;
 const cName=M+8,cUnit=R-150,cPrice=R-8,nW=cUnit-cName-14;
 groups(prods,opt.only).forEach(g=>{
  if(opt.style==='card'){const C=3,GAP=10,cw=(R-M-GAP*(C-1))/C,phH=Math.round(cw*.7),tw=cw-14;
   need(30+phH+50);Rc(M,y,R-M,22,COL.blush);T(g.name.toUpperCase(),cName,y+15,9,true,COL.rose);T(g.items.length+' produk',R-8,y+15,8,false,COL.mute,true);y+=32;
   for(let i=0;i<g.items.length;i+=C){const row=g.items.slice(i,i+C),nls=row.map(p=>wrap(B,9,p.name,tw).slice(0,2)),rowH=phH+Math.max.apply(null,nls.map(a=>a.length))*11+30;
    if(need(rowH+8)){Rc(M,y,R-M,22,COL.blush);T(g.name.toUpperCase()+' (lanjutan)',cName,y+15,9,true,COL.rose);y+=32;}
    for(let j=0;j<row.length;j++){const p=row[j],x0=M+j*(cw+GAP);Rc(x0,y,cw,rowH,COL.ln);Rc(x0+.6,y+.6,cw-1.2,rowH-1.2,'#ffffff');
     const ph=(opt.photos||{})[p.product_id];if(ph)ops.push({k:'i',p:page,img:ph.cv,src:ph.src,x:x0+.6,y:y+.6,w:cw-1.2,h:phH});else{Rc(x0+.6,y+.6,cw-1.2,phH,COL.blush);T(String(p.name||'?').trim().charAt(0).toUpperCase(),x0+cw/2-7,y+phH/2+10,28,true,COL.ln);}
     nls[j].forEach((l,k)=>T(l,x0+7,y+phH+14+k*11,9,true,COL.ink));
     T(String(p.unit||'pcs'),x0+7,y+rowH-8,8,false,COL.mute);const pr=Number(p.sell_price);T(pr>0?money(pr):'Tanya harga',x0+cw-7,y+rowH-8,9.5,true,COL.rose,true);}
    y+=rowH+8;}
   y+=6;return;}
  const first=wrap(B,10,g.items[0].name,nW).length*12+12;need(30+first);
  Rc(M,y,R-M,22,COL.blush);T(g.name.toUpperCase(),cName,y+15,9,true,COL.rose);T(g.items.length+' produk',R-8,y+15,8,false,COL.mute,true);y+=28;
  g.items.forEach(p=>{const nl=wrap(B,10,p.name,nW),hh=nl.length*12+12;if(need(hh+6)){Rc(M,y,R-M,22,COL.blush);T(g.name.toUpperCase()+' (lanjutan)',cName,y+15,9,true,COL.rose);y+=28;}
   nl.forEach((l,i)=>T(l,cName,y+12+i*12,10,true,COL.ink));
   T(String(p.unit||'pcs'),cUnit,y+12,9,false,COL.mute);
   const pr=Number(p.sell_price);T(pr>0?money(pr):'Tanya harga',cPrice,y+12,10,true,COL.rose,true);
   y+=hh;L(M,y-3,R,COL.ln,.4);});
  y+=8;});
 if(!groups(prods,opt.only).length)T('Belum ada produk aktif.',M,y+12,10,false,COL.mute);
 need(40);y+=6;T('Harga dapat berubah sewaktu-waktu. Hubungi kami untuk pemesanan'+(s.business_phone?': WA '+waShow(s.business_phone):'.'),M,y+10,8.5,false,COL.mute);y+=16;
 const pages=page+1,endY=y;return{ops:ops,pages:pages,PH:PH,endY:endY,mode:mode};}
// ---- PDF (vektor, teks asli)
async function toPdf(P,prods,opt){const lay=await layout(P,prods,opt,'pdf'),doc=await P.PDFDocument.create();doc.setTitle(clean0(opt.title));doc.setProducer('AeneFlow');
 const F=await doc.embedFont(P.StandardFonts.Helvetica),B=await doc.embedFont(P.StandardFonts.HelveticaBold),pgs=[];for(let i=0;i<lay.pages;i++)pgs.push(doc.addPage([W,A4H]));
 const rgb=c=>{const n=parseInt(c.slice(1),16);return P.rgb((n>>16&255)/255,(n>>8&255)/255,(n&255)/255);};
 const imgs={};
 for(const o of lay.ops){const pg=pgs[o.p];
  if(o.k==='r')pg.drawRectangle({x:o.x,y:A4H-o.y-o.h,width:o.w,height:o.h,color:rgb(o.c)});
  else if(o.k==='l')pg.drawLine({start:{x:o.x,y:A4H-o.y},end:{x:o.x2,y:A4H-o.y},thickness:o.w,color:rgb(o.c)});
  else if(o.k==='t')pg.drawText(o.s,{x:o.x,y:A4H-o.y,size:o.z,font:o.b?B:F,color:rgb(o.c)});
  else if(o.k==='i'){try{const m=/^data:image\/(png|jpeg);base64,([A-Za-z0-9+\/]+={0,2})$/.exec(o.src);const bin=Uint8Array.from(atob(m[2]),c=>c.charCodeAt(0));const im=m[1]==='png'?await doc.embedPng(bin):await doc.embedJpg(bin);pg.drawImage(im,{x:o.x,y:A4H-o.y-o.h,width:o.w,height:o.h});}catch(e){}}}
 pgs.forEach((pg,i)=>{const t=(i+1)+'/'+pgs.length;pg.drawText(t,{x:R-F.widthOfTextAtSize(t,8),y:26,size:8,font:F,color:rgb(COL.mute)});});
 return doc.save();}
const clean0=t=>PD.clean(t||'Pricelist');
// ---- Gambar JPEG (tinggi 2x A4 per gambar; bila lebih banyak, beberapa gambar)
async function toImages(P,prods,opt){const lay=await layout(P,prods,opt,'image'),K=2,out=[];
 for(let i=0;i<lay.pages;i++){const last=i===lay.pages-1,ph=last?Math.min(lay.PH,Math.ceil(lay.endY+M)):lay.PH,cv=document.createElement('canvas');cv.width=Math.round(W*K);cv.height=Math.round(ph*K);const c=cv.getContext('2d');c.scale(K,K);c.fillStyle='#fff';c.fillRect(0,0,W,ph);
  for(const o of lay.ops){if(o.p!==i)continue;
   if(o.k==='r'){c.fillStyle=o.c;c.fillRect(o.x,o.y,o.w,o.h);}
   else if(o.k==='l'){c.strokeStyle=o.c;c.lineWidth=o.w;c.beginPath();c.moveTo(o.x,o.y);c.lineTo(o.x2,o.y);c.stroke();}
   else if(o.k==='t'){c.font=(o.b?'bold ':'')+o.z+'px Helvetica, Arial, sans-serif';c.fillStyle=o.c;c.textAlign='left';c.textBaseline='alphabetic';c.fillText(o.s,o.x,o.y);}
   else if(o.k==='i'){try{c.drawImage(o.img,o.x,o.y,o.w,o.h);}catch(e){}}}
  out.push(await new Promise(res=>cv.toBlob(b=>res(b),'image/jpeg',.92)));}
 return out;}
// ---- antarmuka
function open(allProds){
 const prods=(allProds||[]).filter(p=>p.is_active!==false&&String(p.is_active)!=='false');
 if(!prods.length){A.toast('Belum ada produk aktif di katalog.');return;}
 ui.sheet('Buat Pricelist',(b,close)=>{
  const gs=groups(prods,null),title=ui.text({value:'Pricelist','aria-label':'Judul pricelist',maxlength:'40',id:'pl-title'}),chk={},box=h('div',{class:'pl-cats',id:'pl-cats'});
  gs.forEach(g=>{const c=h('input',{type:'checkbox','aria-label':'Kategori '+g.name,'data-cat':g.name});c.checked=true;chk[g.name]=c;box.appendChild(h('label',{class:'check',style:'display:flex;gap:10px;align-items:center;min-height:44px'},c,h('span',null,g.name+' ('+g.items.length+')')));});
  const msg=h('div'),res=h('div',{id:'pl-res'});
  b.appendChild(h('p',{class:'sub'},'Dibuat otomatis dari katalog produk aktif. Harga modal tidak pernah ikut tercetak.'));b.appendChild(ui.field('Judul',title));const hasPh=prods.some(p=>p.photo_file_id);let style=hasPh?'card':'list';const bl=h('button',{class:'chip',type:'button',id:'pl-st-list'},'Daftar'),bc=h('button',{class:'chip',type:'button',id:'pl-st-card'},'Kartu foto (3 kolom)'),setSt=v=>{style=v;bl.setAttribute('aria-pressed',String(v==='list'));bc.setAttribute('aria-pressed',String(v==='card'));};bl.addEventListener('click',()=>setSt('list'));bc.addEventListener('click',()=>setSt('card'));setSt(style);
  b.appendChild(h('div',{class:'sub'},'Gaya'));b.appendChild(h('div',{class:'chips',role:'group','aria-label':'Gaya pricelist'},bl,bc));if(!hasPh)b.appendChild(h('div',{class:'sub'},'Tambahkan foto di menu Produk (Ubah) agar kartu berfoto terlihat bagus.'));
  b.appendChild(h('div',{class:'sub'},'Kategori yang ikut'));b.appendChild(box);b.appendChild(msg);
  const only=()=>gs.filter(g=>chk[g.name].checked).map(g=>g.name);
  const run=async(kind,btn)=>{const sel=only();if(!sel.length){ui.banner(msg,'Pilih minimal satu kategori.');return;}ui.banner(msg,'');const P=window.PDFLib;if(!P){ui.banner(msg,'Modul PDF belum termuat. Muat ulang halaman lalu coba lagi.');return;}
   await ui.run(btn,async()=>{const opt={title:title.value.trim()||'Pricelist',only:sel,style:style},nm=('Pricelist-'+((S.boot.settings||{}).business_name||'AeneFlow')).replace(/[^A-Za-z0-9._-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
    res.textContent='';let files=[];
    if(style==='card'&&A.photos){const cw=(R-M-20)/3,phH=Math.round(cw*.7);opt.photos={};const want=prods.filter(p=>p.photo_file_id&&sel.indexOf(String(p.category||'').trim()||'Lainnya')>=0);
     await Promise.all(want.map(async p=>{try{const u=await A.photos.get(p.photo_file_id);if(u)opt.photos[p.product_id]=await cropPhoto(u,cw-1.2,phH);}catch(e){}}));}
    if(kind==='pdf'){const bytes=await toPdf(P,prods,opt);files=[new File([bytes],nm+'.pdf',{type:'application/pdf'})];}
    else{const bl=await toImages(P,prods,opt);files=bl.map((x,i)=>new File([x],nm+(bl.length>1?'-'+(i+1):'')+'.jpg',{type:'image/jpeg'}));}
    const can=!!(navigator.canShare&&navigator.share&&navigator.canShare({files:files})),row=h('div',{class:'btnrow'});
    if(can)row.appendChild(h('button',{class:'btn pri',type:'button',id:'pl-share',onclick:async()=>{try{await navigator.share({files:files,title:opt.title});}catch(e){if(e&&e.name!=='AbortError')A.toast('Gagal membagikan. Gunakan Unduh.');}}},'Bagikan'));
    files.forEach((f,i)=>row.appendChild(h('a',{class:'btn'+(can?'':' pri'),href:URL.createObjectURL(f),download:f.name,id:'pl-dl'+i},'Unduh '+(files.length>1?(kind==='pdf'?'PDF':'gambar '+(i+1)):(kind==='pdf'?'PDF':'gambar')))));
    res.appendChild(h('div',{class:'sub',id:'pl-ok'},'Pricelist siap ('+prods.filter(p=>sel.indexOf(String(p.category||'').trim()||'Lainnya')>=0).length+' produk).'));res.appendChild(row);},m=>ui.banner(msg,m));};
  const bp=h('button',{class:'btn pri',type:'button',id:'pl-pdf'},'Buat PDF'),bi=h('button',{class:'btn',type:'button',id:'pl-img'},'Buat Gambar');
  bp.addEventListener('click',()=>run('pdf',bp));bi.addEventListener('click',()=>run('img',bi));
  b.appendChild(h('div',{class:'btnrow'},bp,bi));b.appendChild(res);b.appendChild(h('div',{class:'btnrow'},h('button',{class:'btn',type:'button',onclick:close},'Tutup')));});}
A.pricelist={open:open,layout:layout,toPdf:toPdf,toImages:toImages,groups:groups};
});
