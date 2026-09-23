const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const saving = script.slice(script.indexOf('let auditDirectory = null;'), script.indexOf('/* ===================== SALVAR CÓPIA'));
new vm.Script(script);
function setup(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'audit-save-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const downloads=[];
  const handle=name=>({name, filePath:path.join(root,name),
    async isSameEntry(other){return this.filePath===other.filePath},
    async createWritable(){return {write:async blob=>fs.writeFileSync(path.join(root,name),blob),close:async()=>{},abort:async()=>{}}}
  });
  const directory={async getFileHandle(name,options){
    if(!fs.existsSync(path.join(root,name))){
      if(!options?.create)throw Object.assign(new Error('missing'),{name:'NotFoundError'});
      fs.writeFileSync(path.join(root,name),'');
    }
    return handle(name);
  }};
  fs.writeFileSync(path.join(root,'foto.jpg'),'original bytes');
  const img={name:'foto.jpg',handle:handle('foto.jpg'),directory};
  const context={window:{showDirectoryPicker:async()=>directory},images:[img],ensureWritable:async()=>true,toast:()=>{},setTimeout:()=>{},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:()=>{}},document:{body:{appendChild(){}},createElement:()=>({click(){downloads.push(this.download)},remove(){}})}};
  vm.createContext(context);vm.runInContext(saving,context);
  return {context,img,handle,downloads,root,read:name=>fs.readFileSync(path.join(root,name),'utf8')};
}
test('save, save again and undo change only the audit copy on disk',async t=>{
 const {context,img,read}=setup(t);
 for(const content of ['annotated','updated','original bytes']){
   await context.writeAuditCopy(img,content);
   assert.equal(read('foto.jpg'),'original bytes');
   assert.equal(read('_audit_foto.jpg'),content);
 }
});
test('existing audit file is preserved and a numbered copy is created',async t=>{
 const {context,img,read,root}=setup(t);
 fs.writeFileSync(path.join(root,'_audit_foto.jpg'),'older audit');
 await context.writeAuditCopy(img,'new audit');
 assert.equal(read('_audit_foto.jpg'),'older audit');
 assert.equal(read('_audit_foto_1.jpg'),'new audit');
 assert.equal(read('foto.jpg'),'original bytes');
});
test('corrupted output state cannot overwrite original',async t=>{
 const {context,img,read}=setup(t);
 img.outputHandle=img.handle;img.outputName=img.name;
 await assert.rejects(context.writeAuditCopy(img,'bad'),/bloqueado/);
 assert.equal(read('foto.jpg'),'original bytes');
});
test('identity check blocks even a handle disguised with an audit name',async t=>{
 const {context,img,read}=setup(t);
 img.outputHandle={...img.handle,name:'_audit_foto.jpg'};img.outputName='_audit_foto.jpg';
 await assert.rejects(context.writeAuditCopy(img,'bad'),/imagem original/);
 assert.equal(read('foto.jpg'),'original bytes');
});
test('another loaded original cannot be used as the output',async t=>{
 const {context,img,handle,read,root}=setup(t);
 fs.writeFileSync(path.join(root,'_audit_other.jpg'),'other original');
 context.images.push({handle:handle('_audit_other.jpg')});
 img.outputHandle=handle('_audit_other.jpg');img.outputName='_audit_other.jpg';
 await assert.rejects(context.writeAuditCopy(img,'bad'),/imagem original/);
 assert.equal(read('_audit_other.jpg'),'other original');
});
test('loose images save in the selected original directory without downloading',async t=>{
 const {context,img,downloads,read}=setup(t);img.directory=null;
 await context.prepareAuditDirectory(img);
 await context.writeAuditCopy(img,'annotated');
 assert.deepEqual(downloads,[]);
 assert.equal(read('_audit_foto.jpg'),'annotated');
 assert.equal(img.outputName,'_audit_foto.jpg');
 assert.equal(read('foto.jpg'),'original bytes');
});
test('permission denial leaves original untouched',async t=>{
 const {context,img,read}=setup(t);context.ensureWritable=async()=>false;
 await assert.rejects(context.writeAuditCopy(img,'bad'),/Permissão/);
 assert.equal(read('foto.jpg'),'original bytes');
});

