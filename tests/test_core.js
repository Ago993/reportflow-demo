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

const italian=core.parseCSV('data;categoria;ricavi;costi\n01/07/2026;"Servizio speciale";1.250,50;500,25\n');
const parsed=core.analyze(italian);
assert.equal(parsed.totals.revenue,1250.50);
assert.equal(parsed.totals.cost,500.25);

const normalized=core.normalizedCSV(result);
const roundtrip=core.analyze(core.parseCSV(normalized));
assert.equal(roundtrip.totals.rows,18);
assert.equal(roundtrip.totals.revenue,result.totals.revenue);

const formula='=HYPERLINK("https://evil.invalid","click")';
const hostile=core.analyze(core.parseCSV('data,categoria,ricavi,costi\n2026-09-01,"'+formula.replace(/"/g,'""')+'",10,2\n'));
const hostileCsv=core.normalizedCSV(hostile);
assert.ok(hostileCsv.includes("'=HYPERLINK"));
assert.equal(core.analyze(core.parseCSV(hostileCsv)).categories[0].category,formula);

const htmlPayload='<img src=x onerror=alert(1)>';
const xssRows=core.parseCSV('data,categoria,ricavi,costi\n2026-09-01,"'+htmlPayload+'",10,2\n');
assert.equal(core.analyze(xssRows).categories[0].category,htmlPayload);

const out=core.summaryCSV(result);
let summaryRejected=false;
try{core.analyze(core.parseCSV(out));}catch(err){summaryRejected=/riepilogo esportato/.test(err.message);}
assert.equal(summaryRejected,true);

assert.throws(()=>core.parseCSV("x".repeat(core.LIMITS.csvChars+1)),/troppo grande/);
assert.ok(Number.isNaN(core.parseNumber("1e9999")));

const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"../app.js"),"utf8");
assert.ok(/Content-Security-Policy/.test(html));
assert.ok(/script-src 'self'/.test(html));
assert.ok(/object-src 'none'/.test(html));
assert.ok(!/\.innerHTML\s*=/.test(app),"Dynamic data must not be rendered through innerHTML");

console.log("OK - ReportFlow security and data tests passed");
