const assert=require("assert");
const fs=require("fs");
const path=require("path");
const core=require("../core.js");

const text=fs.readFileSync(path.join(__dirname,"../samples/sales.csv"),"utf8");
const rows=core.parseCSV(text);
const result=core.analyze(rows);

assert.equal(rows.length,18);
assert.equal(result.totals.rows,18);
assert.equal(result.months.length,6);
assert.equal(result.categories.length,3);
assert.equal(result.insights.bestCategory.category,"Pranzo");
assert.ok(result.totals.revenue>result.totals.cost);
assert.ok(result.totals.marginPct>0);
assert.ok(result.insights.growthPct>0);

const italian=core.parseCSV('data;categoria;ricavi;costi\n01/07/2026;"Servizio speciale";1.250,50;500,25\n');
const parsed=core.analyze(italian);
assert.equal(parsed.totals.revenue,1250.50);
assert.equal(parsed.totals.cost,500.25);

const out=core.summaryCSV(result);
assert.ok(out.includes("Categoria"));
assert.ok(out.includes("Pranzo"));

const normalized=core.normalizedCSV(result);
const roundtripRows=core.parseCSV(normalized);
const roundtrip=core.analyze(roundtripRows);
assert.equal(roundtrip.totals.rows,18);
assert.equal(roundtrip.totals.revenue,result.totals.revenue);
assert.equal(roundtrip.totals.cost,result.totals.cost);

let summaryRejected=false;
try{ core.analyze(core.parseCSV(out)); }catch(err){
  summaryRejected=/riepilogo esportato/.test(err.message);
}
assert.equal(summaryRejected,true);

console.log("OK - all ReportFlow tests passed");
