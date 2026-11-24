/* AeneFlow - invoice.js: editor invoice, detail invoice, pembayaran (DP/cicilan/pelunasan), batal. Semua teks lewat textContent. */
(window.AeneModules=window.AeneModules||[]).push(function(A){'use strict';
const h=A.h,ui=A.ui,rp=A.rp,fdate=A.fdate,S=A.S,api=A.api,calc=window.AeneCalc.calcTotals;
const METHODS=['BCA','BRI','Mandiri'];
const PILL={Paid:['p-paid','Lunas'],'Partially Paid':['p-part','Dibayar Sebagian'],Unpaid:['p-unpaid','Belum Dibayar'],Overdue:['p-over','Jatuh Tempo'],Draft:['p-draft','Draft'],Cancelled:['p-cancel','Dibatalkan']};
const pill=s=>{const p=PILL[s]||['p-draft',s];return h('span',{class:'pill '+p[0]},p[1]);};
const blankItem=()=>({item_id:'',product_id:'',name:'',description:'',unit:'pcs',qty:1,unit_price:0,cost_price:'',set:false,comps:[]});
// Pemilih produk dengan kolom cari (katalog banyak): ketik sebagian nama/kategori, semua kata harus cocok. multi=true: sheet tetap terbuka untuk menambah beberapa isi set.
function pickProduct(prods,onPick,multi){ui.sheet(multi?'Tambah isi set':'Pilih dari katalog',(b,close)=>{
 const q=h('input',{type:'search',class:'search',placeholder:'Cari nama produk atau kategori…','aria-label':'Cari produk',id:'pp-q',autocomplete:'off',autocapitalize:'off',enterkeyhint:'search'}),list=h('div',{class:'pp-list',id:'pp-list'}),cnt=h('div',{class:'sub',id:'pp-n'},'');let added=0;
 const draw=()=>{const t=q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);list.textContent='';let n=0,more=false;
  for(const p of prods){const hay=(p.name+' '+(p.category||'')+' '+(p.sku||'')).toLowerCase();if(!t.every(w=>hay.indexOf(w)>=0))continue;if(n>=60){more=true;break;}n++;
   list.appendChild(h('button',{type:'button',class:'pp-it','data-id':p.product_id,onclick:e=>{if(multi){onPick(p);added++;cnt.textContent=added+' isi ditambahkan';e.currentTarget.classList.add('pp-done');}else{close();onPick(p);}}},h('span',{class:'pp-n'},p.name),h('span',{class:'sub'},(p.category?p.category+' · ':'')+rp(p.sell_price))));}
  if(!n)list.appendChild(h('div',{class:'sub pp-empty'},'Tidak ada produk yang cocok.'));else if(more)list.appendChild(h('div',{class:'sub pp-empty'},'Ketik lebih spesifik untuk mempersempit daftar.'));};
 q.addEventListener('input',draw);b.appendChild(q);b.appendChild(cnt);b.appendChild(list);if(multi)b.appendChild(h('div',{class:'btnrow'},h('button',{class:'btn pri',type:'button',id:'pp-done',onclick:close},'Selesai')));draw();setTimeout(()=>{try{q.focus();}catch(e){}},60);});}
const setNameNext=items=>{const used={};items.forEach(i=>{const m=/^Set Hampers ([A-Z])$/.exec(String(i.name||'').trim());if(m)used[m[1]]=1;});for(let c=65;c<91;c++){const L=String.fromCharCode(c);if(!used[L])return'Set Hampers '+L;}return'Set Hampers';};
const blankSet=name=>({item_id:'',product_id:'',name:name||'',description:'',unit:'set',qty:1,unit_price:0,cost_price:'',set:true,comps:[]});
const setCostOf=cs=>{let t=0;for(const c of cs){if(c.cost_price===''||c.cost_price==null)return'';t+=(Number(c.qty)||0)*Number(c.cost_price);}return cs.length?Math.round(t):'';};
function setting(k,d){const v=S.boot&&S.boot.settings?S.boot.settings[k]:undefined;return v===undefined||v===''?d:v;}

// ---------------- EDITOR ----------------
async function vEdit(el,my){
 A.skel(el);const id=A.param('id'),dup=A.param('dup'),pre=A.param('cust');
 const pk=(id||dup)?A.peekDetail(id||dup):null;// salinan di memori (sudah dimuat di latar belakang): editor terbuka seketika
 const [custs,prods,cur]=await Promise.all([api('customers.list'),api('products.list'),id||dup?(pk?Promise.resolve(pk):api('invoices.get',{invoice_id:id||dup})):Promise.resolve(null)]);if(my!==S.seq)return;el.textContent='';
 const edit=!!id,iv=cur?cur.invoice:null;
 if(edit&&iv.state==='Cancelled'){el.appendChild(A.empty('Invoice dibatalkan','Invoice yang sudah dibatalkan tidak bisa diubah.'));return;}
 const st={ver:cur?cur.ver:'',state:edit?iv.state:'New',paid:cur&&edit?cur.paid:0,hasShip:false,
  customer_id:iv?(iv.customer_id||''):(pre||''),manual:iv&&!iv.customer_id?{cust_name:iv.cust_name,cust_org:iv.cust_org,cust_whatsapp:iv.cust_whatsapp,cust_email:iv.cust_email,cust_address:iv.cust_address}:null,
  items:cur?cur.items.map(i=>({item_id:edit?i.item_id:'',product_id:i.product_id||'',name:i.name,description:i.description||'',unit:i.unit||'pcs',qty:Number(i.qty),unit_price:Number(i.unit_price),cost_price:(i.cost_price===''||i.cost_price==null)?'':Number(i.cost_price),set:A.compsOf(i).length>0,comps:A.compsOf(i).map(c=>({product_id:c.product_id||'',name:c.name||'',qty:Number(c.qty)||1,unit:c.unit||'pcs',unit_price:Number(c.unit_price)||0,cost_price:(c.cost_price===''||c.cost_price==null)?'':Number(c.cost_price)}))})):[blankItem()],
  dt:iv?iv.discount_type:'amount',dv:iv?Number(iv.discount_value):0,tax:iv?Number(iv.tax_rate):Number(setting('tax_default_rate',0)),ship:iv?Number(iv.shipping_fee):0,ex:iv?A.extrasOf(iv).map(e=>({name:e.name,qty:e.qty,unit_price:e.unit_price})):[],xf:0,
  notes:iv?iv.notes||'':'',terms:iv&&edit?iv.terms||'':String(setting('terms_and_conditions','')),issue:edit?iv.issue_date:ui.today(),due:edit?iv.due_date:'',deadline:cur&&cur.order&&edit?cur.order.deadline_date||'':''};
 if(!edit)st.due=ui.addDays(st.issue,Number(setting('default_due_days',7)));
 let activeC=custs.slice(),manualOK=!!st.manual;
 const wrap=h('div',{class:'editor'}),errBox=h('div');
 if(pk&&edit)api('invoices.get',{invoice_id:id}).then(n=>{if(my===S.seq&&n&&String(n.ver)!==String(pk.ver))ui.banner(errBox,'Invoice ini baru saja diubah dari perangkat lain. Buka ulang halaman ini agar tidak menimpa perubahan itu.');}).catch(()=>{});
 wrap.appendChild(errBox);
 wrap.appendChild(h('h2',{class:'sec'},edit?'Ubah '+iv.invoice_number:(dup?'Duplikat invoice':'Invoice baru')));
 if(edit&&st.paid>0)wrap.appendChild(h('div',{class:'note'},'Sudah ada pembayaran '+rp(st.paid)+'. Total baru tidak boleh lebih kecil dari itu.'));
 // --- pelanggan
 const cbox=h('div',{class:'card'});wrap.appendChild(cbox);
 function drawCust(){cbox.textContent='';cbox.appendChild(h('div',{class:'sub'},'Pelanggan'));
  const sel=ui.select([['','— Pilih pelanggan —']].concat(activeC.map(c=>[c.customer_id,c.name+(c.organization?' · '+c.organization:'')])).concat(st.manual&&!st.customer_id?[['__manual',st.manual.cust_name+' (tanpa data pelanggan)']]:[]),st.customer_id||(st.manual?'__manual':''),{'aria-label':'Pelanggan',id:'f-cust'});
  sel.addEventListener('change',()=>{if(sel.value==='__manual'){st.customer_id='';}else{st.customer_id=sel.value;st.manual=null;st.refreshCust=false;}drawCust();});// gambar ulang supaya kartu info ikut berganti
  const cur1=st.customer_id?activeC.find(c=>c.customer_id===st.customer_id):null;
  cbox.appendChild(h('div',{class:'row'},sel,h('button',{class:'btn',type:'button',onclick:quickAdd},'+ Baru')));
  // info pelanggan terpilih + tombol Ubah (memperbarui data pelanggan; invoice ini ikut memakai data barunya saat disimpan)
  if(cur1){cbox.appendChild(h('div',{class:'cinfo',id:'f-cinfo'},h('div',{class:'cname'},cur1.name+(cur1.organization?' · '+cur1.organization:'')),h('div',{class:'sub',id:'f-cwa'},cur1.whatsapp?'WhatsApp '+cur1.whatsapp:'WhatsApp belum diisi'),h('div',{class:'sub',id:'f-caddr'},(function(){const a=String(cur1.address||'').trim(),t=String(cur1.city||'').trim(),r=!t||a.toLowerCase().indexOf(t.toLowerCase())>=0?a:(a?a+', '+t:t);return r||'Alamat belum diisi';})())));
   cbox.appendChild(h('div',{class:'btnrow'},h('button',{class:'btn',type:'button',id:'f-cust-edit',onclick:()=>editCust(cur1)},'Ubah data pelanggan')));
   if(st.refreshCust)cbox.appendChild(h('p',{class:'sub',id:'f-crefresh'},'Data pelanggan diperbarui. Tekan Simpan agar invoice ini memakai data terbaru.'));}
  if(edit&&iv.customer_id&&st.customer_id&&st.customer_id!==iv.customer_id)cbox.appendChild(h('p',{class:'sub'},'Pelanggan pada invoice akan diganti.'));}
 function editCust(c){ui.sheet('Ubah pelanggan',(b,close)=>A.custForm(b,c,async u=>{const i=activeC.findIndex(x=>x.customer_id===u.customer_id);if(i>=0)activeC[i]=u;st.refreshCust=true;close();drawCust();A.toast('Data pelanggan disimpan');}));}
 function quickAdd(){ui.sheet('Pelanggan baru',(b,close)=>A.custForm(b,null,async c=>{activeC.push(c);st.customer_id=c.customer_id;st.manual=null;close();drawCust();A.toast('Pelanggan ditambahkan');}));}
 drawCust();
 // --- item
 const ibox=h('div'),tot=h('div',{class:'card totals'});
 function setCard(it,n){const c=h('div',{class:'card item-ed set-ed'});
  const nm=ui.text({value:it.name,placeholder:'Nama set, mis. Set Hampers A','aria-label':'Nama set',maxlength:'200'});
  const q=ui.text({value:String(it.qty),inputmode:'decimal','aria-label':'Jumlah set'});
  const pr=ui.money(it.unit_price,v=>{it.unit_price=v;totals();help();upLine();},{'aria-label':'Harga per set'});
  const line=h('b',{class:'line'},''),upLine=()=>{line.textContent=rp(Math.round(it.qty*it.unit_price));};
  const list=h('div',{class:'set-list'}),helpBox=h('div',{class:'card set-help'});
  const sumCat=()=>Math.round(it.comps.reduce((a,x)=>a+(Number(x.qty)||0)*(Number(x.unit_price)||0),0));
  function help(){const cat=sumCat(),cost=setCostOf(it.comps);helpBox.textContent='';
   helpBox.appendChild(h('div',{class:'row'},h('span',{class:'sub'},'Jumlah harga katalog isi set'),h('b',null,rp(cat))));
   helpBox.appendChild(h('div',{class:'row'},h('span',{class:'sub'},'Selisih dengan harga set'),h('b',null,rp(it.unit_price-cat))));
   helpBox.appendChild(h('div',{class:'row'},h('span',{class:'sub'},'Modal per set'),h('b',null,cost===''?'belum lengkap':rp(cost))));
   if(cost!=='')helpBox.appendChild(h('div',{class:'row'},h('span',{class:'sub'},'Laba per set'),h('b',null,rp(it.unit_price-cost))));
   if(cat>0)helpBox.appendChild(h('button',{class:'linkbtn',type:'button',onclick:()=>{it.unit_price=cat;pr.setNum(cat);totals();help();upLine();}},'Pakai jumlah harga katalog'));}
  function drawComps(){list.textContent='';it.comps.forEach((x,k)=>{
   const cn=ui.text({value:x.name,placeholder:'Nama isi','aria-label':'Nama isi set',maxlength:'200'}),cq=ui.text({value:String(x.qty),inputmode:'decimal','aria-label':'Jumlah per set'}),cu=ui.text({value:x.unit||'pcs','aria-label':'Satuan isi',maxlength:'20'});
   cn.addEventListener('input',()=>{x.name=cn.value;});cu.addEventListener('input',()=>{x.unit=cu.value;});cq.addEventListener('input',()=>{x.qty=ui.num(cq.value,true);totals();help();});
   list.appendChild(h('div',{class:'set-comp'},h('div',{class:'row'},h('b',null,'Isi '+(k+1)),h('button',{class:'linkbtn',type:'button',onclick:()=>{it.comps.splice(k,1);drawComps();totals();help();}},'Hapus')),
    ui.field('Nama',cn),h('div',{class:'grid2'},ui.field('Jumlah per set',cq),ui.field('Satuan',cu))));});}
  const add=h('button',{type:'button',class:'btn pickbtn','aria-label':'Tambah isi dari katalog',id:'set-add'},'+ Tambah isi dari katalog');
  add.addEventListener('click',()=>pickProduct(prods,p=>{
   it.comps.push({product_id:p.product_id,name:p.name,qty:1,unit:p.unit||'pcs',unit_price:Number(p.sell_price)||0,cost_price:(p.cost_price===''||p.cost_price==null)?'':Number(p.cost_price)});drawComps();totals();help();},true));
  nm.addEventListener('input',()=>{it.name=nm.value;});q.addEventListener('input',()=>{it.qty=ui.num(q.value,true);totals();upLine();});
  c.appendChild(h('div',{class:'row'},h('b',null,'Set '+(n+1)),st.items.length>1?h('button',{class:'linkbtn',type:'button',onclick:()=>{st.items.splice(n,1);drawItems();totals();}},'Hapus'):null));
  c.appendChild(ui.field('Nama set',nm));c.appendChild(h('div',{class:'grid2'},ui.field('Jumlah set',q),ui.field('Harga per set (Rp)',pr)));
  c.appendChild(h('div',{class:'sub'},'Isi 1 set'));c.appendChild(list);c.appendChild(add);
  c.appendChild(h('button',{class:'linkbtn',type:'button',onclick:()=>{it.comps.push({product_id:'',name:'',qty:1,unit:'pcs',unit_price:0,cost_price:''});drawComps();help();}},'+ Isi manual'));
  c.appendChild(helpBox);c.appendChild(h('div',{class:'row'},h('span',{class:'sub'},'Subtotal baris'),line));drawComps();help();upLine();return c;}
 function itemCard(it,n){if(it.set)return setCard(it,n);const c=h('div',{class:'card item-ed'});
  const psCur=()=>{const p=prods.find(x=>x.product_id===it.product_id);return p?p.name:'Item manual / ketik sendiri';},ps=h('button',{type:'button',class:'btn pickbtn','aria-label':'Pilih dari katalog',id:'it-pick'+n},psCur()+'  ▾');
  const nm=ui.text({value:it.name,placeholder:'Nama item','aria-label':'Nama item',maxlength:'200'}),ds=ui.text({value:it.description,placeholder:'Deskripsi (opsional)','aria-label':'Deskripsi item',maxlength:'500'});
  const q=ui.text({value:String(it.qty),inputmode:'decimal','aria-label':'Qty'}),un=ui.text({value:it.unit,'aria-label':'Satuan',maxlength:'20'});
  const pr=ui.money(it.unit_price,v=>{it.unit_price=v;totals();},{'aria-label':'Harga satuan'}),co=ui.money(it.cost_price===''?0:it.cost_price,null,{'aria-label':'Modal per satuan','placeholder':'kosong = belum diketahui'});
  if(it.cost_price===''||it.cost_price==null)co.value='';
  co.addEventListener('input',()=>{it.cost_price=co.value.trim()===''?'':ui.num(co.value);totals();});
  const line=h('b',{class:'line'},'');
  const upLine=()=>{line.textContent=rp(Math.round(it.qty*it.unit_price));};
  ps.addEventListener('click',()=>pickProduct(prods,p=>{it.product_id=p.product_id;ps.textContent=psCur()+'  ▾';{it.name=nm.value=p.name;it.description=ds.value=p.description||'';it.unit=un.value=p.unit||'pcs';pr.setNum(Number(p.sell_price)||0);it.unit_price=Number(p.sell_price)||0;
    const k=p.cost_price===''||p.cost_price==null?'':Number(p.cost_price);it.cost_price=k;co.value=k===''?'':ui.fmt(k);}totals();upLine();}));
  nm.addEventListener('input',()=>{it.name=nm.value;});ds.addEventListener('input',()=>{it.description=ds.value;});un.addEventListener('input',()=>{it.unit=un.value;});
  q.addEventListener('input',()=>{it.qty=ui.num(q.value,true);totals();upLine();});pr.addEventListener('input',upLine);
  c.appendChild(h('div',{class:'row'},h('b',null,'Item '+(n+1)),st.items.length>1?h('button',{class:'linkbtn',type:'button',onclick:()=>{st.items.splice(n,1);drawItems();totals();}},'Hapus'):null));
  c.appendChild(ui.field('Dari katalog',ps));c.appendChild(ui.field('Nama item',nm));c.appendChild(ui.field('Deskripsi',ds));
  c.appendChild(h('div',{class:'grid3'},ui.field('Qty',q),ui.field('Satuan',un),ui.field('Harga satuan (Rp)',pr)));
  c.appendChild(ui.field('Modal per satuan (Rp, opsional)',co,'Hanya untuk laba internal; tidak pernah tampil di invoice pelanggan.'));
  c.appendChild(h('div',{class:'row'},h('span',{class:'sub'},'Subtotal baris'),line));upLine();return c;}
 function drawItems(){ibox.textContent='';st.items.forEach((it,n)=>ibox.appendChild(itemCard(it,n)));}
 wrap.appendChild(h('h2',{class:'sec'},'Item'));wrap.appendChild(ibox);drawItems();
 wrap.appendChild(h('div',{class:'grid2'},h('button',{class:'btn',type:'button',onclick:()=>{st.items.push(blankItem());drawItems();totals();}},'+ Tambah item'),h('button',{class:'btn',type:'button',onclick:()=>{const f=st.items[0];if(st.items.length===1&&f&&!f.set&&!f.name.trim()&&!f.product_id&&!f.unit_price&&!f.description)st.items[0]=blankSet(setNameNext(st.items.slice(1)));else st.items.push(blankSet(setNameNext(st.items)));drawItems();totals();}},'+ Tambah Set')));
 // --- biaya
 const dtSel=ui.select([['amount','Diskon (Rp)'],['percent','Diskon (%)']],st.dt,{'aria-label':'Jenis diskon'});
 const dvIn=st.dt==='percent'?ui.text({value:String(st.dv),inputmode:'decimal','aria-label':'Nilai diskon'}):ui.money(st.dv,null,{'aria-label':'Nilai diskon'});
 let dvEl=dvIn;const dvBox=h('div');dvBox.appendChild(dvEl);
 function bindDv(){dvEl.addEventListener('input',()=>{st.dv=st.dt==='percent'?ui.num(dvEl.value,true):ui.num(dvEl.value);totals();});}
 dtSel.addEventListener('change',()=>{st.dt=dtSel.value;st.dv=0;dvBox.textContent='';dvEl=st.dt==='percent'?ui.text({value:'0',inputmode:'decimal','aria-label':'Nilai diskon'}):ui.money(0,null,{'aria-label':'Nilai diskon'});dvBox.appendChild(dvEl);bindDv();totals();});bindDv();
 const taxIn=ui.text({value:String(st.tax),inputmode:'decimal','aria-label':'PPN persen'});taxIn.addEventListener('input',()=>{st.tax=ui.num(taxIn.value,true);totals();});
 const shIn=ui.money(st.ship,v=>{st.ship=v;totals();},{'aria-label':'Ongkir'});
 const exBox=h('div',{id:'ex-box'});
 wrap.appendChild(h('h2',{class:'sec'},'Diskon & biaya'));
 wrap.appendChild(h('div',{class:'card'},h('div',{class:'grid2'},ui.field('Jenis diskon',dtSel),ui.field('Nilai diskon',dvBox)),h('div',{class:'grid2'},ui.field('PPN (%)',taxIn),ui.field('Ongkir (Rp)',shIn)),h('div',{class:'fl',style:'margin-top:10px'},'Biaya tambahan'),exBox));
 wrap.appendChild(tot);
 const exSum=()=>{st.xf=st.ex.reduce((s,l)=>s+exTot(l),0);};
 function drawEx(focusLast){exBox.textContent='';
  st.ex.forEach((l,i)=>{const sub=h('b',{class:'ex-sub'},rp(exTot(l)));
   const nm=ui.text({value:l.name,placeholder:'Nama biaya','aria-label':'Nama biaya '+(i+1),maxlength:'60'});nm.addEventListener('input',()=>{l.name=nm.value;totals();});
   const pr=ui.money(l.unit_price,v=>{l.unit_price=v;sub.textContent=rp(exTot(l));totals();},{'aria-label':'Harga satuan '+(i+1)});
   const q=h('input',{type:'text',inputmode:'decimal',autocomplete:'off',placeholder:'Jumlah','aria-label':'Jumlah '+(i+1),value:l.qty?String(l.qty):'','data-ex-qty':String(i)});q.addEventListener('input',()=>{l.qty=ui.num(q.value,true);sub.textContent=rp(exTot(l));totals();});
   exBox.appendChild(h('div',{class:'exrow'},h('label',{class:'fld'},nm),h('div',{class:'exgrid'},ui.field('Harga (Rp)',pr),ui.field('Jumlah',q),h('div',{class:'exsub'},sub)),h('button',{type:'button',class:'x-del','aria-label':'Hapus biaya '+(i+1),onclick:()=>{st.ex.splice(i,1);drawEx();totals();}},'Hapus')));});
  const cat=A.catalogOf(S.boot&&S.boot.settings),sel=h('select',{id:'ex-add','aria-label':'Tambah biaya tambahan'},h('option',{value:''},st.ex.length?'+ Tambah biaya lain':'Pilih biaya…'),...cat.map((c,j)=>h('option',{value:String(j)},c.name+' — '+rp(c.price))),h('option',{value:'x'},'+ Lainnya (isi sendiri)'));
  sel.addEventListener('change',()=>{const v=sel.value;if(v==='')return;if(st.ex.length>=10){A.toast('Maksimal 10 biaya tambahan.');sel.value='';return;}const c=v==='x'?null:cat[Number(v)];st.ex.push({name:c?c.name:'',qty:0,unit_price:c?Number(c.price):0});drawEx(true);totals();});
  exBox.appendChild(h('label',{class:'fld exadd'},sel));
  if(focusLast){const qs=exBox.querySelectorAll('[data-ex-qty]');const last=qs[qs.length-1];if(last)setTimeout(()=>{try{last.focus();}catch(e){}},50);}}
 function totals(){exSum();const t=calc(st.items.map(i=>({qty:i.qty,unit_price:i.unit_price,cost_price:(i.set?setCostOf(i.comps):i.cost_price)===''?0:(i.set?setCostOf(i.comps):i.cost_price)})),{discount_type:st.dt,discount_value:st.dv,tax_rate:st.tax,shipping_fee:st.ship,extra_fee:st.xf});st.t=t;tot.textContent='';
  const r=(a,b,c)=>tot.appendChild(h('div',{class:'row'+(c?' grand':'')},h('span',null,a),h('b',null,b)));r('Subtotal',rp(t.subtotal));if(t.discount)r('Diskon','− '+rp(t.discount));if(t.tax)r('PPN '+st.tax+'%',rp(t.tax));if(st.ship)r('Ongkir',rp(st.ship));st.ex.forEach(l=>{if(exTot(l))r((l.name||'Biaya tambahan')+' ('+l.qty+' × '+rp(l.unit_price)+')',rp(exTot(l)));});r('Total',rp(t.grand_total),1);}
 drawEx();totals();
 // --- tanggal & teks
 const isn=h('input',{type:'date',value:st.issue,'aria-label':'Tanggal terbit'}),dl=h('input',{type:'date',value:st.deadline,'aria-label':'Deadline produksi'});
 isn.addEventListener('input',()=>{st.issue=isn.value;st.due=isn.value;});dl.addEventListener('input',()=>{st.deadline=dl.value;});
 const nt=ui.area(st.notes,{'aria-label':'Catatan',maxlength:'1000'}),tm=ui.area(st.terms,{rows:'4','aria-label':'Syarat dan ketentuan',maxlength:'2000'});nt.addEventListener('input',()=>{st.notes=nt.value;});tm.addEventListener('input',()=>{st.terms=tm.value;});
 wrap.appendChild(h('h2',{class:'sec'},'Tanggal'));wrap.appendChild(h('div',{class:'card'},ui.field('Tanggal terbit',isn),ui.field('Deadline produksi (opsional)',dl)));
 wrap.appendChild(h('h2',{class:'sec'},'Catatan & syarat'));wrap.appendChild(h('div',{class:'card'},ui.field('Catatan untuk pelanggan',nt),ui.field('Syarat & ketentuan',tm)));
 // --- simpan
 function payload(){const p={items:st.items.map(i=>({item_id:i.item_id,product_id:i.product_id,name:i.name.trim(),description:i.description,unit:i.set?'set':(i.unit||'pcs'),qty:i.qty,unit_price:i.unit_price,cost_price:i.set?setCostOf(i.comps):i.cost_price,components:i.set?i.comps.map(c=>({product_id:c.product_id,name:c.name.trim(),qty:c.qty,unit:c.unit||'pcs',unit_price:c.unit_price,cost_price:c.cost_price})):undefined})),
   issue_date:st.issue,due_date:st.issue,discount_type:st.dt,discount_value:st.dv,tax_rate:st.tax,shipping_fee:st.ship,extras:st.ex.map(l=>({name:l.name.trim(),qty:l.qty,unit_price:l.unit_price})),notes:st.notes,terms:st.terms,deadline_date:st.deadline};
  if(st.customer_id){p.customer_id=st.customer_id;if(st.refreshCust)p.refresh_customer=true;}else if(st.manual)Object.assign(p,st.manual);return p;}
 function check(){if(!st.customer_id&&!st.manual)return'Pilih pelanggan terlebih dahulu.';if(!st.issue)return'Tanggal terbit wajib diisi.';
  for(let i=0;i<st.items.length;i++){const it=st.items[i];if(!it.name.trim())return'Nama item '+(i+1)+' wajib diisi.';if(it.set){if(!it.comps.length)return'Set '+(i+1)+' harus punya minimal 1 isi.';for(const c of it.comps){if(!c.name.trim())return'Nama isi pada set '+(i+1)+' wajib diisi.';if(!(c.qty>0))return'Jumlah isi pada set '+(i+1)+' harus lebih dari 0.';}}if(!(it.qty>0))return'Qty item '+(i+1)+' harus lebih dari 0.';}
  for(let i=0;i<st.ex.length;i++){const l=st.ex[i];if(!l.name.trim())return'Nama biaya tambahan '+(i+1)+' wajib diisi.';if(!(l.qty>0))return'Jumlah biaya tambahan '+(i+1)+' harus lebih dari 0.';}
  if(edit&&st.t.grand_total<st.paid)return'Total baru ('+rp(st.t.grand_total)+') lebih kecil dari pembayaran yang sudah tercatat ('+rp(st.paid)+').';return'';}
 async function save(kind,btn){const e=check();if(e){ui.banner(errBox,e);return;}ui.banner(errBox,'');const p=payload();
  await ui.run(btn,async()=>{let v;
   if(!edit){p.state=kind==='draft'?'Draft':'Issued';v=await api('invoices.create',p);}
   else{p.invoice_id=id;p.ver=st.ver;if(kind==='issue')p.issue=true;v=await api('invoices.save',p);}
   A.toast(kind==='draft'?'Draf disimpan':(edit&&kind==='save'?'Perubahan disimpan':'Invoice diterbitkan'));if(v&&v.invoice&&v.items){A.putDetail(v.invoice.invoice_id,v);A.listUpsert(v);}location.hash='#/invoice?id='+encodeURIComponent(v.invoice.invoice_id);},m=>ui.banner(errBox,m));}
 const bar=h('div',{class:'btnrow stick'});
 if(!edit||st.state==='Draft'){bar.appendChild(h('button',{class:'btn',type:'button',id:'b-draft',onclick:e=>save('draft',e.currentTarget)},'Simpan Draft'));bar.appendChild(h('button',{class:'btn pri',type:'button',id:'b-issue',onclick:e=>save('issue',e.currentTarget)},'Terbitkan'));}
 else bar.appendChild(h('button',{class:'btn pri',type:'button',id:'b-save',onclick:e=>save('save',e.currentTarget)},'Simpan Perubahan'));
 wrap.appendChild(bar);el.appendChild(wrap);}

// ---------------- DETAIL ----------------
async function vDetail(el,my){
 const id=A.param('id');if(!id){el.appendChild(A.empty('Invoice tidak dipilih',''));return;}
 const peek=A.peekDetail(id);
 if(peek){el.textContent='';draw(el,peek,my);// tampil instan dari muatan latar belakang, lalu cek ke server dan perbarui bila ada perubahan
  api('invoices.get',{invoice_id:id}).then(n=>{if(my!==S.seq)return;if(JSON.stringify(n)!==JSON.stringify(peek)){draw(el,n,my);}}).catch(()=>{});return;}
 A.skel(el);let v;try{v=await api('invoices.get',{invoice_id:id});}catch(e){if(my!==S.seq)return;el.textContent='';el.appendChild(h('div',{class:'banner',role:'alert'},e.message));return;}
 if(my!==S.seq)return;el.textContent='';draw(el,v,my);}
function draw(el,v,my){const iv=v.invoice,t=v.totals,owner=S.boot.user.role==='owner',errBox=h('div');el.textContent='';el.appendChild(errBox);
 const reload=async()=>{S.cache={};const n=await api('invoices.get',{invoice_id:iv.invoice_id});draw(el,n,my);};
 const act=async(btn,fn)=>{await ui.run(btn,async()=>{const n=await fn();S.cache={};draw(el,n,my);},m=>ui.banner(errBox,m));};
 el.appendChild(h('div',{class:'hero'},h('div',{class:'row'},h('div',null,h('div',{class:'sub'},iv.invoice_number),h('div',{class:'big',id:'d-cust'},iv.cust_name),iv.cust_org?h('div',{class:'sub'},iv.cust_org):null),pill(A.payStatus(v.payment_status,v.totals.grand_total,v.balance))),
  h('div',{class:'row hero-b',style:'margin-top:10px;align-items:flex-end'},h('div',{class:'sub hero-c',id:'d-contact'},iv.cust_address?h('div',{id:'d-addr'},iv.cust_address):null,iv.cust_whatsapp?h('div',{id:'d-wa'},iv.cust_whatsapp):null),h('b',{class:'big hero-t',id:'d-total'},rp(t.grand_total)))));
 if(iv.state==='Cancelled')el.appendChild(h('div',{class:'banner'},'Invoice dibatalkan'+(iv.cancelled_reason?': '+iv.cancelled_reason:'')+'.'));
 if(iv.state==='Issued'){el.appendChild(h('div',{class:'kpis two'},h('div',{class:'kpi'},h('span',{class:'sub'},'Dibayar'),h('b',{id:'d-paid'},rp(v.paid))),h('div',{class:'kpi'},h('span',{class:'sub'},'Sisa'),(v.balance===0?h('b',{id:'d-bal',class:'lunas'},'✓ Lunas'):h('b',{id:'d-bal'},rp(v.balance))))));}
 // item
 el.appendChild(h('h2',{class:'sec'},'Item'));
 v.items.forEach(i=>{const cs=A.compsOf(i);el.appendChild(h('div',{class:'item'+(cs.length?' is-set':'')},h('div',{class:'row'},h('b',null,i.name,cs.length?h('span',{class:'tag-set'},'SET'):null),h('b',null,rp(Math.round(i.qty*i.unit_price)))),i.description?h('div',{class:'sub'},i.description):null,h('div',{class:'sub'},i.qty+' '+i.unit+' × '+rp(i.unit_price)),
  cs.length?h('div',{class:'set-isi'},h('div',{class:'sub'},'Isi 1 set'),...cs.map(c=>h('div',{class:'row set-c'},h('span',null,c.name),h('span',{class:'sub'},String(Math.round(Number(c.qty)*1000)/1000).replace('.',',')+' '+(c.unit||'pcs'))))):null));});
 const tt=h('div',{class:'card totals'});const r=(a,b,c)=>tt.appendChild(h('div',{class:'row'+(c?' grand':'')},h('span',null,a),h('b',null,b)));
 r('Subtotal',rp(t.subtotal));if(t.discount)r('Diskon'+(iv.discount_type==='percent'?' '+iv.discount_value+'%':''),'− '+rp(t.discount));if(t.tax)r('PPN '+iv.tax_rate+'%',rp(t.tax));if(Number(iv.shipping_fee))r('Ongkir',rp(iv.shipping_fee));A.extrasOf(iv).forEach(l=>{if(exTot(l))r(l.name+(l.qty!==1?' ('+l.qty+' × '+rp(l.unit_price)+')':''),rp(exTot(l)));});r('Total',rp(t.grand_total),1);el.appendChild(tt);
 el.appendChild(h('p',{class:'sub dates',id:'d-dates'},'Terbit '+fdate(iv.issue_date)));
 // tombol aksi
 const bar=h('div',{class:'acts'});
 const add=(txt,cls,fn,id)=>bar.appendChild(h('button',{class:'btn '+(cls||''),type:'button',id:id,onclick:fn},txt));
 if(iv.state==='Issued'&&v.balance>0)add('Catat Pembayaran','pri',()=>payForm(v,reload),'b-pay');
 if(iv.state==='Draft')add('Terbitkan','pri',e=>act(e.currentTarget,()=>api('invoices.issue',{invoice_id:iv.invoice_id,ver:v.ver})),'b-issue');
 if(iv.state!=='Cancelled')add('Ubah','',()=>{location.hash='#/invoice-edit?id='+encodeURIComponent(iv.invoice_id);},'b-edit');
 if(iv.state==='Issued')add('Batalkan','danger',async e=>{const btn=e.currentTarget;
  if(v.paid>0){ui.banner(errBox,'Invoice masih punya pembayaran valid ('+rp(v.paid)+'). Batalkan (void) pembayarannya dulu, baru invoice bisa dibatalkan.');return;}
  const r=await ui.confirm({title:'Batalkan invoice?',message:iv.invoice_number+' akan ditandai Cancelled. Data tidak dihapus.',reason:{label:'Alasan pembatalan (wajib)',required:true},danger:true,okText:'Batalkan Invoice',cancelText:'Kembali'});if(!r)return;
  act(btn,()=>api('invoices.cancel',{invoice_id:iv.invoice_id,ver:v.ver,reason:r.reason}));},'b-cancel');
 if(v.paid===0)add('Hapus','danger',async()=>{const msg=iv.state==='Draft'?'Draf '+iv.invoice_number+' akan dihapus. Nomor invoice ini tidak dipakai ulang.':(iv.state==='Cancelled'?'Invoice '+iv.invoice_number+' (dibatalkan) akan dihapus dari daftar. Nomor invoice ini tidak dipakai ulang.':'Invoice '+iv.invoice_number+' sudah terbit. Jika sudah dikirim ke pelanggan, sebaiknya pilih Batalkan Invoice, bukan Hapus. Nomor invoice ini tidak dipakai ulang.');
  const r=await ui.confirm({title:'Hapus invoice?',message:msg,danger:true,okText:'Hapus Invoice',cancelText:'Kembali'});if(!r)return;
  try{await api('invoices.delete',{invoice_id:iv.invoice_id,ver:v.ver});A.toast('Invoice dihapus');location.hash='#/home';}catch(e){ui.banner(errBox,e.message);}},'b-del');
 el.appendChild(bar);if(v.paid>0)el.appendChild(h('p',{class:'sub',id:'b-del-hint'},'Hapus invoice tersedia setelah semua pembayarannya dibatalkan (void).'));
 if(iv.state!=='Cancelled')el.appendChild(h('button',{class:'btn pdfw',type:'button',id:'b-pdf',onclick:()=>A.shareSheet(v)},'Kirim WhatsApp'));
 if(iv.state!=='Cancelled')el.appendChild(h('div',{class:'docrow'},h('button',{class:'btn doc2',type:'button',id:'b-surat',onclick:()=>A.suratSheet(v)},'Surat Pesanan'),h('button',{class:'btn doc3',type:'button',id:'b-jalan',onclick:()=>A.jalanSheet(v)},'Surat Jalan')));
 // pembayaran
 el.appendChild(h('h2',{class:'sec'},'Pembayaran'));
 if(!v.payments.length)el.appendChild(h('p',{class:'sub'},'Belum ada pembayaran.'));
 v.payments.slice().sort((a,b)=>String(a.payment_date).localeCompare(String(b.payment_date))).forEach(p=>{const ok=p.status==='valid';
  el.appendChild(h('div',{class:'item pay'+(ok?'':' void')},h('div',{class:'row'},h('div',null,h('b',null,rp(p.amount)),h('span',{class:'sub'},' · '+p.payment_type)),ok?null:h('span',{class:'pill p-cancel'},'Dibatalkan')),
   h('div',{class:'sub'},fdate(p.payment_date)+' · '+p.method+(p.reference_no?' · '+p.reference_no:'')),p.notes?h('div',{class:'sub'},p.notes):null,!ok&&p.void_reason?h('div',{class:'sub'},'Alasan: '+p.void_reason):null,
   ok&&iv.state!=='Cancelled'?h('button',{class:'linkbtn',type:'button','data-void':p.payment_id,onclick:async e=>{const btn=e.currentTarget,r=await ui.confirm({title:'Batalkan pembayaran?',message:rp(p.amount)+' ('+p.method+') akan ditandai dibatalkan. Catatan tetap tersimpan.',reason:{label:'Alasan pembatalan (wajib)',required:true},danger:true,okText:'Batalkan Pembayaran',cancelText:'Kembali'});if(!r)return;act(btn,()=>api('payments.void',{payment_id:p.payment_id,reason:r.reason}));}},'Batalkan pembayaran'):null));});
 if(v.order)el.appendChild(orderCard(v,reload,errBox));
 if(iv.notes)el.appendChild(h('div',{class:'card'},h('div',{class:'sub'},'Catatan'),h('div',{class:'pre'},iv.notes)));
 // laba internal
 if(owner&&iv.state!=='Cancelled'){const pr=v.profit;el.appendChild(h('div',{class:'card internal'},h('div',{class:'row'},h('b',null,'Laba internal'),h('span',{class:'pill p-draft'},'Tidak tampil di PDF')),
  pr.revenue_costed>0?h('div',null,h('div',{class:'row'},h('span',null,'Laba kotor'),h('b',{id:'d-profit'},rp(pr.gross_profit))),h('div',{class:'row'},h('span',null,'Margin'),h('b',null,pr.margin_pct===null?'—':pr.margin_pct+'%'))):h('div',{class:'sub'},'Belum ada item dengan harga modal.'),
  pr.uncosted_lines>0?h('div',{class:'sub'},pr.uncosted_lines+' item belum punya modal dan tidak dihitung ('+pr.cost_coverage_pct+'% omzet bermodal).'):null));}
}
A.extrasOf=iv=>{try{const x=JSON.parse(iv.extras_json||'');if(Array.isArray(x)&&x.length)return x.map(e=>({name:String(e.name),qty:Number(e.qty),unit_price:Number(e.unit_price)}));}catch(e){}return Number(iv.extra_fee)?[{name:iv.extra_fee_label||'Biaya tambahan',qty:1,unit_price:Number(iv.extra_fee)}]:[];};
A.catalogOf=s=>{try{const x=JSON.parse((s||{}).extra_catalog||'[]');return Array.isArray(x)?x:[];}catch(e){return[];}};
const exTot=l=>Math.round(l.qty*l.unit_price)||0;
const ordVer=o=>String(o.updated_at||o.created_at||'');
const ORD_ST=['New Order','In Production','Ready to Ship','Shipped'];
function orderCard(v,reload,errBox){const iv=v.invoice,o=v.order,can=iv.state==='Issued',card=h('div',{class:'card ordc',id:'ord-card'});
 const ship=(v.shipments||[]).find(x=>x.status!=='Voided');
 card.appendChild(h('div',{class:'row'},h('div',{class:'sub'},'Status pesanan'),A.ostPill(o.fulfillment_status,v.payment_status,'d-order')));
 const dl=h('div',{class:'row',style:'margin-top:6px'},h('span',{class:'sub',id:'d-deadline'},'Deadline: '+(o.deadline_date?fdate(o.deadline_date):'belum diatur')),can?h('button',{class:'linkbtn',type:'button',id:'o-dl',onclick:()=>dlForm(v,reload)},o.deadline_date?'Ubah':'Atur'):null);card.appendChild(dl);
 if(ship)card.appendChild(h('div',{class:'row'},h('span',{class:'sub',id:'d-shipdate'},'Dikirim: '+fdate(ship.ship_date)),can?h('button',{class:'linkbtn',type:'button',id:'o-sd',onclick:()=>shipForm({invoice_id:iv.invoice_id,ver:ordVer(o),ship_date:ship.ship_date},reload)},'Ubah'):null));
 if(can){card.appendChild(h('div',{class:'chips ordchips',role:'group','aria-label':'Ubah status pesanan'},...ORD_ST.map(st=>h('button',{class:'chip '+A.OST[st][1],type:'button','data-st':st,'aria-pressed':String(o.fulfillment_status===st),onclick:e=>{const box=e.currentTarget.parentNode,prev=o.fulfillment_status,mark=x=>box.querySelectorAll('.chip').forEach(c=>c.setAttribute('aria-pressed',String(c.dataset.st===x)));
   setStatus({invoice_id:iv.invoice_id,get ver(){return ordVer(o);},cur:prev,balance:v.balance,afterDone:true,opt:x=>{o.fulfillment_status=x;mark(x);},ok:(n,r)=>{if(r&&r.order)Object.assign(o,r.order);},undo:()=>{o.fulfillment_status=prev;mark(prev);}},st,reload,m=>ui.banner(errBox,m));}},A.OST[st][0]))));
  card.appendChild(h('div',{class:'sub'},'Status bisa dimajukan atau dikembalikan bila salah ketuk. Selesai otomatis saat pesanan Dikirim dan invoice sudah lunas.'));}
 else card.appendChild(h('div',{class:'sub'},'Status tidak bisa diubah karena invoice belum terbit atau sudah dibatalkan.'));
 return card;}
function dlForm(v,reload){const iv=v.invoice,o=v.order;ui.sheet('Deadline pesanan',(b,close)=>{const dt=h('input',{type:'date',value:o.deadline_date||'','aria-label':'Deadline',id:'o-dlin'});b.appendChild(ui.field('Deadline selesai',dt));
 const go=h('button',{class:'btn pri',type:'button',id:'o-dlsave'},'Simpan');go.addEventListener('click',()=>ui.run(go,async()=>{await api('orders.update',{invoice_id:iv.invoice_id,ver:ordVer(o),deadline_date:dt.value});close();A.toast('Deadline disimpan');await reload();},m=>ui.banner(b,m)));
 b.appendChild(h('div',{class:'btnrow'},h('button',{class:'btn',type:'button',onclick:close},'Batal'),go));});}
// Antrean per invoice: ketukan beruntun langsung tampil di layar, server menyusul berurutan (versi data selalu terbaru).
const QU={},QN={};
function enqueue(id,fn){QN[id]=(QN[id]||0)+1;const q=(QU[id]||Promise.resolve()).then(fn,fn);QU[id]=q.catch(()=>{});QU[id].then(()=>{QN[id]--;});return q;}
async function setStatus(info,st,done,fail){if(info.cur===st)return;
 if(st==='Shipped'){shipForm(Object.assign({fromStatus:true},info),done,fail);return;}
 if(info.opt)info.opt(st);// tampilan berubah seketika
 await enqueue(info.invoice_id,async()=>{try{const r=await api('orders.update',{invoice_id:info.invoice_id,ver:info.ver,status:st});if(info.ok)info.ok(r&&r.order?ordVer(r.order):null,r);A.toast('Status: '+((A.OST[st]||[st])[0]).replace(/^\u2713 /,''));
   if((!info.opt||info.afterDone)&&QN[info.invoice_id]<=1&&done)await done();}
  catch(e){if(info.undo)info.undo();if(fail)fail(e.message);else A.toast(e.message);}});}
function shipForm(info,reload,fail){ui.sheet('Tanggal kirim',(b,close)=>{const dt=h('input',{type:'date',value:info.ship_date||ui.today(),'aria-label':'Tanggal kirim',id:'o-sdin'});b.appendChild(ui.field('Tanggal kirim',dt));
 const go=h('button',{class:'btn pri',type:'button',id:'o-sdsave'},info.fromStatus?'Tandai Dikirim':'Simpan');go.addEventListener('click',()=>ui.run(go,async()=>{await api('orders.update',{invoice_id:info.invoice_id,ver:info.ver,status:'Shipped',ship_date:dt.value});close();A.toast('Status: Dikirim');await reload();},m=>ui.banner(b,m)));
 b.appendChild(h('div',{class:'btnrow'},h('button',{class:'btn',type:'button',onclick:close},'Batal'),go));});}
A.pending=()=>Object.keys(QN).some(k=>QN[k]>0);A.setOrderStatus=setStatus;A.ORD_ST=ORD_ST;
// Swipe kanan di Home: Lunas 1 ketuk (pilih rekening) atau bayar sebagian. info: {invoice_id,balance,paid,opt,ok,undo}
A.quickPay=function(info){if(!(info.balance>0))return;ui.sheet('Lunas '+rp(info.balance),(b,close)=>{b.appendChild(h('p',{class:'sub'},'Pilih rekening penerima. Sisa tagihan dicatat lunas hari ini.'));
 const row=h('div',{class:'btnrow',id:'qp-methods'});METHODS.forEach(m=>{row.appendChild(h('button',{class:'btn pri',type:'button','data-m':m,onclick:()=>{close();info.opt();enqueue(info.invoice_id,async()=>{
  try{await api('payments.add',{invoice_id:info.invoice_id,amount:info.balance,method:m,payment_date:ui.today()});info.ok();A.toast('Lunas dicatat ('+m+')');}catch(e){info.undo();A.toast(e.message);}});}},m));});
 b.appendChild(row);b.appendChild(h('div',{class:'btnrow'},h('button',{class:'btn',type:'button',onclick:close},'Batal')));});};
A.payPartial=function(info,reload){payForm({invoice:{invoice_id:info.invoice_id},balance:info.balance,paid:info.paid||0},reload);};
function payForm(v,reload){const iv=v.invoice;ui.sheet('Catat pembayaran',(b,close)=>{const err=h('div');b.appendChild(err);
 b.appendChild(h('div',{class:'sub'},'Sisa tagihan '+rp(v.balance)));
 let amt=0;const am=ui.money(0,n=>{amt=n;},{'aria-label':'Nominal pembayaran',id:'p-amt'});
 const quick=h('div',{class:'chips'},h('button',{class:'chip',type:'button',id:'p-full',onclick:()=>am.setNum(v.balance)},'Lunasi sisa'),h('button',{class:'chip',type:'button',onclick:()=>am.setNum(Math.round(v.balance/2))},'50% sisa'));
 const mt=ui.select(METHODS.map(m=>[m,m]),'BCA',{'aria-label':'Metode'}),dt=h('input',{type:'date',value:ui.today(),'aria-label':'Tanggal bayar'}),rf=ui.text({placeholder:'No. referensi (opsional)','aria-label':'Referensi',maxlength:'100'}),nt=ui.text({placeholder:'Catatan (opsional)','aria-label':'Catatan',maxlength:'300'});
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
