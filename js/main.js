import { esc, todayStr, fmtDate, fmtDT, slug, uidq } from "./utils.js";
import { toast, openModal, closeModal, confirmBox } from "./ui.js";
import { buildPdf } from "./pdf.js";
const S = {
  db:null, user:null, uid:null, isAdmin:false, asStudent:false, downloads:null,
  tareas:[], tareasLoaded:false, cuenta:undefined, cuentas:[], bloqueos:{}, profiles:{},
  view:"home", tab:"tareas", sel:null, editing:false, draft:null, form:null, slow:false, fatal:null
};
const app = document.getElementById("app");


/* ---------- Datos ---------- */
const adminMode = () => S.isAdmin && !S.asStudent;
const tareaById = id => S.tareas.find(t=>t.id===id);
const blocked = id => !!S.bloqueos[id];
function entregasDe(tid){
  const out=[]; for(const c of S.cuentas){ const e=c.entregas&&c.entregas[tid]; if(e) out.push({cuentaId:c.id, cuenta:c, e}); }
  return out.sort((a,b)=>(a.e.nombre||"").localeCompare(b.e.nombre||"","es"));
}
function estadoTarea(t, e){
  if(e) return e.tarde ? `<span class="chip warn">Entregada tarde</span>` : `<span class="chip ok">Entregada</span>`;
  if(!t.activa) return `<span class="chip bad">Cerrada</span>`;
  if(t.fechaLimite && todayStr()>t.fechaLimite) return `<span class="chip bad">Vencida</span>`;
  return `<span class="chip warn">Pendiente</span>`;
}

function rerender(){ if(!S.editing) render(); }

async function init(){
  if(!window.claude || !claude.use){ S.fatal="Esta página tiene que abrirse desde claude.ai con tu cuenta iniciada."; return render(); }
  const timer=setTimeout(()=>{ S.slow=true; render(); },10000);
  const [db,user,dl]=await Promise.all([claude.use("db"),claude.use("user"),claude.use("downloads")]);
  S.db=db; S.user=user; S.downloads=dl;
  if(!db || !user){ clearTimeout(timer); S.fatal="No se pudo conectar. Asegurate de haber iniciado sesión en Claude y de que la admin te haya compartido la página con permiso de Colaborador (Contributor)."; return render(); }
  S.uid=await user.id();
  try{ S.isAdmin=!!(await user.canEdit()); }catch(_){ S.isAdmin=false; }
  if(!S.uid){ clearTimeout(timer); S.fatal="No pudimos identificar tu cuenta. Iniciá sesión en Claude y volvé a abrir el enlace."; return render(); }
  const onErr=e=>{ clearTimeout(timer); if(e && e.code==="revoked"){ S.fatal="Ya no tenés acceso a esta página."; } else { S.slow=true; } render(); };
  db.collection("tareas").onSnapshot(snap=>{
    S.tareas=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.creada||"").localeCompare(a.creada||""));
    S.tareasLoaded=true; if(!snap.metadata.fromCache){ clearTimeout(timer); S.slow=false; } rerender();
  }, onErr);
  db.doc("cuentas/"+S.uid).onSnapshot(s=>{ S.cuenta = s.exists ? {id:s.id,...s.data()} : null; if(!s.metadata.fromCache){ clearTimeout(timer); S.slow=false; } rerender(); }, onErr);
  db.doc("config/bloqueos").onSnapshot(s=>{ S.bloqueos=(s.exists && s.data().ids) || {}; rerender(); }, ()=>{});
  if(S.isAdmin){
    db.collection("cuentas").onSnapshot(async snap=>{
      S.cuentas=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.nombre||"").localeCompare(b.nombre||"","es"));
      try{ S.profiles=await user.profiles(S.cuentas.map(c=>c.id)) || {}; }catch(_){}
      rerender();
    }, ()=>{});
  }
  render();
}

