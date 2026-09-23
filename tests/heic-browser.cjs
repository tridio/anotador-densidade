const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const fixture = fs.readFileSync(process.argv[2]);
const server = http.createServer((req,res)=>{
 const pathname = new URL(req.url,'http://localhost').pathname;
 if(pathname === '/sample.heic'){res.end(fixture);return;}
 const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 if(!fs.existsSync(file)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');
 res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.evaluate(async()=>{
   const dir=await navigator.storage.getDirectory();
   const handle=await dir.getFileHandle('photo.HEIC',{create:true});
   const w=await handle.createWritable();await w.write(await (await fetch('/sample.heic')).blob());await w.close();
   window.testDir=dir;window.testOriginal=handle;
   window.showOpenFilePicker=async()=>[handle];
   window.showDirectoryPicker=async()=>dir;
   // OPFS has no permission prompts; emulate the permission check only.
   ensureWritable=async()=>true;
 });
 await page.click('#btnPickFilesStart');
 await page.waitForFunction(()=>images.length===1,{},{timeout:60000});
 const converted=await page.evaluate(async()=>{
   const img=images[0];const bitmap=await createImageBitmap(await ensureBlob(img));
   const result={type:img.type,width:bitmap.width,height:bitmap.height,name:auditBaseName(img)};bitmap.close();return result;
 });
 assert.equal(converted.type,'image/png');assert.equal(converted.name,'audit_photo.png');
 assert(converted.width>0 && converted.height>0);
 await page.click('#grid-work .thumb');
 await page.fill('#inpUnid','10');await page.fill('#inpArea','2');
 await page.click('#btnSaveBack');
 await page.waitForFunction(()=>images[0].annotated);
 const saved=await page.evaluate(async()=>{
   const output=await (await testDir.getFileHandle('audit_photo.png')).getFile();
   const bitmap=await createImageBitmap(output);const result={signature:[...new Uint8Array(await output.slice(0,8).arrayBuffer())],width:bitmap.width,height:bitmap.height};bitmap.close();
   result.original=Array.from(new Uint8Array(await (await testOriginal.getFile()).arrayBuffer()));
   return result;
 });
 assert.deepEqual(saved.signature,[137,80,78,71,13,10,26,10]);
 assert.equal(saved.width,converted.width);assert.equal(saved.height,converted.height);
 assert.deepEqual(Buffer.from(saved.original),fixture);
 const undo=await page.evaluate(async()=>{
   await undoLegends(images[0].id);
   const output=await (await testDir.getFileHandle('audit_photo.png')).getFile();
   const base=await ensureBlob(images[0]);
   return {output:[...new Uint8Array(await output.arrayBuffer())],base:[...new Uint8Array(await base.arrayBuffer())]};
 });
 assert.deepEqual(undo.output,undo.base);
 const regression=await page.evaluate(async()=>{
   const dir=testDir;
   const heif=await addImage('other.heif','',await testOriginal.getFile(),null);
   const invalid=await addImage('bad.heic','image/heic',new File(['invalid'],'bad.heic'),null);
   const canvas=document.createElement('canvas');canvas.width=30;canvas.height=20;
   const png=await new Promise(r=>canvas.toBlob(r,'image/png'));
   const normal=await addImage('normal.png','image/png',new File([png],'normal.png',{type:'image/png'}),null);
   const jpeg=await new Promise(r=>canvas.toBlob(r,'image/jpeg'));
   const jpg=await addImage('normal.jpg','image/jpeg',new File([jpeg],'normal.jpg',{type:'image/jpeg'}),null);
   // Existing copies are preserved and get a numbered successor for a new source.
   await prepareAuditDirectory(heif);await writeAuditCopy(heif,await ensureBlob(heif));
   return {heifName:heif.outputName,invalid:invalid===null,pngName:auditBaseName(normal),jpgName:auditBaseName(jpg),count:images.length};
 });
 assert.deepEqual(regression,{heifName:'audit_other.png',invalid:true,pngName:'audit_normal.png',jpgName:'audit_normal.jpg',count:4});
 assert.deepEqual(errors,[]);
 console.log('PASS real HEIC decode, thumbnail, annotation, PNG dimensions/signature, unchanged original, undo PNG, HEIF extension, corrupt HEIC rejection, PNG/JPEG regression.',converted);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
