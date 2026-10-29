const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),test=require('node:test');
const photo=require('../src/features/updates/photoAccess.ts');
const nodes=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
test('the QR card puts the authenticated profile photo and name above the code, and waits for both images',()=>{
  const slots=[],deps=[],effects=[],readiness=[];let cursor=0;
  const React={forwardRef:fn=>fn,useMemo:fn=>fn(),useState(v){const i=cursor++;if(!(i in slots))slots[i]=v;return[slots[i],n=>{slots[i]=n;}];},useEffect(fn,next){const i=cursor++;if(!deps[i]||next.some((v,j)=>deps[i][j]!==v)){deps[i]=next;effects.push(fn);}}};
  const mocks={react:React,'expo-image':{Image:'Image'},'react-native':{View:'View',StyleSheet:{create:x=>x}},'@/src/lib/environment':{environment:{supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'publishable'}},'@/src/features/updates/photoAccess':photo,'@/src/features/connections/qrCode':{createPersonQr:handle=>({uri:'data:image/svg+xml;base64,public-qr-'+handle})},'./primitives/AppText':{AppText:'Text'},'./BrandLogo':{BrandLogo:'BrandLogo'},'./BrandWordmark':{BrandWordmark:'BrandWordmark'}};
  const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/PersonQrCard.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,require:id=>Object.hasOwn(mocks,id)?mocks[id]:require(id)});
  const profile={displayName:'Ara',handle:'ara',avatarUrl:'https://example.supabase.co/storage/v1/object/authenticated/avatars/ara/photo.jpg'};
  const ready=value=>readiness.push(value);const render=()=>{cursor=0;const tree=module.exports.PersonQrCard({profile,accessToken:'private-session',width:272,onReady:ready},null);effects.splice(0).forEach(fn=>fn());return tree;};
  let tree=render(),images=nodes(tree).filter(n=>n.type==='Image');
  assert.equal(images[0].props.source.headers.Authorization,'Bearer private-session');assert.equal(images[1].props.source.uri,'data:image/svg+xml;base64,public-qr-ara');
  assert.equal(tree.props.children[1].props.children[0].props.children,'Ara');assert.equal(tree.props.children[2].type,'Image');
  assert.equal(readiness.at(-1),false);images[1].props.onLoad();render();assert.equal(readiness.at(-1),false);
  images[0].props.onLoad();tree=render();assert.equal(readiness.at(-1),true);assert.equal(nodes(tree).some(n=>n.type==='BrandLogo'),false);assert.equal(nodes(tree).find(n=>n.type==='BrandWordmark').props.appearance,'light');
});