/* ---------- PDF ---------- */
async function savePdf(items, filename){
  if(!S.downloads){ toast("La descarga no está disponible en esta vista."); return; }
  if(!window.jspdf){ toast("No cargó el generador de PDF. Recargá la página."); return; }
  try{ await S.downloads.save({filename, data: buildPdf(items)}); }
  catch(err){ if(err && err.code==="declined") return; toast("No se pudo descargar el PDF."); }
}

/* ---------- Render ---------- */
function header(){
  const name = S.cuenta && S.cuenta.nombre ? S.cuenta.nombre : "";
  const sw = S.isAdmin ? `<label class="switch"><input type="checkbox" id="asStudent" ${S.asStudent?"checked":""}> Ver como estudiante</label>` : "";
  return `<header class="top"><div class="brand"><div class="logo">B</div><div><h1>Buzón de Tareas</h1>
    <small>${adminMode()?"Panel de administración":(name?esc(name):"Tus tareas del grupo")}</small></div></div>${sw}</header>`;
}

function render(){
  if(S.fatal){ app.innerHTML=header()+`<div class="notice bad">${esc(S.fatal)}</div>`; return; }
  if(!S.db || (!S.tareasLoaded && S.cuenta===undefined)){
    app.innerHTML=header()+`<div class="card"><p class="muted" style="margin:0">${S.slow?"La conexión está tardando. Revisá tu internet; la página sigue intentando.":"Cargando tus tareas…"}</p></div>`; bindHeader(); return;
  }
  let body = adminMode() ? renderAdmin() : renderStudent();
  if(S.slow) body = `<div class="notice">Puede que los datos no estén al día; seguimos intentando conectar.</div>`+body;
  app.innerHTML = header()+body; bindHeader();
}
function bindHeader(){ const c=document.getElementById("asStudent"); if(c) c.onchange=()=>{ S.asStudent=c.checked; S.view="home"; S.editing=false; render(); }; }

