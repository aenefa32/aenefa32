/* AeneFlow - settings.js: profil usaha, rekening bank (maks 5), jatuh tempo & PPN default, syarat, template WhatsApp. Hanya pemilik yang bisa menyimpan. */
(window.AeneModules=window.AeneModules||[]).push(function(A){'use strict';
const h=A.h,ui=A.ui,S=A.S,api=A.api;
const DEF_WA='Halo {nama}, berikut invoice {nomor} dari {bisnis}. Total {total}, sisa tagihan {sisa}, jatuh tempo {jatuh_tempo}. Terima kasih 🙏';
A.waDefault=DEF_WA;
function banks(s){try{const a=JSON.parse(s.bank_accounts||'[]');return Array.isArray(a)?a:[];}catch(e){return[];}}
async function vSettings(el){const owner=S.boot.user.role==='owner',s=S.boot.settings||{};
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
 el.appendChild(h('h2',{class:'sec'},'Profil usaha'));el.appendChild(h('div',{class:'card'},ui.field('Nama usaha',f.business_name),ui.field('Alamat',f.business_address),ui.field('Telepon',f.business_phone),ui.field('Email',f.business_email)));
 el.appendChild(h('h2',{class:'sec'},'Rekening bank'));el.appendChild(bbox);
 el.appendChild(h('h2',{class:'sec'},'Aturan invoice'));el.appendChild(h('div',{class:'card'},h('div',{class:'grid2'},ui.field('Jatuh tempo (hari)',f.default_due_days),ui.field('PPN default (%)',f.tax_default_rate)),ui.field('Syarat & ketentuan default',f.terms_and_conditions)));
 el.appendChild(h('h2',{class:'sec'},'Template WhatsApp'));el.appendChild(h('div',{class:'card'},ui.field('Pesan',f.wa_template,'Kata kunci: {nama} {nomor} {total} {sisa} {jatuh_tempo} {bisnis}. PDF dilampirkan saat dikirim (rilis berikutnya).')));
 const go=h('button',{class:'btn pri',type:'button',id:'s-save'},'Simpan Pengaturan');
 go.addEventListener('click',()=>{const clean=bk.filter(b=>b.bank.trim()||b.number.trim()||b.holder.trim());
  const p={business_name:f.business_name.value.trim(),business_address:f.business_address.value.trim(),business_phone:f.business_phone.value.trim(),business_email:f.business_email.value.trim(),default_due_days:ui.num(f.default_due_days.value),tax_default_rate:ui.num(f.tax_default_rate.value,true),terms_and_conditions:f.terms_and_conditions.value.trim(),wa_template:f.wa_template.value.trim()||DEF_WA,bank_accounts:clean.map(b=>({bank:b.bank.trim(),number:b.number.trim(),holder:b.holder.trim()}))};
  if(!p.business_name){ui.banner(errBox,'Nama usaha wajib diisi.');return;}
  ui.run(go,async()=>{const r=await api('settings.save',{settings:p});S.boot.settings=r.settings;ui.banner(errBox,'');A.toast('Pengaturan disimpan');A.render();},m=>ui.banner(errBox,m));});
 el.appendChild(go);
 el.appendChild(h('div',{class:'card menu',style:'margin-top:14px'},h('a',{href:'#/import'},'Impor Data Historis',h('span',null,'›'))));
 el.appendChild(h('p',{class:'sub'},'AeneFlow · R2. Manajemen pesanan, Cashflow, dan Google Calendar hadir di rilis berikutnya.'));}
A.ROUTES.settings={t:'Settings',nav:'more',back:'more',v:vSettings};
});
