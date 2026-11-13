import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {cp,copyFile,readFile,writeFile,readdir} from 'node:fs/promises';
import {buildTheme} from './scripts/build-theme.mjs';
export default defineConfig({
  plugins:[react(),{
    name:'pace-pages-pwa',
    async buildStart(){await buildTheme()},
    async closeBundle(){
      await cp('assets/fonts','dist/assets/fonts',{recursive:true});
      await cp('assets/icons','dist/assets/icons',{recursive:true});
      for(const file of ['manifest.webmanifest','_headers','_routes.json']) await copyFile(file,'dist/'+file);
      const files=[];
      async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=dir+'/'+entry.name;if(entry.isDirectory())await walk(path);else files.push('/'+path.replace(/^dist\//,''))}}
      await walk('dist/assets');
      const worker=await readFile('sw.js','utf8');
      await writeFile('dist/sw.js',worker.replace(/const SHELL\s*=\s*\[[^;]+;/,'const SHELL = '+JSON.stringify(['/','/index.html','/manifest.webmanifest',...files])+';'));
    }
  }],
  build:{outDir:'dist',emptyOutDir:true},
});
