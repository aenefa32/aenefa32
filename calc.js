/* AeneFlow - calc.js: salinan rumus total invoice yang IDENTIK dengan backend/Calc.gs (calcTotals), hanya untuk pratinjau langsung di editor.
   Angka resmi tetap dihitung backend; tests/calc-parity.test.js membuktikan kedua rumus selalu sama. */
(function(root){
function calcTotals(items,o){o=o||{};let sub=0,cost=0;
 items.forEach(i=>{sub+=Math.round(i.qty*i.unit_price);cost+=Math.round(i.qty*(i.cost_price||0));});
 let d=o.discount_type==='percent'?Math.round(sub*(o.discount_value||0)/100):Math.round(o.discount_value||0);d=Math.min(Math.max(d,0),sub);
 const rev=sub-d,tax=Math.round(rev*(o.tax_rate||0)/100),grand=rev+tax+Math.round(o.shipping_fee||0)+Math.round(o.extra_fee||0);
 return{subtotal:sub,discount:d,revenue:rev,tax:tax,grand_total:grand,cost:cost,gross_profit:rev-cost,margin_pct:rev?Math.round((rev-cost)/rev*1000)/10:0};}
root.AeneCalc={calcTotals:calcTotals};
})(typeof window!=='undefined'?window:globalThis);