test('first destination is reused for later images from other directories',async t=>{
 const {context,img,read}=setup(t);img.directory=null;
 let calls=0;const picker=context.window.showDirectoryPicker;
 context.window.showDirectoryPicker=()=>{calls++;return picker()};
 await context.prepareAuditDirectory(img);
 const other={name:'elsewhere.jpg',directory:{getFileHandle(){throw Error('wrong destination')}}};
 context.images.push(other);
 await context.prepareAuditDirectory(other);await context.writeAuditCopy(other,'second annotation');
 assert.equal(calls,1);assert.equal(other.directory,img.directory);
 assert.equal(read('_audit_elsewhere.jpg'),'second annotation');
});
test('canceling folder picker does not download or write',async t=>{
 const {context,img,downloads,read}=setup(t);img.directory=null;
 context.window.showDirectoryPicker=async()=>{throw Object.assign(new Error('cancel'),{name:'AbortError'})};
 await assert.rejects(context.prepareAuditDirectory(img),{name:'AbortError'});
 assert.equal(img.directory,null);assert.deepEqual(downloads,[]);
 assert.equal(read('foto.jpg'),'original bytes');
});
test('folder selection is reused for other originals in that folder',async t=>{
 const {context,img,handle,root}=setup(t);img.directory=null;
 fs.writeFileSync(path.join(root,'second.jpg'),'second');
 const other={name:'second.jpg',handle:handle('second.jpg')};context.images.push(other);
 let calls=0;const picker=context.window.showDirectoryPicker;
 context.window.showDirectoryPicker=()=>{calls++;return picker()};
 await context.prepareAuditDirectory(img);await context.prepareAuditDirectory(other);
 assert.equal(calls,1);assert.equal(img.directory,other.directory);
});
test('unsupported browser and missing original handle never download',async t=>{
 const {context,img,downloads}=setup(t);img.directory=null;
 context.window.showDirectoryPicker=undefined;
 await assert.rejects(context.prepareAuditDirectory(img),/Chrome ou Edge/);
 await assert.rejects(context.writeAuditCopy(img,'bad'),/Selecione a pasta/);
 const destination={};context.window.showDirectoryPicker=async()=>destination;img.handle=null;
 await context.prepareAuditDirectory(img);assert.equal(img.directory,destination);
 assert.deepEqual(downloads,[]);
});
test('save opens directory picker before rendering and keeps annotations on cancel',async t=>{
 const {context,img}=setup(t);img.directory=null;img.id=1;
 const events=[];const button={disabled:false};
 Object.assign(context,{currentId:1,$:()=>button,legendsOf:()=>[{dens:1}],burnImage:async()=>{events.push('render');return 'annotated'},updateDesfazerBtn:()=>{}});
 vm.runInContext(script.slice(script.indexOf('async function saveCurrent'),script.indexOf('// Só volta para a lista')),context);
 const picker=context.window.showDirectoryPicker;
 context.window.showDirectoryPicker=()=>{events.push('picker');return picker()};
 assert.equal(await context.saveCurrent(),true);assert.deepEqual(events,['picker','render']);
 img.directory=null;events.length=0;vm.runInContext('auditDirectory = null',context);
 context.window.showDirectoryPicker=async()=>{throw Object.assign(new Error('cancel'),{name:'AbortError'})};
 assert.equal(await context.saveCurrent(),false);assert.deepEqual(events,[]);
 assert.equal(button.disabled,false);
});

test('loading a folder does not require another destination picker',async t=>{
 const {context,img}=setup(t);const directory=img.directory;
 context.window.showDirectoryPicker=()=>{throw Error('unexpected dialog')};
 await context.prepareAuditDirectory(img);
 const other={name:'later.jpg'};await context.prepareAuditDirectory(other);
 assert.equal(other.directory,directory);
});
test('HEIC output uses PNG extension and preserves an existing PNG copy',async t=>{
 const {context,img,read,root}=setup(t);
 img.name='photo.HEIC';img.isHeic=true;
 fs.writeFileSync(path.join(root,'_audit_photo.png'),'existing png');
 await context.writeAuditCopy(img,'converted png');
 assert.equal(img.outputName,'_audit_photo_1.png');
 assert.equal(read('_audit_photo.png'),'existing png');
 assert.equal(read('_audit_photo_1.png'),'converted png');
 assert.equal(read('foto.jpg'),'original bytes');
});
test('HEIF and MIME-detected HEIC get a PNG filename',t=>{
 const {context}=setup(t);
 assert.equal(context.auditBaseName({name:'capture.HEIF',isHeic:true}),'_audit_capture.png');
 assert.equal(context.auditBaseName({name:'capture',isHeic:true}),'_audit_capture.png');
 assert.equal(context.auditBaseName({name:'capture.jpg'}),'_audit_capture.jpg');
});
