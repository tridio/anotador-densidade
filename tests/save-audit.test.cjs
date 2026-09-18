const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const saving = script.slice(script.indexOf('async function assertAuditDestination'), script.indexOf('/* ===================== SALVAR CÓPIA'));
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
  const context={images:[img],ensureWritable:async()=>true,toast:()=>{},setTimeout:()=>{},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:()=>{}},document:{body:{appendChild(){}},createElement:()=>({click(){downloads.push(this.download)},remove(){}})}};
  vm.createContext(context);vm.runInContext(saving,context);
  return {context,img,handle,downloads,root,read:name=>fs.readFileSync(path.join(root,name),'utf8')};
}
test('save, save again and undo change only the audit copy on disk',async t=>{
 const {context,img,read}=setup(t);
 for(const content of ['annotated','updated','original bytes']){
   await context.writeAuditCopy(img,content);
   assert.equal(read('foto.jpg'),'original bytes');
   assert.equal(read('audit_foto.jpg'),content);
 }
});
test('existing audit file is preserved and a numbered copy is created',async t=>{
 const {context,img,read,root}=setup(t);
 fs.writeFileSync(path.join(root,'audit_foto.jpg'),'older audit');
 await context.writeAuditCopy(img,'new audit');
 assert.equal(read('audit_foto.jpg'),'older audit');
 assert.equal(read('audit_foto_1.jpg'),'new audit');
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
 img.outputHandle={...img.handle,name:'audit_foto.jpg'};img.outputName='audit_foto.jpg';
 await assert.rejects(context.writeAuditCopy(img,'bad'),/imagem original/);
 assert.equal(read('foto.jpg'),'original bytes');
});
test('another loaded original cannot be used as the output',async t=>{
 const {context,img,handle,read,root}=setup(t);
 fs.writeFileSync(path.join(root,'audit_other.jpg'),'other original');
 context.images.push({handle:handle('audit_other.jpg')});
 img.outputHandle=handle('audit_other.jpg');img.outputName='audit_other.jpg';
 await assert.rejects(context.writeAuditCopy(img,'bad'),/imagem original/);
 assert.equal(read('audit_other.jpg'),'other original');
});
test('loose images download with audit prefix',async t=>{
 const {context,img,downloads,read}=setup(t);img.directory=null;
 await context.writeAuditCopy(img,'annotated');
 assert.deepEqual(downloads,['audit_foto.jpg']);
 assert.equal(img.outputName,'audit_foto.jpg');
 assert.equal(read('foto.jpg'),'original bytes');
});
test('permission denial leaves original untouched',async t=>{
 const {context,img,read}=setup(t);context.ensureWritable=async()=>false;
 await assert.rejects(context.writeAuditCopy(img,'bad'),/Permissão/);
 assert.equal(read('foto.jpg'),'original bytes');
});
