/* AeneFlow - settings.js: profil usaha, rekening bank (maks 5), jatuh tempo & PPN default, syarat, template WhatsApp. Hanya pemilik yang bisa menyimpan. */
(window.AeneModules=window.AeneModules||[]).push(function(A){'use strict';
const h=A.h,ui=A.ui,S=A.S,api=A.api;
const DEF_WA='Halo {nama}, berikut invoice {nomor} dari {bisnis}. Total {total}, sisa tagihan {sisa}, jatuh tempo {jatuh_tempo}. Terima kasih 🙏';
A.waDefault=DEF_WA;
function banks(s){try{const a=JSON.parse(s.bank_accounts||'[]');return Array.isArray(a)?a:[];}catch(e){return[];}}
// ---- logo usaha: dikecilkan DI PERANGKAT (canvas) sampai <= 40.000 karakter (batas backend 45.000), PNG dulu, lalu JPEG berlatar putih ----
const LOGO_MAX=40000,LOGO_RE=/^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/]+={0,2}$/;
function fitLogo(file){return new Promise((res,rej)=>{
 if(!file||!/^image\/(png|jpeg)$/.test(file.type))return rej(new Error('Logo harus berupa gambar PNG atau JPEG.'));
 if(file.size>8*1024*1024)return rej(new Error('Gambar terlalu besar (maks. 8 MB).'));
 const url=URL.createObjectURL(file),img=new Image();
 img.onload=()=>{URL.revokeObjectURL(url);try{if(!img.width||!img.height)throw 0;
  for(const side of [256,200,160,128,96]){const sc=Math.min(1,side/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*sc)),hh=Math.max(1,Math.round(img.height*sc));
   const c=document.createElement('canvas');c.width=w;c.height=hh;c.getContext('2d').drawImage(img,0,0,w,hh);let d=c.toDataURL('image/png');if(d.length<=LOGO_MAX&&LOGO_RE.test(d))return res(d);
   const c2=document.createElement('canvas');c2.width=w;c2.height=hh;const x=c2.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,hh);x.drawImage(img,0,0,w,hh);d=c2.toDataURL('image/jpeg',.85);if(d.length<=LOGO_MAX&&LOGO_RE.test(d))return res(d);}
  rej(new Error('Logo terlalu rumit untuk dikecilkan. Coba gambar yang lebih sederhana.'));}catch(e){rej(new Error('Gambar tidak bisa diproses.'));}};
 img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('Gambar tidak bisa dibaca. Pakai PNG atau JPEG.'));};img.src=url;});}
