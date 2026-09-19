const $=id=>document.getElementById(id);
let csvText="",lastResult=null;

function money(v){
  return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(v);
}
function pct(v){
  if(v==null||Number.isNaN(v)) return "-";
  return (v>0?"+":"")+v.toFixed(1)+"%";
}
function monthLabel(key){
  const [y,m]=key.split("-").map(Number);
  return new Intl.DateTimeFormat("it-IT",{month:"short",year:"2-digit"}).format(new Date(y,m-1,1));
}
function dateLabel(d){
  return new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"short",year:"numeric"}).format(d);
}

$("fileInput").addEventListener("change",async e=>{
  const file=e.target.files[0];
  if(!file) return;
  csvText=await file.text();
  $("fileName").textContent=file.name;
  $("analyzeBtn").disabled=false;
});
$("sampleBtn").addEventListener("click",async()=>{
  try{
    csvText=await fetch("samples/sales.csv").then(r=>r.text());
    $("fileName").textContent="sales.csv (demo)";
    $("analyzeBtn").disabled=false;
    analyze();
  }catch(err){alert("Impossibile caricare i dati demo: "+err.message);}
});
$("analyzeBtn").addEventListener("click",analyze);
$("printBtn").addEventListener("click",()=>window.print());
$("exportBtn").addEventListener("click",()=>{
  if(!lastResult) return;
  const blob=new Blob([ReportFlow.summaryCSV(lastResult)],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="reportflow-riepilogo.csv";a.click();URL.revokeObjectURL(url);
});

function analyze(){
  try{
    lastResult=ReportFlow.analyze(ReportFlow.parseCSV(csvText));
    render();
    $("report").classList.remove("hidden");
    $("emptyState").classList.add("hidden");
    $("report").scrollIntoView({behavior:"smooth",block:"start"});
  }catch(err){alert(err.message);}
}

function render(){
  const r=lastResult,t=r.totals;
  $("periodLabel").textContent=r.period.from&&r.period.to
    ? dateLabel(r.period.from)+" - "+dateLabel(r.period.to)
    : "";
  const kpis=[
    ["Ricavi",money(t.revenue)],
    ["Costi",money(t.cost)],
    ["Margine",money(t.margin)],
    ["Margine %",pct(t.marginPct)],
    ["Righe analizzate",t.rows]
  ];
  $("kpis").innerHTML=kpis.map(([k,v])=>'<div class="kpi"><span>'+k+'</span><strong>'+v+'</strong></div>').join("");

  const max=Math.max(...r.months.map(x=>x.revenue),1);
  $("monthlyChart").innerHTML=r.months.map(x=>{
    const h=Math.max(3,x.revenue/max*150);
    return '<div class="bar-item">'+
      '<span class="bar-value">'+money(x.revenue)+'</span>'+
      '<div class="bar" style="height:'+h+'px" title="'+money(x.revenue)+'"></div>'+
      '<span class="bar-label">'+monthLabel(x.month)+'</span>'+
    '</div>';
  }).join("");

  const i=r.insights;
  const growthClass=(i.growthPct??0)>=0?"positive":"negative";
  $("insights").innerHTML=[
    ['Categoria principale',i.bestCategory?i.bestCategory.category+" - "+money(i.bestCategory.revenue):"-",""],
    ['Margine % migliore',i.bestMargin?i.bestMargin.category+" - "+pct(i.bestMargin.marginPct):"-",""],
    ['Variazione ultimo mese',i.growthPct==null?"-":pct(i.growthPct),growthClass]
  ].map(([k,v,c])=>'<div class="insight"><span>'+k+'</span><strong class="'+c+'">'+v+'</strong></div>').join("");

  $("categoryRows").innerHTML=r.categories.map(x=>
    '<tr><td>'+escapeHtml(x.category)+'</td>'+
    '<td>'+money(x.revenue)+'</td>'+
    '<td>'+money(x.cost)+'</td>'+
    '<td class="'+(x.margin>=0?"positive":"negative")+'">'+money(x.margin)+'</td>'+
    '<td>'+pct(x.marginPct)+'</td>'+
    '<td>'+x.share.toFixed(1)+'%</td></tr>'
  ).join("");
}
function escapeHtml(v){
  return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
if(new URLSearchParams(location.search).get("demo")==="1") $("sampleBtn").click();