/* ----- Estudiante ----- */
function renderStudent(){
  if(S.cuenta===undefined) return `<div class="card"><p class="muted" style="margin:0">Cargando tu perfil…</p></div>`;
  if(S.cuenta===null) return `<form class="card" id="regForm"><h2>Creá tu perfil</h2>
      <p class="muted" style="margin:0">Escribí tu nombre completo como querés que aparezca en tus entregas.</p>
      <div class="field"><label for="regNombre">Nombre completo</label><input type="text" id="regNombre" required autocomplete="name" placeholder="Ej. María José Pérez López"></div>
      <div class="row"><button class="primary" type="submit">Guardar y continuar</button></div></form>`;
  if(blocked(S.uid)) return `<div class="notice bad">Tu cuenta está desactivada. Hablá con la persona que administra el grupo.</div>`;
  if(S.view==="form" && S.sel) return renderStudentForm();
  if(S.view==="ver" && S.sel) return renderStudentEntrega();
  const ent=S.cuenta.entregas||{};
  const visibles=S.tareas.filter(t=>t.activa || ent[t.id]);
  const pend=visibles.filter(t=>!ent[t.id] && t.activa).length;
  const cards = visibles.length ? visibles.map(t=>{
    const e=ent[t.id];
    return `<div class="card"><div class="row between"><h3>${esc(t.titulo)}</h3>${estadoTarea(t,e)}</div>
      <div class="muted" style="font-size:.9rem">Fecha límite: ${fmtDate(t.fechaLimite)} · ${(t.preguntas||[]).length} preguntas</div>
      <div class="row">${e?`<button data-act="ver" data-id="${esc(t.id)}">Ver mi entrega</button>`:""}
      ${t.activa?`<button class="${e?"":"primary"}" data-act="resolver" data-id="${esc(t.id)}">${e?"Editar":"Resolver tarea"}</button>`:""}
      ${e?`<button data-act="pdfMine" data-id="${esc(t.id)}">Descargar PDF</button>`:""}</div></div>`;
  }).join("") : `<div class="card"><p class="muted" style="margin:0">Todavía no hay tareas publicadas. Cuando la admin publique una, aparece aquí.</p></div>`;
  return `<div class="card"><div class="row between"><div><h2>Hola, ${esc((S.cuenta.nombre||"").split(" ")[0])}</h2>
      <div class="muted">${pend?`Tenés ${pend} ${pend===1?"tarea pendiente":"tareas pendientes"}.`:"Estás al día con tus tareas."}</div></div>
      <button class="ghost" data-act="editName">Editar mi nombre</button></div>
      <div class="hint">Tus respuestas solo las ve la administración del grupo.</div></div>
    <div class="list">${cards}</div>`;
}
function renderStudentForm(){
  const t=tareaById(S.sel); if(!t) return `<div class="notice bad">Esta tarea ya no existe.</div>`;
  const f=S.form; const late = t.fechaLimite && todayStr()>t.fechaLimite;
  const qs=(t.preguntas||[]).map((q,i)=>`<div class="field"><label for="q_${esc(q.id)}">${i+1}. ${esc(q.label)}${q.requerida?"":` <span class="hint">(opcional)</span>`}</label>
    ${q.ayuda?`<span class="hint">${esc(q.ayuda)}</span>`:""}
    ${q.tipo==="corta"?`<input type="text" id="q_${esc(q.id)}" data-q="${esc(q.id)}" value="${esc(f.respuestas[q.id]||"")}">`
      :`<textarea id="q_${esc(q.id)}" data-q="${esc(q.id)}">${esc(f.respuestas[q.id]||"")}</textarea>`}</div>`).join("");
  return `<form class="card" id="entForm"><div class="row between"><button type="button" class="ghost" data-act="home">← Volver</button>${estadoTarea(t, (S.cuenta.entregas||{})[t.id])}</div>
    <h2>${esc(t.titulo)}</h2>
    ${t.instrucciones?`<div class="answer">${esc(t.instrucciones)}</div>`:""}
    <div class="muted" style="font-size:.9rem">Fecha límite: ${fmtDate(t.fechaLimite)}</div>
    ${late?`<div class="notice">La fecha límite ya pasó. Podés entregar, pero quedará marcada como tarde.</div>`:""}
    <div class="field"><label for="fNombre">Nombre completo</label><input type="text" id="fNombre" value="${esc(f.nombre)}" required></div>
    <div class="field"><label for="fFecha">Fecha</label><input type="date" id="fFecha" value="${esc(f.fecha)}" required></div>
    <h3 style="margin-top:6px">Resolución</h3>${qs}
    <div class="row"><button class="primary" type="submit" id="btnEnviar">${(S.cuenta.entregas||{})[t.id]?"Guardar cambios":"Entregar tarea"}</button>
    <button type="button" data-act="home">Cancelar</button></div></form>`;
}
function entregaHtml(t, e){
  const qs=(e.preguntas&&e.preguntas.length?e.preguntas:(t?.preguntas||[]));
  return `<div class="stats"><div class="stat"><span class="hint">Nombre completo</span><span><strong>${esc(e.nombre)}</strong></span></div>
    <div class="stat"><span class="hint">Fecha</span><span>${fmtDate(e.fecha)}</span></div>
    <div class="stat"><span class="hint">Entregada</span><span>${fmtDT(e.enviada)}${e.tarde?` <span class="chip warn">tarde</span>`:""}</span></div></div>
    ${qs.map((q,i)=>`<div class="field"><span style="font-weight:700">${i+1}. ${esc(q.label)}</span><div class="answer">${esc((e.respuestas||{})[q.id]||"(sin respuesta)")}</div></div>`).join("")}`;
}
function renderStudentEntrega(){
  const t=tareaById(S.sel); const e=(S.cuenta.entregas||{})[S.sel];
  if(!e) return `<div class="notice bad">No encontramos esta entrega.</div>`;
  return `<div class="card"><div class="row between"><button class="ghost" data-act="home">← Volver</button>${estadoTarea(t||{},e)}</div>
    <h2>${esc(e.titulo||t?.titulo)}</h2>${entregaHtml(t,e)}
    <div class="row"><button class="primary" data-act="pdfMine" data-id="${esc(S.sel)}">Descargar PDF</button>
    ${t&&t.activa?`<button data-act="resolver" data-id="${esc(S.sel)}">Editar</button>`:""}</div></div>`;
}

