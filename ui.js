/* AeneFlow - ui.js: komponen UI bersama (bottom sheet, konfirmasi, kolom isian, angka & tanggal). Semua teks lewat textContent. */
(window.AeneModules=window.AeneModules||[]).push(function(A){'use strict';
const h=A.h,ui=A.ui={};
// angka: dec=true -> desimal (titik/koma); selain itu hanya digit (rupiah bulat)
ui.num=function(v,dec){let s=String(v==null?'':v).trim();s=dec?s.replace(',','.').replace(/[^0-9.]/g,''):s.replace(/[^0-9]/g,'');const n=Number(s);return isFinite(n)?n:0;};
ui.fmt=n=>Number(n||0).toLocaleString('id-ID');
ui.today=()=>{try{return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta'}).format(new Date());}catch(e){return new Date().toISOString().slice(0,10);}};
ui.addDays=(d,n)=>{const t=new Date(d+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10);};
ui.wa=n=>{let d=String(n||'').replace(/[^0-9]/g,'');if(!d)return'';if(d.indexOf('0')===0)d='62'+d.slice(1);return d;};
ui.field=(label,ctl,hint)=>h('label',{class:'fld'},h('span',{class:'fl'},label),ctl,hint?h('span',{class:'hint'},hint):null);
ui.text=p=>h('input',Object.assign({type:'text',autocomplete:'off'},p||{}));
ui.area=(v,p)=>{const e=h('textarea',Object.assign({rows:'3'},p||{}));e.value=v==null?'':String(v);return e;};
ui.select=(opts,val,p)=>{const s=h('select',p||{});opts.forEach(o=>{const op=h('option',{value:o[0]},o[1]);if(String(o[0])===String(val))op.selected=true;s.appendChild(op);});return s;};
// kolom rupiah: tampil berformat saat tidak difokus, angka murni saat mengetik
ui.money=function(val,onChange,p){const e=h('input',Object.assign({type:'text',inputmode:'numeric',autocomplete:'off'},p||{}));
 const show=n=>{e.value=n?ui.fmt(n):(n===0&&e.dataset.zero?'0':'');};e.value=val?ui.fmt(val):'';
 e.addEventListener('focus',()=>{const n=ui.num(e.value);e.value=n?String(n):'';try{e.select();}catch(x){}});
 e.addEventListener('input',()=>{if(onChange)onChange(ui.num(e.value));});
 e.addEventListener('blur',()=>{show(ui.num(e.value));});
 e.getNum=()=>ui.num(e.value);e.setNum=n=>{show(n);if(onChange)onChange(n);};return e;};
ui.banner=function(parent,msg){const old=parent.querySelector('.banner.fe');if(old)old.remove();if(!msg)return;const b=h('div',{class:'banner fe',role:'alert'},msg);parent.insertBefore(b,parent.firstChild);try{b.scrollIntoView({block:'nearest'});}catch(e){}};
ui.sheet=function(title,build,onClose){const prev=document.activeElement,ov=h('div',{class:'ov'}),panel=h('div',{class:'sheet',role:'dialog','aria-modal':'true','aria-label':title,tabindex:'-1'});let closed=false;
 const onKey=e=>{if(e.key==='Escape')close();};
 function close(){if(closed)return;closed=true;ov.remove();document.removeEventListener('keydown',onKey);if(prev&&prev.focus)try{prev.focus();}catch(e){}if(onClose)onClose();}
 panel.appendChild(h('div',{class:'row sh'},h('h2',null,title),h('button',{class:'ib',type:'button','aria-label':'Tutup',onclick:close},'×')));
 const body=h('div',{class:'sb'});panel.appendChild(body);ov.appendChild(panel);ov.addEventListener('click',e=>{if(e.target===ov)close();});document.addEventListener('keydown',onKey);document.body.appendChild(ov);
 build(body,close);try{panel.focus();}catch(e){}return{close:close,body:body};};
// konfirmasi (opsional alasan wajib). Hasil: {reason} atau null bila dibatalkan.
ui.confirm=function(o){return new Promise(res=>{let done=false;const fin=v=>{if(!done){done=true;res(v);}};
 ui.sheet(o.title,(b,close)=>{b.appendChild(h('p',{class:'cmsg'},o.message||''));let ta=null;if(o.reason){ta=ui.area('',{rows:'2','aria-label':o.reason.label,placeholder:o.reason.label});b.appendChild(ta);}
  const err=h('p',{class:'err',role:'alert'},'');b.appendChild(err);
  b.appendChild(h('div',{class:'btnrow'},h('button',{class:'btn',type:'button',onclick:()=>{fin(null);close();}},o.cancelText||'Batal'),
   h('button',{class:'btn '+(o.danger?'danger':'pri'),type:'button',onclick:()=>{const r=ta?ta.value.trim():'';if(o.reason&&o.reason.required&&!r){err.textContent='Alasan wajib diisi.';return;}fin({reason:r});close();}},o.okText||'Lanjut')));},()=>fin(null));});};
// jalankan aksi async pada tombol: cegah klik ganda, tampilkan error
ui.run=async function(btn,fn,onErr){const t=btn.textContent;btn.disabled=true;btn.textContent='Memproses…';try{return await fn();}catch(e){if(onErr)onErr(e.message);else A.toast(e.message);}finally{btn.disabled=false;btn.textContent=t;}};

// Pemilih katalog dengan pencarian (Versi 18): tombol -> lembar berisi kolom cari + daftar. Cocok untuk katalog besar (tanpa menggulir).
ui.pick=function(prods,o){o=o||{};const btn=h('button',{class:'pick',type:'button','aria-label':o.label||'Pilih dari katalog'},o.text||'Cari & pilih dari katalog…');
 btn.addEventListener('click',()=>ui.sheet(o.title||'Pilih dari katalog',(b,close)=>{
  const q=h('input',{class:'search',type:'search',placeholder:'Ketik nama produk…','aria-label':'Cari produk',autocomplete:'off',autocapitalize:'none',enterkeyhint:'search'}),list=h('div',{class:'pk-list',id:'pk-list'}),LIM=40;
  const norm=x=>String(x||'').toLowerCase();
  function draw(){const t=norm(q.value).split(/\s+/).filter(Boolean);list.textContent='';
   const hit=prods.filter(p=>{const hay=norm(p.name+' '+(p.category||'')+' '+(p.description||''));return t.every(w=>hay.indexOf(w)>=0);});
   if(!hit.length){list.appendChild(h('div',{class:'sub pk-more'},'Tidak ada produk yang cocok.'));return;}
   hit.slice(0,LIM).forEach(p=>list.appendChild(h('button',{class:'pk-row',type:'button','data-pid':p.product_id,onclick:()=>{close();o.onPick(p);}},h('span',null,p.name,p.category?h('small',null,p.category):null),h('span',null,o.fmt?o.fmt(p):''))));
   if(hit.length>LIM)list.appendChild(h('div',{class:'sub pk-more'},'Menampilkan '+LIM+' dari '+hit.length+'. Ketik lebih spesifik untuk mempersempit.'));}
  q.addEventListener('input',draw);b.appendChild(q);b.appendChild(list);draw();try{q.focus();}catch(e){}}));
 return btn;};
});
