import { fmtDate, fmtDT } from "./utils.js";

export function buildPdf(items){
  const { jsPDF } = window.jspdf; const doc=new jsPDF({unit:"mm",format:"letter"});
  const W=doc.internal.pageSize.getWidth(), H=doc.internal.pageSize.getHeight(), M=18, TW=W-M*2;
  items.forEach((it,idx)=>{
    if(idx>0) doc.addPage();
    const {t,e}=it; let y=0;
    doc.setFillColor(13,122,104); doc.rect(0,0,W,30,"F");
    doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(16);
    doc.text(doc.splitTextToSize(e.titulo || t?.titulo || "Tarea", TW)[0], M, 14);
    doc.setFont("helvetica","normal"); doc.setFontSize(10);
    doc.text("Buzón de Tareas  ·  Fecha límite: "+fmtDate(t?.fechaLimite), M, 22);
    y=42; doc.setTextColor(22,35,42);
    const line=(label,val)=>{ doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.text(label,M,y); doc.setFont("helvetica","normal"); doc.text(String(val||"—"),M+42,y); y+=7; };
    line("Nombre completo:", e.nombre); line("Fecha:", fmtDate(e.fecha)); line("Entregada:", fmtDT(e.enviada)+(e.tarde?"  (tarde)":""));
    y+=3; doc.setDrawColor(213,223,219); doc.line(M,y,W-M,y); y+=9;
    const qs=(e.preguntas && e.preguntas.length ? e.preguntas : (t?.preguntas||[]));
    const ensure=h=>{ if(y+h>H-18){ doc.addPage(); y=20; } };
    qs.forEach((q,i)=>{
      doc.setFont("helvetica","bold"); doc.setFontSize(12); doc.setTextColor(13,122,104);
      const lab=doc.splitTextToSize((i+1)+". "+q.label, TW); ensure(lab.length*6+6); doc.text(lab,M,y); y+=lab.length*6+1;
      doc.setFont("helvetica","normal"); doc.setFontSize(11); doc.setTextColor(22,35,42);
      const ans=String((e.respuestas||{})[q.id]||"(sin respuesta)");
      ans.split("\n").forEach(par=>{ const ls=doc.splitTextToSize(par||" ", TW); ls.forEach(l=>{ ensure(6); doc.text(l,M,y); y+=5.6; }); });
      y+=6;
    });
  });
  const n=doc.getNumberOfPages();
  for(let p=1;p<=n;p++){ doc.setPage(p); doc.setFontSize(9); doc.setTextColor(120,130,130); doc.text("Página "+p+" de "+n, W-M, H-10, {align:"right"}); }
  return doc.output("blob");
}
