const assert=require("assert");
const fs=require("fs");
const path=require("path");
const core=require("../core.js");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const app=fs.readFileSync(path.join(__dirname,"../app.js"),"utf8");

const xss='<img src=x onerror=alert(1)>';
const result=core.analyze(core.parseCSV('data,categoria,ricavi,costi\n2026-01-01,"'+xss+'",100,20\n'));
assert.equal(result.categories[0].category,xss);

const formula=core.analyze(core.parseCSV('data,categoria,ricavi,costi\n2026-01-01,=1+1,100,20\n'));
const exported=core.normalizedCSV(formula);
assert.ok(exported.includes("'=1+1"));
assert.equal(core.analyze(core.parseCSV(exported)).categories[0].category,"=1+1");

assert.throws(()=>core.parseCSV("a,b\n"+"x".repeat(core.LIMITS.fieldChars+1)+",1"),/troppo lungo/i);
assert.ok(/Content-Security-Policy/.test(html));
assert.ok(/script-src 'self'/.test(html));
assert.ok(/object-src 'none'/.test(html));
assert.ok(!/innerHTML|insertAdjacentHTML|document\.write|\beval\s*\(|new Function/.test(app));
console.log("OK - ReportFlow security tests passed");
