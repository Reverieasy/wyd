const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),test=require('node:test');
const model=require('../src/features/connections/personQr.ts');
const nodes=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
function harness(){
  const slots=[],routes=[];let cursor=0,focus;const React={useState(v){const i=cursor++;if(!(i in slots))slots[i]=v;return[slots[i],n=>{slots[i]=n;}];},useRef(v){const i=cursor++;return slots[i]??={current:v};},useCallback:fn=>fn,useEffect(){}};
  const mocks={react:React,'expo-camera':{CameraView:'CameraView',useCameraPermissions:()=>[{granted:true},()=>{}]},'@expo/vector-icons/MaterialIcons':{__esModule:true,default:'Icon'},'expo-image-picker':{},'expo-router':{router:{replace:route=>routes.push(route)},useFocusEffect:fn=>{focus=fn;}},'react-native':{ActivityIndicator:'Spinner',AppState:{currentState:'active'},Platform:{OS:'android'},View:'View',StyleSheet:{create:x=>x}},'@/src/components':Object.fromEntries(['ActionButton','AppText','FlowHeader','Screen'].map(n=>[n,n])),'@/src/features/connections/personQr':model};
  const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/(flows)/scan-person.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,require:id=>Object.hasOwn(mocks,id)?mocks[id]:require(id)});
  function render(){cursor=0;return module.exports.default();}render();const blur=focus();return{render,routes,blur};
}
test('a live QR frame opens the person preview once even when the camera reports it repeatedly',()=>{
  const h=harness();const camera=nodes(h.render()).find(n=>n.type==='CameraView');
  assert.deepEqual([...camera.props.barcodeScannerSettings.barcodeTypes],['qr']);
  camera.props.onBarcodeScanned({data:'watchudoin://add-person?username=ara'});camera.props.onBarcodeScanned({data:'watchudoin://add-person?username=ara'});
  assert.equal(h.routes.length,1);assert.equal(h.routes[0].pathname,'/add-person');assert.equal(h.routes[0].params.username,'ara');
});
test('a malformed/external QR never opens its URL and can be retried',()=>{
  const h=harness();nodes(h.render()).find(n=>n.type==='CameraView').props.onBarcodeScanned({data:'https://untrusted.invalid'});
  assert.equal(h.routes.length,0);const retry=nodes(h.render()).find(n=>n.props?.label==='Try another scan');assert.ok(retry);retry.props.onPress();
  nodes(h.render()).find(n=>n.type==='CameraView').props.onBarcodeScanned({data:'watchudoin://add-person?username=ivan'});assert.equal(h.routes[0].params.username,'ivan');
});
