/* AeneFlow - master.js: kelola pelanggan & produk (cari, tambah, ubah, aktif/nonaktif, riwayat invoice). */
(window.AeneModules=window.AeneModules||[]).push(function(A){'use strict';
const h=A.h,ui=A.ui,rp=A.rp,fdate=A.fdate,S=A.S,api=A.api;
const PILL={Paid:'p-paid','Partially Paid':'p-part',Unpaid:'p-unpaid',Overdue:'p-over',Draft:'p-draft',Cancelled:'p-cancel'};
const hit=(q,arr)=>{q=q.trim().toLowerCase();return!q||arr.some(x=>String(x||'').toLowerCase().indexOf(q)>=0);};
const act=x=>x.is_active===true||String(x.is_active).toUpperCase()==='TRUE';

// ---------- form pelanggan (dipakai juga oleh editor invoice) ----------
A.custForm=function(b,cur,done){cur=cur||{};const err=h('div');b.appendChild(err);
 const f={name:ui.text({value:cur.name||'',maxlength:'100','aria-label':'Nama',id:'c-name'}),organization:ui.text({value:cur.organization||'',maxlength:'100','aria-label':'Instansi'}),whatsapp:ui.text({value:cur.whatsapp||'',inputmode:'tel',maxlength:'30','aria-label':'WhatsApp',id:'c-wa'}),
  email:ui.text({value:cur.email||'',inputmode:'email',maxlength:'100','aria-label':'Email'}),address:ui.area(cur.address||'',{rows:'2',maxlength:'300','aria-label':'Alamat'}),city:ui.text({value:cur.city||'',maxlength:'60','aria-label':'Kota'}),notes:ui.area(cur.notes||'',{rows:'2',maxlength:'500','aria-label':'Catatan'})};
 [['Nama *','name'],['Instansi / sekolah','organization'],['WhatsApp','whatsapp'],['Email','email'],['Alamat','address'],['Kota','city'],['Catatan','notes']].forEach(x=>b.appendChild(ui.field(x[0],f[x[1]])));
 const go=h('button',{class:'btn pri',type:'button',id:'c-save'},'Simpan');
 go.addEventListener('click',()=>{const v={};Object.keys(f).forEach(k=>{v[k]=f[k].value.trim();});if(!v.name){ui.banner(b,'Nama wajib diisi.');return;}
  ui.run(go,async()=>{if(cur.customer_id)v.customer_id=cur.customer_id;const r=await api('customers.save',v);await done(Object.assign({},cur,v,{customer_id:r.id,is_active:true}));},m=>ui.banner(b,m));});
 b.appendChild(h('div',{class:'btnrow'},go));};

async function vCust(el,my){
 const q=h('input',{class:'search',type:'search',placeholder:'Cari nama, instansi, atau WhatsApp','aria-label':'Cari pelanggan'}),list=h('div');
 el.appendChild(h('div',{class:'row'},h('b',null,'Pelanggan'),h('button',{class:'btn pri',type:'button',id:'c-new',onclick:()=>ui.sheet('Pelanggan baru',(b,close)=>A.custForm(b,null,async()=>{close();A.toast('Pelanggan disimpan');A.render();}))},'+ Pelanggan')));
 el.appendChild(q);el.appendChild(list);A.skel(list);
 const all=await api('customers.list',{all:true});if(my!==S.seq)return;
 function paint(){list.textContent='';const rows=all.filter(c=>hit(q.value,[c.name,c.organization,c.whatsapp,c.email]));
  if(!rows.length){list.appendChild(A.empty(all.length?'Tidak ditemukan':'Belum ada pelanggan',all.length?'Coba kata kunci lain.':'Tekan “+ Pelanggan” untuk menambah.'));return;}
  rows.slice(0,300).forEach(x=>list.appendChild(h('a',{class:'item lnk'+(act(x)?'':' off'),href:'#/customer?id='+encodeURIComponent(x.customer_id)},h('div',{class:'row'},h('b',null,x.name),act(x)?null:h('span',{class:'pill p-cancel'},'Nonaktif')),h('div',{class:'sub'},[x.organization,x.whatsapp].filter(Boolean).join(' · ')))));}
 q.addEventListener('input',paint);paint();}

async function vCustDetail(el,my){const id=A.param('id');A.skel(el);
 const [all,inv]=await Promise.all([api('customers.list',{all:true}),api('invoices.list')]);if(my!==S.seq)return;el.textContent='';
 const c=all.find(x=>x.customer_id===id);if(!c){el.appendChild(A.empty('Pelanggan tidak ditemukan',''));return;}
 const mine=inv.filter(i=>i.customer_id===id).sort((a,b)=>String(b.issue_date).localeCompare(String(a.issue_date)));
 const open=mine.filter(i=>i.state==='Issued').reduce((n,i)=>n+i.balance,0);
 el.appendChild(h('div',{class:'hero'},h('div',{class:'big',id:'cd-name'},c.name),h('div',{class:'sub'},[c.organization,c.whatsapp,c.email].filter(Boolean).join(' · ')),c.address?h('div',{class:'sub'},c.address+(c.city?', '+c.city:'')):null,act(c)?null:h('span',{class:'pill p-cancel'},'Nonaktif')));
 el.appendChild(h('div',{class:'kpis two'},h('div',{class:'kpi'},h('span',{class:'sub'},'Invoice'),h('b',null,mine.length)),h('div',{class:'kpi'},h('span',{class:'sub'},'Piutang'),h('b',null,rp(open)))));
 const eb=h('div',{id:'cd-err'}),bar=h('div',{class:'btnrow wrapb'});el.appendChild(eb);
 bar.appendChild(h('a',{class:'btn pri',href:'#/invoice-edit?cust='+encodeURIComponent(id),id:'cd-inv'},'Buat invoice'));
 bar.appendChild(h('button',{class:'btn',type:'button',id:'cd-edit',onclick:()=>ui.sheet('Ubah pelanggan',(b,close)=>A.custForm(b,c,async()=>{close();A.toast('Perubahan disimpan');A.render();}))},'Ubah'));
 if(!act(c))bar.appendChild(h('button',{class:'btn',type:'button',id:'cd-toggle',onclick:e=>ui.run(e.currentTarget,async()=>{await api('customers.set_active',{customer_id:id,active:true});A.render();})},'Aktifkan kembali'));
 bar.appendChild(h('button',{class:'btn danger',type:'button',id:'cd-del',onclick:async e=>{const btn=e.currentTarget,n=mine.length;
  const r=await ui.confirm({title:'Hapus pelanggan?',message:c.name+' akan dihapus PERMANEN dari daftar pelanggan. '+(n?n+' invoice miliknya tetap ada dan isinya tidak berubah (nama, WhatsApp, dan alamat di invoice tetap), hanya tidak lagi tertaut ke daftar pelanggan. ':'Pelanggan ini belum punya invoice. ')+'Penghapusan tidak bisa dibatalkan dari aplikasi.',danger:true,okText:'Hapus Pelanggan',cancelText:'Kembali'});if(!r)return;
  ui.run(btn,async()=>{await api('customers.delete',{customer_id:id});A.toast('Pelanggan dihapus');location.hash='#/customers';},m=>ui.banner(eb,m));}},'Hapus pelanggan'));
 el.appendChild(bar);if(c.notes)el.appendChild(h('div',{class:'card'},h('div',{class:'sub'},'Catatan'),h('div',{class:'pre'},c.notes)));
 el.appendChild(h('h2',{class:'sec'},'Riwayat invoice'));
 if(!mine.length)el.appendChild(h('p',{class:'sub'},'Belum ada invoice untuk pelanggan ini.'));
 mine.forEach(x=>el.appendChild(h('a',{class:'item lnk',href:'#/invoice?id='+encodeURIComponent(x.invoice_id)},h('div',{class:'row'},h('div',null,h('b',null,x.invoice_number),h('div',{class:'sub'},fdate(x.issue_date))),h('b',null,rp(x.grand_total))),(()=>{const ps=A.payStatus(x.payment_status,x.grand_total,x.balance),pp=A.PILL[ps]||['p-draft',ps];return h('span',{class:'pill '+pp[0],style:'margin-top:6px'},pp[1]);})())));}

// ---------- produk ----------
function prodForm(b,cur,done){cur=cur||{};const err=h('div');b.appendChild(err);
 const f={name:ui.text({value:cur.name||'',maxlength:'150','aria-label':'Nama produk',id:'p-name'}),category:ui.text({value:cur.category||'',maxlength:'50','aria-label':'Kategori'}),unit:ui.text({value:cur.unit||'pcs',maxlength:'20','aria-label':'Satuan'}),description:ui.area(cur.description||'',{rows:'2',maxlength:'500','aria-label':'Deskripsi'})};
 const sp=ui.money(Number(cur.sell_price)||0,null,{'aria-label':'Harga jual',id:'p-sell'}),cp=ui.money(0,null,{'aria-label':'Harga modal',id:'p-cost',placeholder:'kosong = belum diketahui'});cp.value=(cur.cost_price===''||cur.cost_price==null)?'':ui.fmt(Number(cur.cost_price));
 b.appendChild(ui.field('Nama produk *',f.name));b.appendChild(ui.field('Kategori',f.category));b.appendChild(h('div',{class:'grid2'},ui.field('Harga jual (Rp) *',sp),ui.field('Satuan',f.unit)));
 b.appendChild(ui.field('Harga modal (Rp, opsional)',cp,'Kosong = belum diketahui (item ini tidak ikut hitungan laba). 0 = memang tanpa modal.'));b.appendChild(ui.field('Deskripsi',f.description));
 const go=h('button',{class:'btn pri',type:'button',id:'p-save'},'Simpan');
 go.addEventListener('click',()=>{const v={name:f.name.value.trim(),category:f.category.value.trim(),unit:f.unit.value.trim()||'pcs',description:f.description.value.trim(),sell_price:ui.num(sp.value),cost_price:cp.value.trim()===''?'':ui.num(cp.value)};
  if(!v.name){ui.banner(b,'Nama produk wajib diisi.');return;}if(cur.product_id)v.product_id=cur.product_id;
  ui.run(go,async()=>{await api('products.save',v);await done();},m=>ui.banner(b,m));});
 b.appendChild(h('div',{class:'btnrow'},go));}

async function vProd(el,my){
 const q=h('input',{class:'search',type:'search',placeholder:'Cari produk atau kategori','aria-label':'Cari produk'}),list=h('div'),showOff={v:false};
 el.appendChild(h('div',{class:'row'},h('b',null,'Produk & katalog'),h('button',{class:'btn pri',type:'button',id:'p-new',onclick:()=>ui.sheet('Produk baru',(b,close)=>prodForm(b,null,async()=>{close();A.toast('Produk disimpan');A.render();}))},'+ Produk')));
 el.appendChild(q);el.appendChild(list);A.skel(list);
 const all=await api('products.list',{all:true});if(my!==S.seq)return;
 function paint(){list.textContent='';const rows=all.filter(p=>hit(q.value,[p.name,p.category]));
  if(!rows.length){list.appendChild(A.empty(all.length?'Tidak ditemukan':'Belum ada produk',all.length?'Coba kata kunci lain.':'Tekan “+ Produk” untuk menambah.'));return;}
  rows.slice(0,300).forEach(x=>{const noCost=x.cost_price===''||x.cost_price==null;
   list.appendChild(h('div',{class:'item'+(act(x)?'':' off')},h('div',{class:'row'},h('b',null,x.name),h('b',null,rp(x.sell_price))),h('div',{class:'sub'},[x.category,x.unit].filter(Boolean).join(' · ')),
    h('div',{class:'row',style:'margin-top:6px'},h('span',{class:'sub'},noCost?'Modal belum diisi':'Modal '+rp(x.cost_price)),act(x)?null:h('span',{class:'pill p-cancel'},'Nonaktif')),
    h('div',{class:'btnrow'},h('button',{class:'linkbtn','data-edit':x.product_id,type:'button',onclick:()=>ui.sheet('Ubah produk',(b,close)=>prodForm(b,x,async()=>{close();A.toast('Perubahan disimpan');A.render();}))},'Ubah'),
     h('button',{class:'linkbtn','data-toggle':x.product_id,type:'button',onclick:async e=>{ui.run(e.currentTarget,async()=>{await api('products.set_active',{product_id:x.product_id,active:!act(x)});A.render();});}},act(x)?'Nonaktifkan':'Aktifkan'))));});}
 q.addEventListener('input',paint);paint();}

A.ROUTES.customers={t:'Customers',nav:'more',back:'more',v:vCust};
A.ROUTES.customer={t:'Pelanggan',nav:'more',back:'customers',v:vCustDetail};
A.ROUTES.products={t:'Products & Catalog',nav:'more',back:'more',v:vProd};
});
