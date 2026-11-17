export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const todayStr = () => { const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
export const fmtDate = s => { if(!s) return "—"; const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d).toLocaleDateString("es-GT",{day:"numeric",month:"short",year:"numeric"}); };
export const fmtDT = iso => iso ? new Date(iso).toLocaleString("es-GT",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}) : "—";
export const slug = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50) || "tarea";
export const uidq = () => Math.random().toString(36).slice(2,9);