/* ----- Admin ----- */
function renderAdmin(){
  if(S.view==="editor") return renderEditor();
  const tabs=[["tareas","Tareas"],["entregas","Entregas"],["cuentas","Cuentas"]];
  const tabHtml=`<div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${S.tab===k}" data-act="tab" data-id="${k}">${l}</button>`).join("")}</div>`;
  let inner = S.tab==="tareas"?adminTareas():S.tab==="entregas"?adminEntregas():adminCuentas();
  const activas=S.cuentas.filter(c=>!blocked(c.id)).length;
  const totalEnt=S.cuentas.reduce((n,c)=>n+Object.keys(c.entregas||{}).length,0);
  return `<div class="stats"><div class="card stat"><span class="hint">Tareas</span><b>${S.tareas.length}</b></div>
    <div class="card stat"><span class="hint">Cuentas activas</span><b>${activas}</b></div>
    <div class="card stat"><span class="hint">Entregas recibidas</span><b>${totalEnt}</b></div></div>
    <div class="card">${tabHtml}${inner}</div>`;
}
function adminTareas(){
  const list=S.tareas.map(t=>{ const n=entregasDe(t.id).length;
    return `<div class="q"><div class="row between"><h3>${esc(t.titulo)}</h3><span class="chip ${t.activa?"ok":"bad"}">${t.activa?"Activa":"Cerrada"}</span></div>
      <div class="muted" style="font-size:.9rem">Fecha límite ${fmtDate(t.fechaLimite)} · ${(t.preguntas||[]).length} preguntas · ${n} ${n===1?"entrega":"entregas"}</div>
      <div class="row"><button data-act="verEntregas" data-id="${esc(t.id)}">Ver entregas</button><button data-act="editar" data-id="${esc(t.id)}">Editar</button>
      <button data-act="toggleActiva" data-id="${esc(t.id)}">${t.activa?"Cerrar":"Reabrir"}</button><button data-act="duplicar" data-id="${esc(t.id)}">Duplicar</button>
      <button class="danger" data-act="borrarTarea" data-id="${esc(t.id)}">Eliminar</button></div></div>`; }).join("");
  return `<div class="row between"><h2>Tareas</h2><button class="primary" data-act="nueva">+ Nueva tarea</button></div>
    ${list || `<p class="muted" style="margin:0">No hay tareas todavía. Creá la primera con "Nueva tarea".</p>`}`;
}
function adminEntregas(){
  if(!S.tareas.length) return `<p class="muted" style="margin:0">Creá una tarea primero.</p>`;
  if(!S.sel || !tareaById(S.sel)) S.sel=S.tareas[0].id;
  const t=tareaById(S.sel); const ents=entregasDe(t.id);
  const pendientes=S.cuentas.filter(c=>!blocked(c.id) && !(c.entregas||{})[t.id]);
  const rows=ents.map(({cuentaId,e})=>`<tr><td><strong>${esc(e.nombre)}</strong></td><td class="num">${fmtDate(e.fecha)}</td>
    <td class="num hide-sm">${fmtDT(e.enviada)}</td><td>${e.tarde?`<span class="chip warn">Tarde</span>`:`<span class="chip ok">A tiempo</span>`}</td>
    <td><div class="row"><button data-act="verUna" data-id="${esc(cuentaId)}">Ver</button><button data-act="pdfUna" data-id="${esc(cuentaId)}">PDF</button></div></td></tr>`).join("");
  return `<div class="field"><label for="selTarea">Tarea</label><select id="selTarea">${S.tareas.map(x=>`<option value="${esc(x.id)}" ${x.id===t.id?"selected":""}>${esc(x.titulo)}</option>`).join("")}</select></div>
    <div class="row between"><div class="muted">${ents.length} entregadas · ${pendientes.length} pendientes</div>
    <button class="primary" data-act="pdfTodas" ${ents.length?"":"disabled"}>Descargar todas en PDF</button></div>
    ${ents.length?`<div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Fecha</th><th class="hide-sm">Enviada</th><th>Estado</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
      :`<p class="muted" style="margin:0">Nadie ha entregado esta tarea todavía.</p>`}
    ${pendientes.length?`<div class="field"><span class="hint">Pendientes</span><div class="row">${pendientes.map(c=>`<span class="chip warn">${esc(c.nombre||"Sin nombre")}</span>`).join("")}</div></div>`:""}`;
}
function adminCuentas(){
  if(!S.cuentas.length) return `<h2>Cuentas</h2><p class="muted" style="margin:0">Nadie se ha registrado todavía. Compartí el enlace de esta página con tu grupo.</p>`;
  const rows=S.cuentas.map(c=>{ const p=S.profiles[c.id]||{}; const b=blocked(c.id); const n=Object.keys(c.entregas||{}).length;
    return `<tr><td><strong>${esc(c.nombre||"Sin nombre")}</strong>${c.id===S.uid?` <span class="chip soft">Vos</span>`:""}<div class="hint">Cuenta: ${esc(p.name||"—")}${p.guest?" (externa)":""}</div></td>
      <td class="num">${n}</td><td class="hide-sm num">${fmtDT(c.creado)}</td><td>${b?`<span class="chip bad">Desactivada</span>`:`<span class="chip ok">Activa</span>`}</td>
      <td><div class="row"><button data-act="renombrar" data-id="${esc(c.id)}">Editar nombre</button><button data-act="toggleBloqueo" data-id="${esc(c.id)}">${b?"Activar":"Desactivar"}</button>
      <button class="danger" data-act="borrarCuenta" data-id="${esc(c.id)}">Eliminar</button></div></td></tr>`; }).join("");
  return `<h2>Cuentas</h2><p class="hint" style="margin:0">Cada estudiante se registra solo al abrir la página. Desde aquí podés corregir nombres, desactivar o eliminar cuentas.</p>
    <div class="table-wrap"><table><thead><tr><th>Estudiante</th><th>Entregas</th><th class="hide-sm">Registro</th><th>Estado</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function renderEditor(){
  const d=S.draft;
  const qs=d.preguntas.map((q,i)=>`<div class="q"><div class="row between"><strong>Pregunta ${i+1}</strong>
      <div class="row"><button type="button" class="ghost" data-act="qUp" data-id="${i}" aria-label="Subir" ${i===0?"disabled":""}>↑</button>
      <button type="button" class="ghost" data-act="qDown" data-id="${i}" aria-label="Bajar" ${i===d.preguntas.length-1?"disabled":""}>↓</button>
      <button type="button" class="ghost danger" data-act="qDel" data-id="${i}">Quitar</button></div></div>
    <div class="field"><label for="ql_${i}">Pregunta</label><input type="text" id="ql_${i}" data-d="label" data-i="${i}" value="${esc(q.label)}"></div>
    <div class="field"><label for="qa_${i}">Ayuda o ejemplo <span class="hint">(opcional)</span></label><input type="text" id="qa_${i}" data-d="ayuda" data-i="${i}" value="${esc(q.ayuda||"")}"></div>
    <div class="row"><select id="qt_${i}" data-d="tipo" data-i="${i}" aria-label="Tipo de respuesta" style="width:auto"><option value="larga" ${q.tipo!=="corta"?"selected":""}>Respuesta larga</option><option value="corta" ${q.tipo==="corta"?"selected":""}>Respuesta corta</option></select>
    <label class="switch"><input type="checkbox" id="qr_${i}" data-d="requerida" data-i="${i}" ${q.requerida?"checked":""}> Obligatoria</label></div></div>`).join("");
  return `<form class="card" id="editForm"><div class="row between"><button type="button" class="ghost" data-act="cancelEdit">← Volver</button><span class="chip soft">${d.nuevo?"Nueva tarea":"Editando"}</span></div>
    <div class="field"><label for="eTitulo">Título</label><input type="text" id="eTitulo" data-d="titulo" value="${esc(d.titulo)}" required></div>
    <div class="field"><label for="eInstr">Instrucciones</label><textarea id="eInstr" data-d="instrucciones">${esc(d.instrucciones)}</textarea></div>
    <div class="row"><div class="field" style="flex:1;min-width:180px"><label for="eFecha">Fecha límite</label><input type="date" id="eFecha" data-d="fechaLimite" value="${esc(d.fechaLimite)}"></div>
    <label class="switch"><input type="checkbox" id="eActiva" data-d="activa" ${d.activa?"checked":""}> Visible para estudiantes</label></div>
    <p class="hint" style="margin:0">El nombre completo y la fecha se piden siempre. Aquí armás las preguntas de la resolución.</p>
    ${qs}<div class="row"><button type="button" data-act="qAdd">+ Agregar pregunta</button></div>
    <div class="row"><button class="primary" type="submit">Guardar tarea</button><button type="button" data-act="cancelEdit">Cancelar</button></div></form>`;
}

/* ---------- Acciones ---------- */
function startForm(tid){
  const t=tareaById(tid); if(!t) return; const e=(S.cuenta.entregas||{})[tid];
  S.form={ nombre: e?.nombre || S.cuenta.nombre || "", fecha: e?.fecha || todayStr(), respuestas: {...(e?.respuestas||{})} };
  S.sel=tid; S.view="form"; S.editing=true; render(); window.scrollTo(0,0);
}
function startEditor(t, copy){
  S.draft = t ? { id: copy?null:t.id, nuevo: !!copy, titulo: (copy?"Copia de ":"")+(t.titulo||""), instrucciones: t.instrucciones||"", fechaLimite: t.fechaLimite||"", activa: copy?false:!!t.activa,
      preguntas: (t.preguntas||[]).map(q=>({...q, id: copy?q.id:q.id})), creada: copy?null:t.creada }
    : { id:null, nuevo:true, titulo:"", instrucciones:"", fechaLimite:"", activa:true, preguntas:[{id:uidq(),label:"",ayuda:"",tipo:"larga",requerida:true}], creada:null };
  S.view="editor"; S.editing=true; render(); window.scrollTo(0,0);
}
function leaveEditing(){ S.editing=false; S.view="home"; S.draft=null; S.form=null; render(); }

app.addEventListener("input", e=>{
  const el=e.target;
  if(S.view==="form" && S.form){ if(el.dataset.q) S.form.respuestas[el.dataset.q]=el.value; if(el.id==="fNombre") S.form.nombre=el.value; if(el.id==="fFecha") S.form.fecha=el.value; }
  if(S.view==="editor" && S.draft && el.dataset.d){
    const v = el.type==="checkbox" ? el.checked : el.value;
    if(el.dataset.i!==undefined) S.draft.preguntas[+el.dataset.i][el.dataset.d]=v; else S.draft[el.dataset.d]=v;
  }
});
app.addEventListener("change", e=>{
  const el=e.target;
  if(S.view==="editor" && S.draft && el.dataset.d && (el.type==="checkbox" || el.tagName==="SELECT")){
    const v = el.type==="checkbox" ? el.checked : el.value;
    if(el.dataset.i!==undefined) S.draft.preguntas[+el.dataset.i][el.dataset.d]=v; else S.draft[el.dataset.d]=v;
  }
  if(el.id==="selTarea"){ S.sel=el.value; render(); }
});

app.addEventListener("submit", async e=>{
  e.preventDefault(); const f=e.target;
  if(f.id==="regForm"){
    const nombre=f.querySelector("#regNombre").value.trim(); if(nombre.split(/\s+/).length<2){ toast("Escribí tu nombre y apellido."); return; }
    try{ await S.db.doc("cuentas/"+S.uid).set({nombre, creado:new Date().toISOString(), entregas:{}}); toast("¡Listo, perfil creado!"); }
    catch(err){ toast(err&&err.code==="invalid_argument"?"No tenés permiso para registrarte. Pedile a la admin acceso de Colaborador.":"No se pudo guardar. Intentá de nuevo."); }
  }
  if(f.id==="entForm"){
    const t=tareaById(S.sel); const F=S.form;
    if(!F.nombre.trim()){ toast("Falta tu nombre completo."); return; }
    if(!F.fecha){ toast("Falta la fecha."); return; }
    const falta=(t.preguntas||[]).find(q=>q.requerida && !String(F.respuestas[q.id]||"").trim());
    if(falta){ toast("Falta responder: "+falta.label); document.getElementById("q_"+falta.id)?.focus(); return; }
    const prev=(S.cuenta.entregas||{})[t.id]; const now=new Date().toISOString();
    const respuestas={}; (t.preguntas||[]).forEach(q=>respuestas[q.id]=String(F.respuestas[q.id]||"").trim());
    const entry={ titulo:t.titulo, nombre:F.nombre.trim(), fecha:F.fecha, respuestas, preguntas:(t.preguntas||[]).map(q=>({id:q.id,label:q.label})),
      enviada: prev?.enviada || now, actualizada: now, tarde: !!(t.fechaLimite && todayStr()>t.fechaLimite) || !!prev?.tarde };
    const btn=document.getElementById("btnEnviar"); btn.disabled=true;
    try{ await S.db.doc("cuentas/"+S.uid).update({entregas:{[t.id]:entry}}); S.editing=false; S.view="ver"; render(); toast(prev?"Cambios guardados":"¡Tarea entregada!"); }
    catch(err){ btn.disabled=false; toast("No se pudo entregar. Revisá tu conexión e intentá otra vez."); }
  }
  if(f.id==="editForm"){
    const d=S.draft;
    if(!d.titulo.trim()){ toast("La tarea necesita un título."); return; }
    const preguntas=d.preguntas.filter(q=>q.label.trim()).map(q=>({id:q.id||uidq(), label:q.label.trim(), ayuda:(q.ayuda||"").trim(), tipo:q.tipo==="corta"?"corta":"larga", requerida:!!q.requerida}));
    if(!preguntas.length){ toast("Agregá al menos una pregunta."); return; }
    const ref = d.id ? S.db.doc("tareas/"+d.id) : S.db.collection("tareas").doc();
    try{ await ref.set({titulo:d.titulo.trim(), instrucciones:d.instrucciones.trim(), fechaLimite:d.fechaLimite||"", activa:!!d.activa, preguntas, creada:d.creada||new Date().toISOString()});
      toast("Tarea guardada"); S.tab="tareas"; leaveEditing(); }
    catch(err){ toast("No se pudo guardar la tarea."); }
  }
});

app.addEventListener("click", async e=>{
  const b=e.target.closest("[data-act]"); if(!b) return; const act=b.dataset.act, id=b.dataset.id;
  const db=S.db;
  switch(act){
    case "home": S.editing=false; S.view="home"; S.form=null; render(); break;
    case "resolver": startForm(id); break;
    case "ver": S.sel=id; S.view="ver"; render(); window.scrollTo(0,0); break;
    case "pdfMine": { const e2=(S.cuenta.entregas||{})[id]; if(e2) savePdf([{t:tareaById(id),e:e2}], slug(e2.titulo)+"-"+slug(e2.nombre)+".pdf"); break; }
    case "editName": openModal({title:"Editar mi nombre", body:`<div class="field"><label for="mNombre">Nombre completo</label><input type="text" id="mNombre" value="${esc(S.cuenta.nombre)}"></div>`,
        actions:[{label:"Cancelar"},{label:"Guardar",kind:"primary",fn:async r=>{ const v=r.querySelector("#mNombre").value.trim(); if(!v) return false; try{ await db.doc("cuentas/"+S.uid).update({nombre:v}); }catch(_){ toast("No se pudo guardar."); } }}]}); break;
    case "tab": S.tab=id; render(); break;
    case "nueva": startEditor(null); break;
    case "editar": startEditor(tareaById(id)); break;
    case "duplicar": startEditor(tareaById(id), true); break;
    case "cancelEdit": leaveEditing(); break;
    case "qAdd": S.draft.preguntas.push({id:uidq(),label:"",ayuda:"",tipo:"larga",requerida:true}); render(); break;
    case "qDel": S.draft.preguntas.splice(+id,1); render(); break;
    case "qUp": { const a=S.draft.preguntas, i=+id; [a[i-1],a[i]]=[a[i],a[i-1]]; render(); break; }
    case "qDown": { const a=S.draft.preguntas, i=+id; [a[i+1],a[i]]=[a[i],a[i+1]]; render(); break; }
    case "toggleActiva": { const t=tareaById(id); try{ await db.doc("tareas/"+id).update({activa:!t.activa}); }catch(_){ toast("No se pudo cambiar."); } break; }
    case "borrarTarea": { const t=tareaById(id); confirmBox("Eliminar tarea", `Se eliminará "${t.titulo}". Las entregas que ya hicieron se conservan en cada cuenta.`, "Eliminar", async()=>{ try{ await db.doc("tareas/"+id).delete(); toast("Tarea eliminada"); }catch(_){ toast("No se pudo eliminar."); } }); break; }
    case "verEntregas": S.tab="entregas"; S.sel=id; render(); break;
    case "verUna": { const c=S.cuentas.find(x=>x.id===id); const t=tareaById(S.sel); const en=c.entregas[S.sel];
      openModal({title:en.titulo||t.titulo, body:entregaHtml(t,en), actions:[{label:"Cerrar"},{label:"Descargar PDF",kind:"primary",fn:()=>savePdf([{t,e:en}], slug(t.titulo)+"-"+slug(en.nombre)+".pdf")}]}); break; }
    case "pdfUna": { const c=S.cuentas.find(x=>x.id===id); const t=tareaById(S.sel); const en=c.entregas[S.sel]; savePdf([{t,e:en}], slug(t.titulo)+"-"+slug(en.nombre)+".pdf"); break; }
    case "pdfTodas": { const t=tareaById(S.sel); savePdf(entregasDe(t.id).map(x=>({t,e:x.e})), slug(t.titulo)+"-todas.pdf"); break; }
    case "renombrar": { const c=S.cuentas.find(x=>x.id===id);
      openModal({title:"Editar nombre", body:`<div class="field"><label for="mNombre">Nombre completo</label><input type="text" id="mNombre" value="${esc(c.nombre)}"></div>`,
        actions:[{label:"Cancelar"},{label:"Guardar",kind:"primary",fn:async r=>{ const v=r.querySelector("#mNombre").value.trim(); if(!v) return false; try{ await db.doc("cuentas/"+id).update({nombre:v}); }catch(_){ toast("No se pudo guardar."); } }}]}); break; }
    case "toggleBloqueo": { const ids={...S.bloqueos}; if(ids[id]) delete ids[id]; else ids[id]=true;
      try{ await db.doc("config/bloqueos").set({ids}); toast(ids[id]?"Cuenta desactivada":"Cuenta activada"); }catch(_){ toast("No se pudo cambiar el estado."); } break; }
    case "borrarCuenta": { const c=S.cuentas.find(x=>x.id===id); confirmBox("Eliminar cuenta", `Se borrará el perfil de ${c.nombre||"esta persona"} y todas sus entregas. No se puede deshacer.`, "Eliminar", async()=>{ try{ await db.doc("cuentas/"+id).delete(); toast("Cuenta eliminada"); }catch(_){ toast("No se pudo eliminar."); } }); break; }
  }
});

init();
