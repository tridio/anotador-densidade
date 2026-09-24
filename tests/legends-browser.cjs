const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname!=='/'){res.writeHead(404).end();return;}
 res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(path.join(root,'index.html')));
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1400,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=800;
  const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1000,800);
  const blob=await new Promise(r=>canvas.toBlob(r));
  const dir=await navigator.storage.getDirectory();
  const original=await dir.getFileHandle('original.png',{create:true});
  const w=await original.createWritable();await w.write(blob);await w.close();
  window.testDir=dir;window.testOriginal=original;
  ensureWritable=async()=>true;
  window.showOpenFilePicker=async()=>[original];window.showDirectoryPicker=async()=>dir;
 });
 await page.click('#btnPickFilesStart');await page.click('#grid-work .thumb');
 await page.fill('#inpUnid','10');await page.fill('#inpArea','2');
 const firstLegend=page.locator('.legend').first();
 const initialSize=await firstLegend.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
 assert.equal(await firstLegend.getByRole('button',{name:'Aumentar legenda'}).isVisible(),false);
 await firstLegend.hover();
 await firstLegend.getByRole('button',{name:'Aumentar legenda'}).click();
 const largerSize=await firstLegend.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
 assert.ok(Math.abs(largerSize/initialSize-1.1)<0.001);
 assert.equal(await page.inputValue('#inpUnid'),'10','resizing must not commit or drag the pending legend');
 assert.equal(await page.evaluate(()=>images[0].legends[0].x),null);
 const box=await page.locator('.legend').boundingBox();
 await page.mouse.move(box.x+15,box.y+15);await page.mouse.down();
 await page.mouse.move(box.x-350,box.y-300,{steps:8});await page.mouse.up();
 assert.equal(await page.inputValue('#inpUnid'),'');
 await page.fill('#inpUnid','21');await page.fill('#inpArea','3');
 assert.equal(await page.locator('.legend').count(),2);
 assert.equal(await page.locator('.legend.pendente').count(),1);
 assert.deepEqual(await page.evaluate(()=>images[0].legends.map(leg=>leg.scale)),[1.1,1.1],
  'new legends inherit the last chosen size');
 const beforeResize=await page.evaluate(async()=>Array.from(new Uint8Array(await (await burnImage(images[0])).arrayBuffer())));
 const secondLegend=page.locator('.legend').nth(1);
 await secondLegend.hover();
 const toolBox=await secondLegend.getByRole('button',{name:'Diminuir legenda'}).boundingBox();
 const stageBox=await page.locator('#imgStage').boundingBox();
 assert.ok(toolBox.x+toolBox.width<=stageBox.x+stageBox.width,'right-edge controls must remain accessible');
 await secondLegend.getByRole('button',{name:'Diminuir legenda'}).click();
 assert.deepEqual(await page.evaluate(()=>images[0].legends.map(leg=>leg.scale)),[1.1,1],
  'resizing one legend leaves the other unchanged');
 await firstLegend.hover();
 await firstLegend.getByRole('button',{name:'Aumentar legenda'}).click();
 await firstLegend.getByRole('button',{name:'Aumentar legenda'}).click();
 const chosenScale=await page.evaluate(()=>images[0].legends[0].scale);
 assert.ok(Math.abs(chosenScale-1.331)<0.00001,'controls support repeated clicks');
 // Record the complete rendered result before closing the editor.
 const expected=await page.evaluate(async()=>Array.from(new Uint8Array(await (await burnImage(images[0])).arrayBuffer())));
 assert.notDeepEqual(expected,beforeResize,'exported image must reflect individual size changes');
 await page.click('#btnSaveBack');await page.waitForFunction(()=>currentId===null);
 const first=await page.evaluate(async()=>({
  saved:Array.from(new Uint8Array(await (await (await testDir.getFileHandle(images[0].outputName)).getFile()).arrayBuffer())),
  count:images[0].legends.length
 }));
 assert.deepEqual(first.saved,expected,'initial output must include both legends');
 assert.equal(first.count,2,'both saved legends must remain in the session');
 await page.click('#grid-work .thumb');
 await page.waitForFunction(()=>document.querySelectorAll('.legend').length===2);
 assert.equal(await page.locator('.legend').count(),2);
 assert.equal(await page.locator('.legend.pendente').count(),0);
 assert.deepEqual(await page.evaluate(()=>images[0].legends.map(leg=>leg.scale)),[chosenScale,1]);
 await page.click('#btnSaveBack');await page.waitForFunction(()=>currentId===null);
 const second=await page.evaluate(async()=>Array.from(new Uint8Array(await (await (await testDir.getFileHandle(images[0].outputName)).getFile()).arrayBuffer())));
 assert.deepEqual(second,expected,'reopening and saving must not remove the last legend');
 // Failed writes must leave the pending legend editable for a retry.
 await page.click('#grid-work .thumb');await page.fill('#inpUnid','30');await page.fill('#inpArea','3');
 assert.equal(await page.evaluate(()=>images[0].legends[2].scale),chosenScale,
  'the last edited size remains the default after saving and reopening');
 await page.evaluate(()=>{window.realWrite=writeAuditCopy;writeAuditCopy=async()=>{throw Error('test failure')};});
 await page.click('#btnSaveBack');await page.waitForFunction(()=>!document.getElementById('btnSaveBack').disabled);
 assert.equal(await page.locator('.legend.pendente').count(),1);
 assert.equal(await page.inputValue('#inpUnid'),'30');
 await page.evaluate(()=>{writeAuditCopy=realWrite;});
 // Explicit Cancel still discards only the unsaved pending legend.
 await page.click('#btnCancel');
 assert.equal(await page.evaluate(()=>images[0].legends.length),2);
 assert.deepEqual(errors,[]);
 console.log('PASS: individual resizing, hover controls, inherited size, repeated clicks, export, save/reopen, failed save and cancel.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
