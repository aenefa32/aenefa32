/* AeneFlow - theme.js: terapkan tema tersimpan SEBELUM tampilan digambar (tanpa kedip). Disimpan per perangkat, tidak dikirim ke server. */
(function(){
 var T=[['rose','Rose','#F7E8EC','#C58D9D','#8F5667'],['lavender','Lavender','#EEE8F7','#A794CC','#6E5A9E'],['peach','Peach','#FCE9DD','#E0A07F','#a45938'],['sky','Sky','#E4EEF8','#8DB1D3','#45719a'],['sage','Sage','#E6EDE0','#9DB38A','#587649'],['mint','Mint','#DDEFEA','#7FB5A8','#36786b'],['mocha','Mocha','#EFE3D8','#B8977A','#7D5A3F'],['plum','Plum','#F0E1EB','#B37A9C','#7E4468'],['slate','Slate','#E8EBEF','#98A2B0','#4F5B6B'],['stone','Stone','#ECEAE6','#A7A196','#5E5850'],['malam-rose','Malam Rose','#352B30','#C58D9D','#A8566F'],['malam-lavender','Malam Lavender','#312D42','#A794CC','#7B64B8']];
 var BG={'malam-rose':'#1F1A1D','malam-lavender':'#1D1B26'},KEY='aene_theme';
 function get(){try{var v=localStorage.getItem(KEY);return T.some(function(t){return t[0]===v;})?v:'rose';}catch(e){return'rose';}}
 function apply(id){var de=document.documentElement;de.setAttribute('data-theme',id);var m=document.querySelector('meta[name=theme-color]');if(m){var t=T.filter(function(x){return x[0]===id;})[0];m.setAttribute('content',BG[id]||(t?t[4]:'#8F5667'));}}
 function set(id){try{localStorage.setItem(KEY,id);}catch(e){}apply(id);}
 window.AeneTheme={list:T,get:get,set:set,apply:apply};
 apply(get());
 document.addEventListener('DOMContentLoaded',function(){apply(get());});
})();
