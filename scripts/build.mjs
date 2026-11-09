import {mkdir,copyFile,cp} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await copyFile('node_modules/@astryxdesign/theme-matcha/dist/theme.css','assets/astryx-matcha.css');
for(const file of ['index.html','manifest.webmanifest','sw.js','_headers','_routes.json'])await copyFile(file,'dist/'+file);
await cp('assets','dist/assets',{recursive:true,force:true});
console.log('PACE static assets prepared in dist/');
