(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  else root.ReportFlow=api;
})(typeof self!=="undefined"?self:this,function(){
  function norm(value){
    return String(value??"").trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  }

  function parseCSV(text){
    const rows=[]; let row=[]; let field=""; let quoted=false;
    const s=String(text).replace(/^\uFEFF/,"");
    for(let i=0;i<s.length;i++){
      const ch=s[i], next=s[i+1];
      if(ch==='"'){
        if(quoted&&next==='"'){field+='"';i++;}
        else quoted=!quoted;
      }else if(ch===","&&!quoted){row.push(field);field="";}
      else if((ch==="\n"||ch==="\r")&&!quoted){
        if(ch==="\r"&&next==="\n") i++;
        row.push(field);field="";
        if(row.some(v=>String(v).trim()!=="")) rows.push(row);
        row=[];
      }else field+=ch;
    }
    row.push(field);
    if(row.some(v=>String(v).trim()!=="")) rows.push(row);
    if(rows.length<2) throw new Error("Il CSV non contiene righe dati.");
    const headers=rows[0].map(h=>String(h).trim());
    return rows.slice(1).map(r=>{
      const obj={};
      headers.forEach((h,i)=>obj[h]=String(r[i]??"").trim());
      return obj;
    });
  }

  function detect(headers,candidates){
    const n=headers.map(norm);
    for(const c of candidates){
      const i=n.indexOf(norm(c));
      if(i>=0) return headers[i];
    }
    return null;
  }

  function parseNumber(value){
    let s=String(value??"").trim().replace(/[€$£\s]/g,"");
    if(!s) return NaN;
    const comma=s.lastIndexOf(","), dot=s.lastIndexOf(".");
    if(comma>=0&&dot>=0){
      if(comma>dot) s=s.replace(/\./g,"").replace(",",".");
      else s=s.replace(/,/g,"");
    }else if(comma>=0) s=s.replace(",",".");
    return Number(s);
  }

  function parseDate(value){
    const s=String(value??"").trim();
    let d=new Date(s);
    if(!Number.isNaN(d.getTime())) return d;
    const m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if(m){
      d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));
      if(!Number.isNaN(d.getTime())) return d;
    }
    return null;
  }

  function schema(rows){
    const h=Object.keys(rows[0]||{});
    const date=detect(h,["data","date","giorno"]);
    const category=detect(h,["categoria","category","reparto","segmento","tipo"]);
    const revenue=detect(h,["ricavi","revenue","vendite","sales","fatturato","totale"]);
    const cost=detect(h,["costi","cost","costo","costs","spese"]);
    if(!date||!category||!revenue||!cost)
      throw new Error("Servono colonne per data, categoria, ricavi e costi.");
    return {date,category,revenue,cost};
  }

  function monthKey(d){
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
  }

  function analyze(rows){
    const s=schema(rows);
    const clean=rows.map((r,index)=>{
      const date=parseDate(r[s.date]);
      const revenue=parseNumber(r[s.revenue]);
      const cost=parseNumber(r[s.cost]);
      const category=String(r[s.category]||"Senza categoria").trim()||"Senza categoria";
      if(!date) throw new Error("Data non valida alla riga "+(index+2));
      if(Number.isNaN(revenue)||Number.isNaN(cost)) throw new Error("Valore numerico non valido alla riga "+(index+2));
      return {date,category,revenue,cost,margin:revenue-cost};
    }).sort((a,b)=>a.date-b.date);

    const totals=clean.reduce((a,x)=>{
      a.revenue+=x.revenue;a.cost+=x.cost;a.margin+=x.margin;return a;
    },{revenue:0,cost:0,margin:0});
    totals.marginPct=totals.revenue?totals.margin/totals.revenue*100:0;
    totals.rows=clean.length;

    const catMap=new Map();
    clean.forEach(x=>{
      const v=catMap.get(x.category)||{category:x.category,revenue:0,cost:0,margin:0,rows:0};
      v.revenue+=x.revenue;v.cost+=x.cost;v.margin+=x.margin;v.rows++;
      catMap.set(x.category,v);
    });
    const categories=[...catMap.values()].map(x=>({
      ...x,
      marginPct:x.revenue?x.margin/x.revenue*100:0,
      share:totals.revenue?x.revenue/totals.revenue*100:0
    })).sort((a,b)=>b.revenue-a.revenue);

    const monthMap=new Map();
    clean.forEach(x=>{
      const key=monthKey(x.date);
      const v=monthMap.get(key)||{month:key,revenue:0,cost:0,margin:0};
      v.revenue+=x.revenue;v.cost+=x.cost;v.margin+=x.margin;
      monthMap.set(key,v);
    });
    const months=[...monthMap.values()].sort((a,b)=>a.month.localeCompare(b.month));

    const bestCategory=categories[0]||null;
    const bestMargin=[...categories].sort((a,b)=>b.marginPct-a.marginPct)[0]||null;
    let growthPct=null;
    if(months.length>=2){
      const prev=months[months.length-2].revenue, curr=months[months.length-1].revenue;
      growthPct=prev?((curr-prev)/prev)*100:null;
    }

    return {
      rows:clean,
      totals,
      categories,
      months,
      period:{
        from:clean[0]?.date||null,
        to:clean[clean.length-1]?.date||null
      },
      insights:{bestCategory,bestMargin,growthPct}
    };
  }

  function escapeCsv(v){
    const s=String(v??"");
    return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
  }

  function summaryCSV(result){
    const head=["Categoria","Ricavi","Costi","Margine","Margine %","Quota %"];
    const rows=result.categories.map(x=>[
      x.category,x.revenue.toFixed(2),x.cost.toFixed(2),x.margin.toFixed(2),x.marginPct.toFixed(2),x.share.toFixed(2)
    ]);
    return [head,...rows].map(r=>r.map(escapeCsv).join(",")).join("\n");
  }

  return {parseCSV,parseNumber,parseDate,analyze,summaryCSV};
});