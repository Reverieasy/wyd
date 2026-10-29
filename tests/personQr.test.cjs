const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),test=require('node:test');
const jsQR=require('jsqr');
const model=require('../src/features/connections/personQr.ts');
const moduleForQr={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/connections/qrCode.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:moduleForQr,exports:moduleForQr.exports,require:id=>id==='./personQr'?model:require(id)});
const {createPersonQr}=moduleForQr.exports;
test('generated person codes independently decode to the exact username link with a quiet zone',()=>{
  for(const username of ['ara','ivan.callejo','abcdefghij_abcdefghij.ab']) for(const scale of [6,21]) {
    const qr=createPersonQr(username),edge=(qr.matrix.length+8)*scale,pixels=new Uint8ClampedArray(edge*edge*4).fill(255);
    qr.matrix.forEach((row,y)=>row.forEach((dark,x)=>{if(dark)for(let py=0;py<scale;py++)for(let px=0;px<scale;px++){const i=(((y+4)*scale+py)*edge+(x+4)*scale+px)*4;pixels[i]=0;pixels[i+1]=0;pixels[i+2]=0;}}));
    assert.equal(jsQR(pixels,edge,edge).data,model.personQrLink(username));
    assert.equal(model.parsePersonQr(qr.link),username);
    assert.equal(Buffer.from(qr.uri.split(',')[1],'base64').toString('ascii'),qr.svg);
    assert.doesNotMatch(qr.link,/token|password|email|supabase/i);
  }
});
test('scanner rejects external links, other QR types, malformed names and ambiguous parameters',()=>{
  for(const value of ['https://evil.invalid/add-person?username=ara','watchudoin://join-circle?code=foo','watchudoin://add-person?username=ara&username=ivan','watchudoin://add-person?username=ara&redirect=https://evil.invalid','watchudoin://add-person?username=x','watchudoin://add-person/extra?username=ara','watchudoin://add-person?username=ara#token','watchudoin://user:password@add-person?username=ara','javascript:alert(1)','x'.repeat(513)])assert.equal(model.parsePersonQr(value),null,value);
  assert.equal(model.parsePersonQr('watchudoin://add-person?username=Ara.Name'),'ara.name');
  assert.throws(()=>createPersonQr('invalid handle'));
});
