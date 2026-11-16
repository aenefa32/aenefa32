/* AeneFlow - reports.js: Business Reports (omzet, diterima, piutang, laba kotor, pesanan, piutang jatuh tempo, top pelanggan/produk) + unduh Excel.
   Semua teks lewat textContent. Angka dihitung di server (reports.summary). Laba/modal hanya tampil di sini, tidak pernah di PDF pelanggan. */
(window.AeneModules=window.AeneModules||[]).push(function(A){'use strict';
const h=A.h,ui=A.ui,rp=A.rp,S=A.S,api=A.api;
const MON=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const monLabel=m=>{const p=String(m).split('-');return (MON[Number(p[1])-1]||p[1])+(p[0]?" '"+p[0].slice(2):'');};
function period(k){const t=ui.today(),y=Number(t.slice(0,4)),m=Number(t.slice(5,7)),pad=n=>('0'+n).slice(-2);
 if(k==='month')return{from:y+'-'+pad(m)+'-01',to:t};
 if(k==='3m'){let mm=m-2,yy=y;if(mm<1){mm+=12;yy--;}return{from:yy+'-'+pad(mm)+'-01',to:t};}
 if(k==='year')return{from:y+'-01-01',to:t};
 return{from:'',to:''};}
const PER=[['month','Bulan ini'],['3m','3 bulan'],['year','Tahun ini'],['all','Semua']];
// ---------- penulis .xlsx minimal (tanpa pustaka): ZIP tanpa kompresi + XML inline ----------
const CT=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CT[(c^b[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;};
const enc=s=>new TextEncoder().encode(s);
function zip(files){const out=[],cen=[];let off=0;const u16=n=>[n&255,(n>>8)&255],u32=n=>[n&255,(n>>8)&255,(n>>16)&255,(n>>>24)&255];
 files.forEach(f=>{const nm=enc(f[0]),d=typeof f[1]==='string'?enc(f[1]):f[1],c=crc32(d);
  const lh=[0x50,0x4b,3,4,...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(c),...u32(d.length),...u32(d.length),...u16(nm.length),...u16(0)];
  out.push(Uint8Array.from(lh),nm,d);
  cen.push(Uint8Array.from([0x50,0x4b,1,2,...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(c),...u32(d.length),...u32(d.length),...u16(nm.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),nm);
  off+=lh.length+nm.length+d.length;});
 let cs=0;cen.forEach(x=>{cs+=x.length;});
 const end=Uint8Array.from([0x50,0x4b,5,6,...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(cs),...u32(off),...u16(0)]);
 return new Blob([...out,...cen,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});}
const esc=s=>String(s==null?'':s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const col=i=>{let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;};
function sheetXml(rows,widths){let x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>'+widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('')+'</cols><sheetData>';
 rows.forEach((r,ri)=>{x+='<row r="'+(ri+1)+'">';r.forEach((c,ci)=>{const ref=col(ci)+(ri+1);if(c==null||c==='')return;
  if(typeof c==='object'&&c.h)x+='<c r="'+ref+'" s="1" t="inlineStr"><is><t xml:space="preserve">'+esc(c.h)+'</t></is></c>';
  else if(typeof c==='number'&&isFinite(c))x+='<c r="'+ref+'" s="2"><v>'+c+'</v></c>';
  else x+='<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+esc(c)+'</t></is></c>';});x+='</row>';});
 return x+'</sheetData></worksheet>';}
function buildXlsx(r){const H=t=>({h:t}),k=r.kpi,sheets=[
 ['Ringkasan',[[H('Business Reports'+((S.boot&&S.boot.settings&&S.boot.settings.business_name)?' - '+S.boot.settings.business_name:''))],[H('Periode'),(r.period.from||'awal')+' s/d '+(r.period.to||r.today)],[],[H('Omzet'),k.omzet],[H('Diterima'),k.diterima],[H('Piutang (belum bayar)'),k.piutang],[H('Jumlah invoice terbit'),k.invoice_count],[H('Laba kotor'),k.laba_kotor],[H('Margin (%)'),k.margin_pct==null?'-':k.margin_pct],[H('Cakupan harga modal (%)'),k.cost_coverage_pct],[],
  [H('Pesanan')],['Belum diproses',r.orders.new],['In Production',r.orders.production],['Ready to Ship',r.orders.ready],['Shipped',r.orders.shipped],['Completed (Shipped + Lunas)',r.orders.completed],[],
  [H('Piutang jatuh tempo')],['Belum jatuh tempo',r.aging.current],['Terlambat 1-7 hari',r.aging.d1_7],['Terlambat > 7 hari',r.aging.d8p],[],
  [H('Pelanggan teratas'),H('Omzet'),H('Invoice')],...r.top_customers.map(c=>[c.name+(c.org?' · '+c.org:''),c.omzet,c.count]),[],
  [H('Produk terlaris'),H('Qty'),H('Nilai item')],...r.top_products.map(p=>[p.name,p.qty,p.omzet])],[34,22,16]],
 ['Per Bulan',[[H('Bulan'),H('Omzet'),H('Diterima'),H('Laba kotor'),H('Invoice')],...r.months.map(m=>[m.month,m.omzet,m.diterima,m.laba,m.count])],[12,16,16,16,10]],
 ['Invoice',[[H('Nomor'),H('Tanggal'),H('Jatuh tempo'),H('Pelanggan'),H('Instansi'),H('Total'),H('Dibayar'),H('Sisa'),H('Status bayar'),H('Status pesanan')],...r.invoices.map(i=>[i.invoice_number,i.issue_date,i.due_date,i.customer,i.organization,i.total,i.paid,i.balance,i.payment_status,i.order_status])],[18,12,12,24,24,14,14,14,14,16]]];
 const files=[['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((s,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>'],
  ['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
  ['xl/workbook.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((s,i)=>'<sheet name="'+esc(s[0])+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>'],
  ['xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((s,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
  ['xl/styles.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'],
  ...sheets.map((s,i)=>['xl/worksheets/sheet'+(i+1)+'.xml',sheetXml(s[1],s[2])])];
 return zip(files);}
A.reportsXlsx=buildXlsx;
// ---------- tampilan ----------
const kpi=(label,val,sub,cls)=>h('div',{class:'kpi'},h('span',{class:'sub'},label),h('b',{class:cls||''},val),h('small',{class:'sub'},sub||''));
const row=(a,b,cls)=>h('div',{class:'mini'},h('span',null,a),h('span',{class:cls||''},b));
async function vReports(el,my){
 let cur=S.repPeriod||'3m';const box=h('div');
 el.appendChild(h('div',{class:'chips',role:'group','aria-label':'Periode'},...PER.map(p=>h('button',{class:'chip',type:'button','data-per':p[0],'aria-pressed':String(cur===p[0]),onclick:()=>{S.repPeriod=p[0];A.render();}},p[1]))));
 el.appendChild(box);ui.skel?ui.skel(box):box.appendChild(h('div',{class:'skel'}));
 let r;try{r=await api('reports.summary',period(cur));}catch(e){if(my!==S.seq)return;box.textContent='';box.appendChild(h('div',{class:'banner',role:'alert'},e.message));return;}
 if(my!==S.seq)return;box.textContent='';const k=r.kpi;
 if(!k.invoice_count){box.appendChild(h('div',{class:'empty',id:'rp-empty'},h('h2',null,'Belum ada data'),h('p',null,'Belum ada invoice terbit pada periode ini.')));return;}
 box.appendChild(h('div',{class:'kpis rp-kpis',id:'rp-kpis'},kpi('Omzet',rp(k.omzet),k.invoice_count+' invoice terbit'),kpi('Diterima',rp(k.diterima),k.diterima_pct+'% dari omzet'),kpi('Piutang (belum bayar)',rp(k.piutang),k.piutang_count+' invoice','warnv'),
  kpi('Laba kotor',rp(k.laba_kotor),k.margin_pct==null?'belum ada harga modal':'margin '+k.margin_pct+'%')));
 if(k.cost_coverage_pct<100)box.appendChild(h('p',{class:'sub',id:'rp-cov'},'Laba hanya dari item yang punya harga modal ('+k.cost_coverage_pct+'% dari omzet; '+k.uncosted_lines+' item tanpa modal tidak dihitung).'));
 box.appendChild(h('h2',{class:'sec'},'Omzet per bulan'));
 const mx=Math.max(1,...r.months.map(m=>m.omzet));
 box.appendChild(h('div',{class:'card'},h('div',{class:'rp-bars',id:'rp-bars'},...r.months.map(m=>h('div',null,h('i',{style:'height:'+Math.max(4,Math.round(m.omzet/mx*100))+'px','aria-label':monLabel(m.month)+' '+rp(m.omzet)}),h('span',{class:'sub'},monLabel(m.month)),h('small',null,rp(m.omzet))))),
  h('p',{class:'sub'},'Omzet = total invoice terbit (tanpa yang dibatalkan), menurut tanggal terbit.')));
 box.appendChild(h('h2',{class:'sec'},'Pesanan'));
 box.appendChild(h('div',{class:'card',id:'rp-orders'},row('Belum diproses',r.orders.new),row('In Production',r.orders.production),row('Ready to Ship',r.orders.ready),row('Shipped',r.orders.shipped),row('Completed (Shipped + Lunas)',r.orders.completed)));
 box.appendChild(h('h2',{class:'sec'},'Piutang jatuh tempo'));
 box.appendChild(h('div',{class:'card',id:'rp-aging'},row('Belum jatuh tempo',rp(r.aging.current)),row('Terlambat 1–7 hari',rp(r.aging.d1_7),r.aging.d1_7?'warnv':''),row('Terlambat > 7 hari',rp(r.aging.d8p),r.aging.d8p?'warnv':'')));
 const top=r.top_customers,mc=Math.max(1,...top.map(c=>c.omzet));
 box.appendChild(h('h2',{class:'sec'},'Pelanggan teratas'));
 box.appendChild(h('div',{class:'card',id:'rp-cust'},...top.map(c=>h('div',{style:'margin-bottom:8px'},row(c.name+(c.org?' · '+c.org:''),rp(c.omzet)),h('div',{class:'bar2'},h('i',{style:'width:'+Math.round(c.omzet/mc*100)+'%'}))))));
 box.appendChild(h('h2',{class:'sec'},'Produk terlaris'));
 box.appendChild(h('div',{class:'card',id:'rp-prod'},...r.top_products.map(p=>row(p.name,ui.fmt(p.qty)+' pcs'))));
 box.appendChild(h('h2',{class:'sec'},'Ekspor'));
 const dl=h('button',{class:'btn',type:'button',id:'rp-xlsx',style:'width:100%'},'Unduh Excel (.xlsx)');
 dl.addEventListener('click',async()=>{try{const blob=buildXlsx(r),name='AeneFlow-Laporan-'+(r.period.from||'semua')+'-'+(r.period.to||r.today)+'.xlsx';let file=null;try{file=new File([blob],name,{type:blob.type});}catch(e){}
  if(file&&navigator.canShare&&navigator.share&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:name});return;}catch(e){if(e&&e.name==='AbortError')return;}}
  const url=URL.createObjectURL(blob),a=h('a',{href:url,download:name});document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},1500);A.toast('Excel diunduh');}catch(e){A.toast('Gagal membuat Excel: '+e.message);}});
 box.appendChild(dl);
 box.appendChild(h('p',{class:'sub'},'Laporan hanya terlihat di dalam aplikasi untuk Anda. Harga modal, laba, dan margin tidak pernah masuk PDF pelanggan. Laba kotor dari harga modal per item (belum termasuk biaya lain dari Cashflow).'));}
A.ROUTES.reports={t:'Business Reports',nav:'more',back:'more',v:vReports};
});
