import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
const worker=await readFile('dist/sw.js','utf8');
const shell=JSON.parse(worker.match(/const SHELL\s*=\s*(\[[^;]+\]);/)[1]);
assert.match(worker,/pace-shell-[a-f0-9]{16}/);
async function walk(path){const out=[];for(const e of await readdir(path,{withFileTypes:true})){const p=path+'/'+e.name;out.push(...(e.isDirectory()?await walk(p):[p]))}return out}
const files=await walk('dist/assets');let bytes=0;
for(const f of files){bytes+=(await stat(f)).size;assert.ok(shell.includes('/'+f.slice(5)),`precache missing ${f}`)}
assert.ok(files.some(f=>/GroupsView.*\.js$/.test(f)));
assert.ok(files.some(f=>/SettingsView.*\.js$/.test(f)));
assert.ok(files.some(f=>/ProgressView.*\.js$/.test(f)));
assert.ok(!files.some(f=>/DMSans|Nunito|assets\/fonts\//.test(f)),'unused/copied fonts must not be shipped');
assert.ok(bytes<2*1024*1024,`static asset budget exceeded: ${bytes}`);
console.log(`PASS: versioned offline shell contains ${shell.length} paths; ${bytes} bytes of static assets.`);
