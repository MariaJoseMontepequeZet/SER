import { esc } from "./utils.js";

export function toast(msg){ const t=document.createElement("div"); t.className="toast"; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2800); }

export function openModal({title, body, actions}){
  const root=document.getElementById("modal-root");
  root.innerHTML=`<div class="modal-back" data-close="1"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mtitle">
    <h2 id="mtitle">${esc(title)}</h2><div>${body}</div>
    <div class="row" style="justify-content:flex-end" id="mact"></div></div></div>`;
  const act=root.querySelector("#mact");
  (actions||[{label:"Cerrar"}]).forEach(a=>{
    const b=document.createElement("button"); b.textContent=a.label; if(a.kind) b.className=a.kind;
    b.onclick=async()=>{ if(a.fn){ b.disabled=true; const keep=await a.fn(root); b.disabled=false; if(keep===false) return; } closeModal(); };
    act.appendChild(b);
  });
  root.querySelector(".modal-back").addEventListener("click",e=>{ if(e.target.dataset.close) closeModal(); });
}
export function closeModal(){ document.getElementById("modal-root").innerHTML=""; }
export function confirmBox(title, text, label, fn){ openModal({title, body:`<p style="margin:0">${esc(text)}</p>`, actions:[{label:"Cancelar"},{label, kind:"primary", fn}]}); }