async function vSettings(el){
 // Ambil pengaturan TERBARU dari server dulu: salinan saat login bisa basi bila pengaturan diubah dari perangkat lain, dan menyimpan dari form basi akan menimpa perubahan itu.
 try{const r=await api('bootstrap');if(r&&r.settings)S.boot.settings=r.settings;}catch(e){}
 const owner=S.boot.user.role==='owner',s=S.boot.settings||{};
 const errBox=h('div');el.appendChild(errBox);
 el.appendChild(h('div',{class:'card'},h('div',{class:'sub'},'Akun'),h('div',null,S.boot.user.email+' · '+S.boot.user.role),h('div',{style:'margin-top:10px'},h('button',{class:'btn',type:'button',onclick:()=>window.AeneApp.logout?window.AeneApp.logout('Anda sudah keluar.'):location.reload()},'Keluar'))));
 if(!owner){el.appendChild(h('p',{class:'sub'},'Hanya pemilik yang dapat mengubah pengaturan.'));return;}
 const f={business_name:ui.text({value:s.business_name||'',maxlength:'100','aria-label':'Nama usaha',id:'s-name'}),business_address:ui.area(s.business_address||'',{rows:'2',maxlength:'300','aria-label':'Alamat usaha'}),business_phone:ui.text({value:s.business_phone||'',inputmode:'tel',maxlength:'30','aria-label':'Telepon usaha'}),business_email:ui.text({value:s.business_email||'',inputmode:'email',maxlength:'100','aria-label':'Email usaha'}),
  default_due_days:ui.text({value:String(s.default_due_days==null||s.default_due_days===''?7:s.default_due_days),inputmode:'numeric','aria-label':'Jatuh tempo default'}),tax_default_rate:ui.text({value:String(s.tax_default_rate||0),inputmode:'decimal','aria-label':'PPN default'}),
  terms_and_conditions:ui.area(s.terms_and_conditions||'',{rows:'5',maxlength:'2000','aria-label':'Syarat dan ketentuan',id:'s-terms'}),wa_template:ui.area(s.wa_template||DEF_WA,{rows:'4',maxlength:'1000','aria-label':'Template WhatsApp',id:'s-wa'})};
 const bk=banks(s).slice(0,5);const bbox=h('div');
 function drawBanks(){bbox.textContent='';bk.forEach((b,n)=>{const bn=ui.text({value:b.bank,placeholder:'Bank (mis. BCA)','aria-label':'Bank '+(n+1),maxlength:'50'}),no=ui.text({value:b.number,placeholder:'Nomor rekening','aria-label':'Nomor rekening '+(n+1),inputmode:'numeric',maxlength:'40'}),ho=ui.text({value:b.holder,placeholder:'Atas nama','aria-label':'Atas nama '+(n+1),maxlength:'80'});
  bn.addEventListener('input',()=>{b.bank=bn.value;});no.addEventListener('input',()=>{b.number=no.value;});ho.addEventListener('input',()=>{b.holder=ho.value;});
  bbox.appendChild(h('div',{class:'card'},h('div',{class:'row'},h('b',null,'Rekening '+(n+1)),h('button',{class:'linkbtn',type:'button',onclick:()=>{bk.splice(n,1);drawBanks();}},'Hapus')),bn,no,ho));});
  if(bk.length<5)bbox.appendChild(h('button',{class:'btn',type:'button',id:'s-addbank',onclick:()=>{bk.push({bank:'',number:'',holder:''});drawBanks();}},'+ Tambah rekening'));}
 drawBanks();
 // logo: perubahan baru dikirim bila diubah (logoDirty), supaya simpan biasa tidak mengirim ulang gambar
 let logo=LOGO_RE.test(s.business_logo||'')?s.business_logo:'',logoDirty=false;const lbox=h('div',{class:'logobox'}),lmsg=h('div');
 function drawLogo(){lbox.textContent='';
  lbox.appendChild(logo?h('img',{class:'logo-prev',id:'s-logo-img',alt:'Logo usaha',src:logo}):h('div',{class:'sub',id:'s-logo-none'},'Belum ada logo. PDF tampil tanpa logo.'));
  const pick=h('input',{type:'file',accept:'image/png,image/jpeg',id:'s-logo-file','aria-label':'Pilih file logo',class:'filein'});
  pick.addEventListener('change',async()=>{const file=pick.files&&pick.files[0];if(!file)return;ui.banner(lmsg,'');
   try{logo=await fitLogo(file);logoDirty=true;drawLogo();ui.banner(lmsg,'');A.toast('Logo siap. Tekan Simpan Pengaturan.');}catch(e){ui.banner(lmsg,e.message);}});
  const row=h('div',{class:'btnrow wrapb'},h('label',{class:'btn filebtn'},logo?'Ganti logo':'Unggah logo',pick));
  if(logo)row.appendChild(h('button',{class:'btn danger',type:'button',id:'s-logo-del',onclick:()=>{logo='';logoDirty=true;drawLogo();A.toast('Logo dihapus. Tekan Simpan Pengaturan.');}},'Hapus logo'));
  lbox.appendChild(row);lbox.appendChild(h('div',{class:'sub'},'PNG atau JPEG. Otomatis dikecilkan (maks. 256 px) dan disimpan bersama pengaturan. Tampil di kiri atas PDF.'));}
 drawLogo();
 el.appendChild(h('h2',{class:'sec'},'Profil usaha'));el.appendChild(h('div',{class:'card'},ui.field('Nama usaha',f.business_name),ui.field('Alamat',f.business_address),ui.field('Telepon',f.business_phone),ui.field('Email',f.business_email)));
 el.appendChild(h('h2',{class:'sec'},'Logo usaha'));el.appendChild(h('div',{class:'card'},lbox,lmsg));
 el.appendChild(h('h2',{class:'sec'},'Rekening bank'));el.appendChild(bbox);
 el.appendChild(h('h2',{class:'sec'},'Aturan invoice'));el.appendChild(h('div',{class:'card'},h('div',{class:'grid2'},ui.field('Jatuh tempo (hari)',f.default_due_days),ui.field('PPN default (%)',f.tax_default_rate)),ui.field('Syarat & ketentuan default',f.terms_and_conditions)));
 el.appendChild(h('h2',{class:'sec'},'Template WhatsApp'));el.appendChild(h('div',{class:'card'},ui.field('Pesan',f.wa_template,'Kata kunci: {nama} {nomor} {total} {sisa} {jatuh_tempo} {bisnis}. PDF dibuat lewat tombol "PDF & WhatsApp" di detail invoice.')));
 const go=h('button',{class:'btn pri',type:'button',id:'s-save'},'Simpan Pengaturan');
 go.addEventListener('click',()=>{const clean=bk.filter(b=>b.bank.trim()||b.number.trim()||b.holder.trim());
  const p={business_name:f.business_name.value.trim(),business_address:f.business_address.value.trim(),business_phone:f.business_phone.value.trim(),business_email:f.business_email.value.trim(),default_due_days:ui.num(f.default_due_days.value),tax_default_rate:ui.num(f.tax_default_rate.value,true),terms_and_conditions:f.terms_and_conditions.value.trim(),wa_template:f.wa_template.value.trim()||DEF_WA,bank_accounts:clean.map(b=>({bank:b.bank.trim(),number:b.number.trim(),holder:b.holder.trim()}))};
  if(logoDirty)p.business_logo=logo;
  if(!p.business_name){ui.banner(errBox,'Nama usaha wajib diisi.');return;}
  ui.run(go,async()=>{const r=await api('settings.save',{settings:p});S.boot.settings=r.settings;ui.banner(errBox,'');A.toast('Pengaturan disimpan');A.render();},m=>ui.banner(errBox,m));});
 el.appendChild(go);
 el.appendChild(h('div',{class:'card menu',style:'margin-top:14px'},h('a',{href:'#/import'},'Impor Data Historis',h('span',null,'›'))));
 el.appendChild(h('p',{class:'sub'},'AeneFlow · R2. Manajemen pesanan, Cashflow, dan Google Calendar hadir di rilis berikutnya.'));}
A.ROUTES.settings={t:'Settings',nav:'more',back:'more',v:vSettings};
});
