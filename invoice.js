/* AeneFlow - invoice.js: editor invoice, detail invoice, pembayaran (DP/cicilan/pelunasan), batal, duplikat. Semua teks lewat textContent. */
(window.AeneModules=window.AeneModules||[]).push(function(A){'use strict';
const h=A.h,ui=A.ui,rp=A.rp,fdate=A.fdate,S=A.S,api=A.api,calc=window.AeneCalc.calcTotals;
const METHODS=['Bank Transfer','Cash','QRIS','E-wallet'];
const PILL={Paid:['p-paid','Paid'],'Partially Paid':['p-part','Partially Paid'],Unpaid:['p-unpaid','Unpaid'],Overdue:['p-over','Overdue'],Draft:['p-draft','Draft'],Cancelled:['p-cancel','Cancelled']};
const pill=s=>{const p=PILL[s]||['p-draft',s];return h('span',{class:'pill '+p[0]},p[1]);};
const blankItem=()=>({item_id:'',product_id:'',name:'',description:'',unit:'pcs',qty:1,unit_price:0,cost_price:''});
function setting(k,d){const v=S.boot&&S.boot.settings?S.boot.settings[k]:undefined;return v===undefined||v===''?d:v;}

// ---------------- EDITOR ----------------
async function vEdit(el,my){
 A.skel(el);const id=A.param('id'),dup=A.param('dup'),pre=A.param('cust');
 const [custs,prods,cur]=await Promise.all([api('customers.list'),api('products.list'),id||dup?api('invoices.get',{invoice_id:id||dup}):Promise.resolve(null)]);if(my!==S.seq)return;el.textContent='';
 const edit=!!id,iv=cur?cur.invoice:null;
 if(edit&&iv.state==='Cancelled'){el.appendChild(A.empty('Invoice dibatalkan','Invoice yang sudah dibatalkan tidak bisa diubah.'));return;}
 const st={ver:cur?cur.ver:'',state:edit?iv.state:'New',paid:cur&&edit?cur.paid:0,hasShip:false,
  customer_id:iv?(iv.customer_id||''):(pre||''),manual:iv&&!iv.customer_id?{cust_name:iv.cust_name,cust_org:iv.cust_org,cust_whatsapp:iv.cust_whatsapp,cust_email:iv.cust_email,cust_address:iv.cust_address}:null,
  items:cur?cur.items.map(i=>({item_id:edit?i.item_id:'',product_id:i.product_id||'',name:i.name,description:i.description||'',unit:i.unit||'pcs',qty:Number(i.qty),unit_price:Number(i.unit_price),cost_price:(i.cost_price===''||i.cost_price==null)?'':Number(i.cost_price)})):[blankItem()],
  dt:iv?iv.discount_type:'amount',dv:iv?Number(iv.discount_value):0,tax:iv?Number(iv.tax_rate):Number(setting('tax_default_rate',0)),ship:iv?Number(iv.shipping_fee):0,xl:iv?iv.extra_fee_label||'':'',xf:iv?Number(iv.extra_fee):0,
  notes:iv?iv.notes||'':'',terms:iv&&edit?iv.terms||'':String(setting('terms_and_conditions','')),issue:edit?iv.issue_date:ui.today(),due:edit?iv.due_date:'',deadline:cur&&cur.order&&edit?cur.order.deadline_date||'':''};
 if(!edit)st.due=ui.addDays(st.issue,Number(setting('default_due_days',7)));
 let activeC=custs.slice(),manualOK=!!st.manual;
 const wrap=h('div',{class:'editor'}),errBox=h('div');
 wrap.appendChild(errBox);
 wrap.appendChild(h('h2',{class:'sec'},edit?'Ubah '+iv.invoice_number:(dup?'Duplikat invoice':'Invoice baru')));
 if(edit&&st.paid>0)wrap.appendChild(h('div',{class:'note'},'Sudah ada pembayaran '+rp(st.paid)+'. Total baru tidak boleh lebih kecil dari itu.'));
 // --- pelanggan
 const cbox=h('div',{class:'card'});wrap.appendChild(cbox);
 function drawCust(){cbox.textContent='';cbox.appendChild(h('div',{class:'sub'},'Pelanggan'));
  const sel=ui.select([['','— Pilih pelanggan —']].concat(activeC.map(c=>[c.customer_id,c.name+(c.organization?' · '+c.organization:'')])).concat(st.manual&&!st.customer_id?[['__manual',st.manual.cust_name+' (tanpa data pelanggan)']]:[]),st.customer_id||(st.manual?'__manual':''),{'aria-label':'Pelanggan',id:'f-cust'});
  sel.addEventListener('change',()=>{if(sel.value==='__manual'){st.customer_id='';}else{st.customer_id=sel.value;st.manual=null;}});
  cbox.appendChild(h('div',{class:'row'},sel,h('button',{class:'btn',type:'button',onclick:quickAdd},'+ Baru')));
  if(edit&&iv.customer_id&&st.customer_id&&st.customer_id!==iv.customer_id)cbox.appendChild(h('p',{class:'sub'},'Pelanggan pada invoice akan diganti.'));}
 function quickAdd(){ui.sheet('Pelanggan baru',(b,close)=>A.custForm(b,null,async c=>{activeC.push(c);st.customer_id=c.customer_id;st.manual=null;close();drawCust();A.toast('Pelanggan ditambahkan');}));}
 drawCust();
 // --- item
 const ibox=h('div'),tot=h('div',{class:'card totals'});
 function itemCard(it,n){const c=h('div',{class:'card item-ed'});
  const ps=ui.select([['','Item manual / ketik sendiri']].concat(prods.map(p=>[p.product_id,p.name+' · '+rp(p.sell_price)])),it.product_id,{'aria-label':'Pilih dari katalog'});
  const nm=ui.text({value:it.name,placeholder:'Nama item','aria-label':'Nama item',maxlength:'200'}),ds=ui.text({value:it.description,placeholder:'Deskripsi (opsional)','aria-label':'Deskripsi item',maxlength:'500'});
  const q=ui.text({value:String(it.qty),inputmode:'decimal','aria-label':'Qty'}),un=ui.text({value:it.unit,'aria-label':'Satuan',maxlength:'20'});
  const pr=ui.money(it.unit_price,v=>{it.unit_price=v;totals();},{'aria-label':'Harga satuan'}),co=ui.money(it.cost_price===''?0:it.cost_price,null,{'aria-label':'Modal per satuan','placeholder':'kosong = belum diketahui'});
  if(it.cost_price===''||it.cost_price==null)co.value='';
  co.addEventListener('input',()=>{it.cost_price=co.value.trim()===''?'':ui.num(co.value);totals();});
  const line=h('b',{class:'line'},'');
  const upLine=()=>{line.textContent=rp(Math.round(it.qty*it.unit_price));};
  ps.addEventListener('change',()=>{const p=prods.find(x=>x.product_id===ps.value);it.product_id=ps.value;if(p){it.name=nm.value=p.name;it.description=ds.value=p.description||'';it.unit=un.value=p.unit||'pcs';pr.setNum(Number(p.sell_price)||0);it.unit_price=Number(p.sell_price)||0;
    const k=p.cost_price===''||p.cost_price==null?'':Number(p.cost_price);it.cost_price=k;co.value=k===''?'':ui.fmt(k);}totals();upLine();});
  nm.addEventListener('input',()=>{it.name=nm.value;});ds.addEventListener('input',()=>{it.description=ds.value;});un.addEventListener('input',()=>{it.unit=un.value;});
  q.addEventListener('input',()=>{it.qty=ui.num(q.value,true);totals();upLine();});pr.addEventListener('input',upLine);
  c.appendChild(h('div',{class:'row'},h('b',null,'Item '+(n+1)),st.items.length>1?h('button',{class:'linkbtn',type:'button',onclick:()=>{st.items.splice(n,1);drawItems();totals();}},'Hapus'):null));
  c.appendChild(ui.field('Dari katalog',ps));c.appendChild(ui.field('Nama item',nm));c.appendChild(ui.field('Deskripsi',ds));
  c.appendChild(h('div',{class:'grid3'},ui.field('Qty',q),ui.field('Satuan',un),ui.field('Harga satuan (Rp)',pr)));
  c.appendChild(ui.field('Modal per satuan (Rp, opsional)',co,'Hanya untuk laba internal; tidak pernah tampil di invoice pelanggan.'));
  c.appendChild(h('div',{class:'row'},h('span',{class:'sub'},'Subtotal baris'),line));upLine();return c;}
 function drawItems(){ibox.textContent='';st.items.forEach((it,n)=>ibox.appendChild(itemCard(it,n)));}
 wrap.appendChild(h('h2',{class:'sec'},'Item'));wrap.appendChild(ibox);drawItems();
 wrap.appendChild(h('button',{class:'btn',type:'button',onclick:()=>{st.items.push(blankItem());drawItems();totals();}},'+ Tambah item'));
 // --- biaya
 const dtSel=ui.select([['amount','Diskon (Rp)'],['percent','Diskon (%)']],st.dt,{'aria-label':'Jenis diskon'});
 const dvIn=st.dt==='percent'?ui.text({value:String(st.dv),inputmode:'decimal','aria-label':'Nilai diskon'}):ui.money(st.dv,null,{'aria-label':'Nilai diskon'});
 let dvEl=dvIn;const dvBox=h('div');dvBox.appendChild(dvEl);
 function bindDv(){dvEl.addEventListener('input',()=>{st.dv=st.dt==='percent'?ui.num(dvEl.value,true):ui.num(dvEl.value);totals();});}
 dtSel.addEventListener('change',()=>{st.dt=dtSel.value;st.dv=0;dvBox.textContent='';dvEl=st.dt==='percent'?ui.text({value:'0',inputmode:'decimal','aria-label':'Nilai diskon'}):ui.money(0,null,{'aria-label':'Nilai diskon'});dvBox.appendChild(dvEl);bindDv();totals();});bindDv();
 const taxIn=ui.text({value:String(st.tax),inputmode:'decimal','aria-label':'PPN persen'});taxIn.addEventListener('input',()=>{st.tax=ui.num(taxIn.value,true);totals();});
 const shIn=ui.money(st.ship,v=>{st.ship=v;totals();},{'aria-label':'Ongkir'}),xfIn=ui.money(st.xf,v=>{st.xf=v;totals();},{'aria-label':'Biaya tambahan'}),xlIn=ui.text({value:st.xl,placeholder:'Label (mis. Biaya desain)','aria-label':'Label biaya tambahan',maxlength:'50'});xlIn.addEventListener('input',()=>{st.xl=xlIn.value;});
 wrap.appendChild(h('h2',{class:'sec'},'Diskon & biaya'));
 wrap.appendChild(h('div',{class:'card'},h('div',{class:'grid2'},ui.field('Jenis diskon',dtSel),ui.field('Nilai diskon',dvBox)),h('div',{class:'grid2'},ui.field('PPN (%)',taxIn),ui.field('Ongkir (Rp)',shIn)),h('div',{class:'grid2'},ui.field('Biaya tambahan',xlIn),ui.field('Nominal (Rp)',xfIn))));
 wrap.appendChild(tot);
 function totals(){const t=calc(st.items.map(i=>({qty:i.qty,unit_price:i.unit_price,cost_price:i.cost_price===''?0:i.cost_price})),{discount_type:st.dt,discount_value:st.dv,tax_rate:st.tax,shipping_fee:st.ship,extra_fee:st.xf});st.t=t;tot.textContent='';
  const r=(a,b,c)=>tot.appendChild(h('div',{class:'row'+(c?' grand':'')},h('span',null,a),h('b',null,b)));r('Subtotal',rp(t.subtotal));if(t.discount)r('Diskon','− '+rp(t.discount));if(t.tax)r('PPN '+st.tax+'%',rp(t.tax));if(st.ship)r('Ongkir',rp(st.ship));if(st.xf)r(st.xl||'Biaya tambahan',rp(st.xf));r('Total',rp(t.grand_total),1);}
 totals();
 // --- tanggal & teks
 const isn=h('input',{type:'date',value:st.issue,'aria-label':'Tanggal terbit'}),dud=h('input',{type:'date',value:st.due,'aria-label':'Jatuh tempo'}),dl=h('input',{type:'date',value:st.deadline,'aria-label':'Deadline produksi'});
 isn.addEventListener('input',()=>{st.issue=isn.value;});dud.addEventListener('input',()=>{st.due=dud.value;});dl.addEventListener('input',()=>{st.deadline=dl.value;});
 const nt=ui.area(st.notes,{'aria-label':'Catatan',maxlength:'1000'}),tm=ui.area(st.terms,{rows:'4','aria-label':'Syarat dan ketentuan',maxlength:'2000'});nt.addEventListener('input',()=>{st.notes=nt.value;});tm.addEventListener('input',()=>{st.terms=tm.value;});
 wrap.appendChild(h('h2',{class:'sec'},'Tanggal'));wrap.appendChild(h('div',{class:'card'},h('div',{class:'grid2'},ui.field('Tanggal terbit',isn),ui.field('Jatuh tempo',dud)),ui.field('Deadline produksi (opsional)',dl)));
 wrap.appendChild(h('h2',{class:'sec'},'Catatan & syarat'));wrap.appendChild(h('div',{class:'card'},ui.field('Catatan untuk pelanggan',nt),ui.field('Syarat & ketentuan',tm)));
 // --- simpan
 function payload(){const p={items:st.items.map(i=>({item_id:i.item_id,product_id:i.product_id,name:i.name.trim(),description:i.description,unit:i.unit||'pcs',qty:i.qty,unit_price:i.unit_price,cost_price:i.cost_price})),
   issue_date:st.issue,due_date:st.due,discount_type:st.dt,discount_value:st.dv,tax_rate:st.tax,shipping_fee:st.ship,extra_fee_label:st.xl,extra_fee:st.xf,notes:st.notes,terms:st.terms,deadline_date:st.deadline};
  if(st.customer_id)p.customer_id=st.customer_id;else if(st.manual)Object.assign(p,st.manual);return p;}
 function check(){if(!st.customer_id&&!st.manual)return'Pilih pelanggan terlebih dahulu.';if(!st.issue||!st.due)return'Tanggal terbit dan jatuh tempo wajib diisi.';if(st.due<st.issue)return'Jatuh tempo tidak boleh sebelum tanggal terbit.';
  for(let i=0;i<st.items.length;i++){const it=st.items[i];if(!it.name.trim())return'Nama item '+(i+1)+' wajib diisi.';if(!(it.qty>0))return'Qty item '+(i+1)+' harus lebih dari 0.';}
  if(edit&&st.t.grand_total<st.paid)return'Total baru ('+rp(st.t.grand_total)+') lebih kecil dari pembayaran yang sudah tercatat ('+rp(st.paid)+').';return'';}
 async function save(kind,btn){const e=check();if(e){ui.banner(errBox,e);return;}ui.banner(errBox,'');const p=payload();
  await ui.run(btn,async()=>{let v;
   if(!edit){p.state=kind==='draft'?'Draft':'Issued';v=await api('invoices.create',p);}
   else{p.invoice_id=id;p.ver=st.ver;if(kind==='issue')p.issue=true;v=await api('invoices.save',p);}
   A.toast(kind==='draft'?'Draf disimpan':(edit&&kind==='save'?'Perubahan disimpan':'Invoice diterbitkan'));location.hash='#/invoice?id='+encodeURIComponent(v.invoice.invoice_id);},m=>ui.banner(errBox,m));}
 const bar=h('div',{class:'btnrow stick'});
 if(!edit||st.state==='Draft'){bar.appendChild(h('button',{class:'btn',type:'button',id:'b-draft',onclick:e=>save('draft',e.currentTarget)},'Simpan Draft'));bar.appendChild(h('button',{class:'btn pri',type:'button',id:'b-issue',onclick:e=>save('issue',e.currentTarget)},'Terbitkan'));}
 else bar.appendChild(h('button',{class:'btn pri',type:'button',id:'b-save',onclick:e=>save('save',e.currentTarget)},'Simpan Perubahan'));
 wrap.appendChild(bar);el.appendChild(wrap);}

// ---------------- DETAIL ----------------
async function vDetail(el,my){
 const id=A.param('id');if(!id){el.appendChild(A.empty('Invoice tidak dipilih',''));return;}
 A.skel(el);let v;try{v=await api('invoices.get',{invoice_id:id});}catch(e){if(my!==S.seq)return;el.textContent='';el.appendChild(h('div',{class:'banner',role:'alert'},e.message));return;}
 if(my!==S.seq)return;el.textContent='';draw(el,v,my);}
function draw(el,v,my){const iv=v.invoice,t=v.totals,owner=S.boot.user.role==='owner',errBox=h('div');el.textContent='';el.appendChild(errBox);
 const reload=async()=>{S.cache={};const n=await api('invoices.get',{invoice_id:iv.invoice_id});draw(el,n,my);};
 const act=async(btn,fn)=>{await ui.run(btn,async()=>{const n=await fn();S.cache={};draw(el,n,my);},m=>ui.banner(errBox,m));};
 el.appendChild(h('div',{class:'hero'},h('div',{class:'row'},h('div',null,h('div',{class:'sub'},iv.invoice_number),h('div',{class:'big',id:'d-cust'},iv.cust_name),iv.cust_org?h('div',{class:'sub'},iv.cust_org):null),pill(v.payment_status)),
  h('div',{class:'row',style:'margin-top:10px'},h('span',{class:'sub'},'Terbit '+fdate(iv.issue_date)+' · Jatuh tempo '+fdate(iv.due_date)),h('b',{class:'big',id:'d-total'},rp(t.grand_total)))));
 if(iv.state==='Cancelled')el.appendChild(h('div',{class:'banner'},'Invoice dibatalkan'+(iv.cancelled_reason?': '+iv.cancelled_reason:'')+'.'));
 if(iv.state==='Issued'){el.appendChild(h('div',{class:'kpis two'},h('div',{class:'kpi'},h('span',{class:'sub'},'Dibayar'),h('b',{id:'d-paid'},rp(v.paid))),h('div',{class:'kpi'},h('span',{class:'sub'},'Sisa'),h('b',{id:'d-bal'},rp(v.balance)))));}
 // tombol aksi
 const bar=h('div',{class:'btnrow wrapb'});
 const add=(txt,cls,fn,id)=>bar.appendChild(h('button',{class:'btn '+(cls||''),type:'button',id:id,onclick:fn},txt));
 if(iv.state==='Issued'&&v.balance>0)add('Catat Pembayaran','pri',()=>payForm(v,reload),'b-pay');
 if(iv.state==='Draft')add('Terbitkan','pri',e=>act(e.currentTarget,()=>api('invoices.issue',{invoice_id:iv.invoice_id,ver:v.ver})),'b-issue');
 if(iv.state!=='Cancelled')add('Ubah','',()=>{location.hash='#/invoice-edit?id='+encodeURIComponent(iv.invoice_id);},'b-edit');
 add('Duplikat','',()=>{location.hash='#/invoice-edit?dup='+encodeURIComponent(iv.invoice_id);},'b-dup');
 if(iv.state==='Issued')add('Batalkan Invoice','danger',async e=>{const btn=e.currentTarget;
  if(v.paid>0){ui.banner(errBox,'Invoice masih punya pembayaran valid ('+rp(v.paid)+'). Batalkan (void) pembayarannya dulu, baru invoice bisa dibatalkan.');return;}
  const r=await ui.confirm({title:'Batalkan invoice?',message:iv.invoice_number+' akan ditandai Cancelled. Data tidak dihapus.',reason:{label:'Alasan pembatalan (wajib)',required:true},danger:true,okText:'Batalkan Invoice',cancelText:'Kembali'});if(!r)return;
  act(btn,()=>api('invoices.cancel',{invoice_id:iv.invoice_id,ver:v.ver,reason:r.reason}));},'b-cancel');
 if(iv.state==='Draft')add('Hapus Draft','danger',async()=>{const r=await ui.confirm({title:'Hapus draf?',message:'Draf '+iv.invoice_number+' akan dihapus. Nomor invoice ini tidak dipakai ulang.',danger:true,okText:'Hapus Draft',cancelText:'Kembali'});if(!r)return;
  try{await api('invoices.delete_draft',{invoice_id:iv.invoice_id,ver:v.ver});A.toast('Draf dihapus');location.hash='#/home';}catch(e){ui.banner(errBox,e.message);}},'b-del');
 el.appendChild(bar);
 if(iv.state!=='Cancelled')el.appendChild(h('button',{class:'btn',type:'button',id:'b-pdf',style:'margin:0 0 12px',onclick:()=>A.shareSheet(v)},'PDF & WhatsApp'));
 // item
 el.appendChild(h('h2',{class:'sec'},'Item'));
 v.items.forEach(i=>el.appendChild(h('div',{class:'item'},h('div',{class:'row'},h('b',null,i.name),h('b',null,rp(Math.round(i.qty*i.unit_price)))),i.description?h('div',{class:'sub'},i.description):null,h('div',{class:'sub'},i.qty+' '+i.unit+' × '+rp(i.unit_price)))));
 const tt=h('div',{class:'card totals'});const r=(a,b,c)=>tt.appendChild(h('div',{class:'row'+(c?' grand':'')},h('span',null,a),h('b',null,b)));
 r('Subtotal',rp(t.subtotal));if(t.discount)r('Diskon'+(iv.discount_type==='percent'?' '+iv.discount_value+'%':''),'− '+rp(t.discount));if(t.tax)r('PPN '+iv.tax_rate+'%',rp(t.tax));if(Number(iv.shipping_fee))r('Ongkir',rp(iv.shipping_fee));if(Number(iv.extra_fee))r(iv.extra_fee_label||'Biaya tambahan',rp(iv.extra_fee));r('Total',rp(t.grand_total),1);el.appendChild(tt);
 // pembayaran
 el.appendChild(h('h2',{class:'sec'},'Pembayaran'));
 if(!v.payments.length)el.appendChild(h('p',{class:'sub'},'Belum ada pembayaran.'));
 v.payments.slice().sort((a,b)=>String(a.payment_date).localeCompare(String(b.payment_date))).forEach(p=>{const ok=p.status==='valid';
  el.appendChild(h('div',{class:'item pay'+(ok?'':' void')},h('div',{class:'row'},h('div',null,h('b',null,rp(p.amount)),h('span',{class:'sub'},' · '+p.payment_type)),ok?null:h('span',{class:'pill p-cancel'},'Dibatalkan')),
   h('div',{class:'sub'},fdate(p.payment_date)+' · '+p.method+(p.reference_no?' · '+p.reference_no:'')),p.notes?h('div',{class:'sub'},p.notes):null,!ok&&p.void_reason?h('div',{class:'sub'},'Alasan: '+p.void_reason):null,
   ok&&iv.state!=='Cancelled'?h('button',{class:'linkbtn',type:'button','data-void':p.payment_id,onclick:async e=>{const btn=e.currentTarget,r=await ui.confirm({title:'Batalkan pembayaran?',message:rp(p.amount)+' ('+p.method+') akan ditandai dibatalkan. Catatan tetap tersimpan.',reason:{label:'Alasan pembatalan (wajib)',required:true},danger:true,okText:'Batalkan Pembayaran',cancelText:'Kembali'});if(!r)return;act(btn,()=>api('payments.void',{payment_id:p.payment_id,reason:r.reason}));}},'Batalkan pembayaran'):null));});
 // status order (hanya baca; pengelolaan di R3)
 if(v.order)el.appendChild(h('div',{class:'card'},h('div',{class:'sub'},'Status pesanan'),h('div',{class:'row'},h('b',{id:'d-order'},v.order.fulfillment_status),v.order.deadline_date?h('span',{class:'sub'},'Deadline '+fdate(v.order.deadline_date)):null),h('div',{class:'sub'},'Pengelolaan status & pengiriman hadir di rilis berikutnya.')));
 if(iv.notes)el.appendChild(h('div',{class:'card'},h('div',{class:'sub'},'Catatan'),h('div',{class:'pre'},iv.notes)));
 // laba internal
 if(owner&&iv.state!=='Cancelled'){const pr=v.profit;el.appendChild(h('div',{class:'card internal'},h('div',{class:'row'},h('b',null,'Laba internal'),h('span',{class:'pill p-draft'},'Tidak tampil di PDF')),
  pr.revenue_costed>0?h('div',null,h('div',{class:'row'},h('span',null,'Laba kotor'),h('b',{id:'d-profit'},rp(pr.gross_profit))),h('div',{class:'row'},h('span',null,'Margin'),h('b',null,pr.margin_pct===null?'—':pr.margin_pct+'%'))):h('div',{class:'sub'},'Belum ada item dengan harga modal.'),
  pr.uncosted_lines>0?h('div',{class:'sub'},pr.uncosted_lines+' item belum punya modal dan tidak dihitung ('+pr.cost_coverage_pct+'% omzet bermodal).'):null));}
}
function payForm(v,reload){const iv=v.invoice;ui.sheet('Catat pembayaran',(b,close)=>{const err=h('div');b.appendChild(err);
 b.appendChild(h('div',{class:'sub'},'Sisa tagihan '+rp(v.balance)));
 let amt=0;const am=ui.money(0,n=>{amt=n;},{'aria-label':'Nominal pembayaran',id:'p-amt'});
 const quick=h('div',{class:'chips'},h('button',{class:'chip',type:'button',id:'p-full',onclick:()=>am.setNum(v.balance)},'Lunasi sisa'),h('button',{class:'chip',type:'button',onclick:()=>am.setNum(Math.round(v.balance/2))},'50% sisa'));
 const mt=ui.select(METHODS.map(m=>[m,m]),'Bank Transfer',{'aria-label':'Metode'}),dt=h('input',{type:'date',value:ui.today(),'aria-label':'Tanggal bayar'}),rf=ui.text({placeholder:'No. referensi (opsional)','aria-label':'Referensi',maxlength:'100'}),nt=ui.text({placeholder:'Catatan (opsional)','aria-label':'Catatan',maxlength:'300'});
 b.appendChild(ui.field('Nominal (Rp)',am));b.appendChild(quick);b.appendChild(h('div',{class:'grid2'},ui.field('Metode',mt),ui.field('Tanggal bayar',dt)));b.appendChild(ui.field('Referensi',rf));b.appendChild(ui.field('Catatan',nt));
 b.appendChild(h('div',{class:'sub'},v.paid===0?'Pembayaran pertama dicatat sebagai DP, pelunasan bila sama dengan sisa.':'Dicatat sebagai cicilan, atau pelunasan bila sama dengan sisa.'));
 const go=h('button',{class:'btn pri',type:'button',id:'p-save'},'Simpan Pembayaran');
 go.addEventListener('click',()=>{amt=ui.num(am.value);if(!(amt>0)){ui.banner(b,'Nominal harus lebih dari 0.');return;}if(amt>v.balance){ui.banner(b,'Nominal melebihi sisa tagihan ('+rp(v.balance)+').');return;}
  ui.run(go,async()=>{await api('payments.add',{invoice_id:iv.invoice_id,amount:amt,method:mt.value,payment_date:dt.value,reference_no:rf.value,notes:nt.value});close();A.toast('Pembayaran dicatat');await reload();},m=>ui.banner(b,m));});
 b.appendChild(h('div',{class:'btnrow'},h('button',{class:'btn',type:'button',onclick:close},'Batal'),go));});}

A.ROUTES['invoice-edit']={t:'Editor Invoice',nav:'home',back:()=>{const i=A.param('id');return i?'invoice?id='+encodeURIComponent(i):'home';},v:vEdit};
A.ROUTES.invoice={t:'Invoice',nav:'home',back:'home',v:vDetail};
A.invoiceList=function(){};
});
