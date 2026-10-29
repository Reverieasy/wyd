const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),test=require('node:test');
const model=require('../src/features/connections/personQr.ts');
const nodes=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
const settle=()=>new Promise(r=>setImmediate(r));
function harness(userId='owner',targetId='friend'){
  const slots=[],deps=[],effects=[],requests=[],stored=[];let cursor=0;
  const state={server:{profile:userId?{id:userId}:null,connections:[]}};
  const React={useState(v){const i=cursor++;if(!(i in slots))slots[i]=v;return[slots[i],n=>{slots[i]=n;}];},useRef(v){const i=cursor++;return slots[i]??={current:v};},useEffect(fn,next){const i=cursor++;if(!deps[i]||next.some((v,j)=>deps[i][j]!==v)){deps[i]=next;effects.push(fn);}}};
  const mocks={react:React,'expo-router':{router:{push(){},replace(){}},useLocalSearchParams:()=>({username:'ara'})},'react-native':{View:'View'},'@/src/components':Object.fromEntries(['ActionButton','AppText','Avatar','FlowHeader','Screen'].map(n=>[n,n])),'@/src/features/connections/personQr':model,'@/src/features/connections/personQrStorage':{personQrStorage:{async save(v){stored.push(v);}}},'@/src/features/profiles/profileService':{profileService:{findExactUsername:async()=>({id:targetId,displayName:'Ara',handle:'ara'})}},'@/src/features/connections/connectionService':{connectionService:{async request(...args){requests.push(args);return{connection:{id:'request'}};}}},'@/src/features/notifications/notificationService':{notificationService:{sendPush:async()=>{}}},'@/src/state/appStore':{useAppStore:()=>({state,actions:{refreshConnections:async()=>{}}})},'@/src/theme/ThemeProvider':{useTheme:()=>({colors:{background:{card:'#FFF'},border:{default:'#DDD'}}})}};
  const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/add-person.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,require:id=>Object.hasOwn(mocks,id)?mocks[id]:require(id)});
  return{state,requests,stored,render(){cursor=0;const tree=module.exports.default();effects.splice(0).forEach(fn=>fn());return tree;}};
}
test('scanning previews the person without automatically sending or accepting; explicit request sends once',async()=>{
  const h=harness();h.render();await settle();const tree=h.render();assert.equal(h.requests.length,0);
  assert.ok(nodes(tree).some(n=>n.type==='Avatar'&&n.props.name==='Ara'));
  const send=nodes(tree).find(n=>n.props?.label==='Send connection request');send.props.onPress();send.props.onPress();await settle();
  assert.equal(h.requests.length,1);assert.equal(h.requests[0][0],'owner');assert.equal(h.requests[0][1].id,'friend');
  assert.ok(nodes(h.render()).some(n=>n.props?.children==='Request sent. Waiting for them to accept.'));
});
test('own codes cannot request a connection and signed-out codes are retained for login',async()=>{
  const own=harness('owner','owner');own.render();await settle();assert.equal(nodes(own.render()).some(n=>n.props?.label==='Send connection request'),false);assert.equal(own.requests.length,0);
  const loggedOut=harness(null);loggedOut.render();await settle();assert.deepEqual(loggedOut.stored,['ara']);assert.ok(nodes(loggedOut.render()).some(n=>n.props?.label==='Sign in'));assert.equal(loggedOut.requests.length,0);
});
