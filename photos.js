// Foto produk (Versi 19): kompres di HP, simpan di Drive pribadi lewat backend, cache di perangkat (IndexedDB + memori) agar tidak diunduh ulang.
(window.AeneModules=window.AeneModules||[]).push(function(A){
 const h=A.h,api=A.api,MEM={},WAIT={};let DB=null,Q=[],busy=false;
 function idb(){if(DB)return DB;DB=new Promise(res=>{try{const r=indexedDB.open('aene_photos',1);r.onupgradeneeded=()=>r.result.createObjectStore('p');r.onsuccess=()=>res(r.result);r.onerror=()=>res(null);}catch(e){res(null);}});return DB;}
 async function idbGet(k){const d=await idb();if(!d)return null;return new Promise(res=>{try{const q=d.transaction('p').objectStore('p').get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null);}catch(e){res(null);}});}
 async function idbPut(k,v){const d=await idb();if(!d)return;try{d.transaction('p','readwrite').objectStore('p').put(v,k);}catch(e){}}
 // antrian ambil: maks 6 id per permintaan, satu permintaan pada satu waktu
 async function pump(){if(busy)return;busy=true;try{while(Q.length){const ids=Q.splice(0,6);let r={};try{r=(await api('products.photo_get',{ids:ids})).photos||{};}catch(e){}
  ids.forEach(i=>{const w=WAIT[i];delete WAIT[i];if(r[i]){MEM[i]=r[i];idbPut(i,r[i]);}if(w)w.forEach(f=>f(r[i]||null));});}}finally{busy=false;}}
 function get(id){id=String(id||'');if(!id)return Promise.resolve(null);if(MEM[id])return Promise.resolve(MEM[id]);
  return new Promise(res=>{if(WAIT[id]){WAIT[id].push(res);return;}WAIT[id]=[res];idbGet(id).then(v=>{if(v){MEM[id]=v;const w=WAIT[id];delete WAIT[id];(w||[]).forEach(f=>f(v));}else{Q.push(id);pump();}});});}
 // gambar kecil yang terisi sendiri bila foto sudah ada
 function thumb(id,size){const box=h('div',{class:'ph-thumb','aria-hidden':'true',style:'width:'+size+'px;height:'+size+'px'});if(!id)return box;
  get(id).then(u=>{if(u&&box.isConnected!==false){box.appendChild(h('img',{src:u,alt:'',decoding:'async'}));box.classList.add('on');}});return box;}
 // kompres: sisi terpanjang maks 700 px, JPEG; turunkan mutu bertahap sampai <= ~300 KB (batas server 450.000 karakter)
 async function compress(file){if(!file||!/^image\//.test(file.type||''))throw new Error('Pilih berkas gambar.');
  let bmp;try{bmp=await createImageBitmap(file,{imageOrientation:'from-image'});}catch(e){bmp=await new Promise((ok,no)=>{const im=new Image(),u=URL.createObjectURL(file);im.onload=()=>{URL.revokeObjectURL(u);ok(im);};im.onerror=()=>no(new Error('Foto tidak bisa dibaca.'));im.src=u;});}
  const w0=bmp.width||bmp.naturalWidth,h0=bmp.height||bmp.naturalHeight,k=Math.min(1,700/Math.max(w0,h0)),w=Math.max(1,Math.round(w0*k)),hh=Math.max(1,Math.round(h0*k));
  const c=document.createElement('canvas');c.width=w;c.height=hh;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,hh);x.drawImage(bmp,0,0,w,hh);if(bmp.close)bmp.close();
  let q=.8,u=c.toDataURL('image/jpeg',q);while(u.length>400000&&q>.4){q-=.1;u=c.toDataURL('image/jpeg',q);}if(u.length>440000)throw new Error('Foto terlalu besar. Pilih foto lain.');return u;}
 // bidang foto di formulir produk: mengembalikan {el, apply(productId)} ; apply menyimpan/menghapus foto sesudah produk tersimpan
 function field(cur){let pending=null,removed=false;const id=cur&&cur.photo_file_id,prev=h('div',{class:'ph-prev',id:'ph-prev'}),inp=h('input',{type:'file',accept:'image/*',id:'ph-file',hidden:true,'aria-label':'Pilih foto produk'}),
   pick=h('button',{class:'btn',type:'button',id:'ph-pick'},id?'Ganti foto':'Tambah foto'),del=h('button',{class:'linkbtn',type:'button',id:'ph-del',hidden:!id},'Hapus foto'),msg=h('div',{class:'sub',id:'ph-msg'});
  const show=u=>{prev.textContent='';if(u)prev.appendChild(h('img',{src:u,alt:'Foto produk'}));else prev.appendChild(h('span',{class:'sub'},'Belum ada foto'));};
  show(null);if(id)get(id).then(u=>{if(!pending&&!removed)show(u);});
  pick.addEventListener('click',()=>inp.click());
  inp.addEventListener('change',async()=>{const f=inp.files&&inp.files[0];inp.value='';if(!f)return;msg.textContent='Memproses foto…';try{pending=await compress(f);removed=false;show(pending);del.hidden=false;pick.textContent='Ganti foto';msg.textContent='';}catch(e){msg.textContent=e.message;}});
  del.addEventListener('click',()=>{pending=null;removed=true;show(null);del.hidden=true;pick.textContent='Tambah foto';});
  const el=h('div',{class:'field'},h('label',null,'Foto produk (opsional)'),prev,h('div',{class:'btnrow'},pick,del),msg,inp);
  return{el:el,changed:()=>!!pending||removed,apply:async pid=>{if(pending){const r=await api('products.photo_set',{product_id:pid,data:pending});MEM[r.photo_id]=pending;idbPut(r.photo_id,pending);}else if(removed&&id){await api('products.photo_clear',{product_id:pid});}}};}
 A.photos={get:get,thumb:thumb,compress:compress,field:field};
});
