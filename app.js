const $=id=>document.getElementById(id);
let csvText="",lastResult=null;
const MAX_FILE_BYTES=5*1024*1024;

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
function make(tag,text,className){
  const el=document.createElement(tag);
  if(text!==undefined&&text!==null) el.textContent=String(text);
  if(className) el.className=className;
  return el;
}
function showError(message){
  $("errorBox").textContent=message;
  $("errorBox").classList.remove("hidden");
}
function clearError(){
  $("errorBox").textContent="";
  $("errorBox").classList.add("hidden");
}

async function readTextFile(file){
  if(file.size>MAX_FILE_BYTES) throw new Error("File troppo grande. Limite: 5 MB.");
  const buffer=await file.arrayBuffer();
  try{
    return new TextDecoder("utf-8",{fatal:true}).decode(buffer);
  }catch{
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

$("fileInput").addEventListener("change",async e=>{
  const file=e.target.files[0];
  if(!file) return;
  try{
    csvText=await readTextFile(file);
    $("fileName").textContent=file.name;
    $("analyzeBtn").disabled=false;
    clearError();
  }catch(err){
    csvText="";
    $("analyzeBtn").disabled=true;
    showError("Impossibile leggere il file: "+err.message);
  }
});
$("sampleBtn").addEventListener("click",async()=>{
  try{
    csvText=await fetch("samples/sales.csv",{cache:"no-store"}).then(r=>{
      if(!r.ok) throw new Error("Dati demo non disponibili.");
      return r.text();
    });
    $("fileName").textContent="sales.csv (demo)";
    $("analyzeBtn").disabled=false;
    clearError();
    analyze();
  }catch(err){showError("Impossibile caricare i dati demo: "+err.message);}
});
$("analyzeBtn").addEventListener("click",analyze);
$("printBtn").addEventListener("click",()=>window.print());
$("exportBtn").addEventListener("click",()=>{
  if(lastResult) downloadCSV(ReportFlow.summaryCSV(lastResult),"reportflow-riepilogo.csv");
});
$("exportDataBtn").addEventListener("click",()=>{
  if(lastResult) downloadCSV(ReportFlow.normalizedCSV(lastResult),"reportflow-dati.csv");
});

function downloadCSV(text,name){
  const blob=new Blob(["\uFEFF"+text],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}

function analyze(){
  try{
    clearError();
    lastResult=ReportFlow.analyze(ReportFlow.parseCSV(csvText));
    render();
    $("report").classList.remove("hidden");
    $("emptyState").classList.add("hidden");
    $("report").scrollIntoView({behavior:"smooth",block:"start"});
  }catch(err){
    showError(err.message+" Formati supportati: CSV separati da virgola, punto e virgola o tab.");
  }
}

function renderKpis(r){
  const t=r.totals;
  const values=[
    ["Ricavi",money(t.revenue)],
    ["Costi",money(t.cost)],
    ["Margine",money(t.margin)],
    ["Margine %",pct(t.marginPct)],
    ["Righe analizzate",t.rows]
  ];
  const container=$("kpis");
  container.replaceChildren();
  values.forEach(([label,value])=>{
    const card=make("div",null,"kpi");
    card.append(make("span",label),make("strong",value));
    container.append(card);
  });
}

function renderChart(r){
  const container=$("monthlyChart");
  container.replaceChildren();
  const max=Math.max(...r.months.map(x=>x.revenue),1);
  r.months.forEach(x=>{
    const item=make("div",null,"bar-item");
    const value=make("span",money(x.revenue),"bar-value");
    const bar=make("div",null,"bar");
    bar.style.height=Math.max(3,x.revenue/max*150)+"px";
    bar.title=money(x.revenue);
    const label=make("span",monthLabel(x.month),"bar-label");
    item.append(value,bar,label);
    container.append(item);
  });
}

function renderInsights(r){
  const i=r.insights;
  const values=[
    ["Categoria principale",i.bestCategory?i.bestCategory.category+" - "+money(i.bestCategory.revenue):"-",""],
    ["Margine % migliore",i.bestMargin?i.bestMargin.category+" - "+pct(i.bestMargin.marginPct):"-",""],
    ["Variazione ultimo mese",i.growthPct==null?"-":pct(i.growthPct),(i.growthPct??0)>=0?"positive":"negative"]
  ];
  const container=$("insights");
  container.replaceChildren();
  values.forEach(([label,value,className])=>{
    const card=make("div",null,"insight");
    const strong=make("strong",value,className);
    card.append(make("span",label),strong);
    container.append(card);
  });
}

function appendCell(row,text,className){
  const td=make("td",text,className);
  row.append(td);
}

function renderCategories(r){
  const tbody=$("categoryRows");
  tbody.replaceChildren();
  r.categories.forEach(x=>{
    const tr=document.createElement("tr");
    appendCell(tr,x.category);
    appendCell(tr,money(x.revenue));
    appendCell(tr,money(x.cost));
    appendCell(tr,money(x.margin),x.margin>=0?"positive":"negative");
    appendCell(tr,pct(x.marginPct));
    appendCell(tr,x.share.toFixed(1)+"%");
    tbody.append(tr);
  });
}

function render(){
  const r=lastResult;
  $("periodLabel").textContent=r.period.from&&r.period.to
    ? dateLabel(r.period.from)+" - "+dateLabel(r.period.to)
    : "";
  renderKpis(r);
  renderChart(r);
  renderInsights(r);
  renderCategories(r);
}

if(new URLSearchParams(location.search).get("demo")==="1") $("sampleBtn").click();
