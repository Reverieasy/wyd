const assert = require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),test=require('node:test');
const model=require('../src/features/onboarding/firstUseProgress.ts');
const nodes=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function harness() {
  const hooks=[],effects=[],progress=new Map(),routes=[];let cursor=0, foreground;
  const state={server:{initializing:false,profile:{id:'owner'},connections:[],updates:[],lastSentUpdateId:null}};
  const controls={placed:false,widget:()=>Promise.resolve(controls.placed)};
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const React={useState(initial){const i=cursor++;if(!(i in hooks))hooks[i]=initial;return[hooks[i],value=>{hooks[i]=value;}];},useRef(initial){const i=cursor++;return hooks[i]??={current:initial};},useCallback(fn,deps){const i=cursor++;if(!same(hooks[i]?.deps,deps))hooks[i]={deps,fn};return hooks[i].fn;},useEffect(run,deps){const i=cursor++;if(!same(hooks[i]?.deps,deps))effects.push(()=>{hooks[i]?.cleanup?.();hooks[i]={deps,cleanup:run()};});}};
  const colors={background:{card:'#FFF',accent:'#7722FF'},border:{default:'#DDD'}};
  const mocks={react:React,'expo-router':{router:{push:route=>routes.push(route),replace:route=>routes.push(route)},useFocusEffect:fn=>React.useEffect(fn,[fn])},'react-native':{AppState:{addEventListener:(_event,callback)=>{foreground=callback;return{remove(){}};}},Platform:{OS:'android'},Pressable:'Pressable',View:'View',StyleSheet:{create:x=>x}},'@/src/state/appStore':{useAppStore:()=>({state})},'@/src/features/onboarding/firstUseProgress':model,'@/src/features/onboarding/firstUseStorage':{firstUseStorage:{async record(userId,observed){const value=model.advanceFirstUseProgress(progress.get(userId)??model.emptyFirstUseProgress,observed);progress.set(userId,value);return value;}}},'@/src/features/widgets/widgetService':{widgetService:{hasPlacedWidget:()=>controls.widget()}},'@/src/theme/ThemeProvider':{useThemeStyles:factory=>({colors,styles:factory({colors})})},'./ActionButton':{ActionButton:'Button'},'./primitives/AppText':{AppText:'Text'}};
  const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/FirstStepsCard.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,require:id=>Object.hasOwn(mocks,id)?mocks[id]:require(id)});
  return{state,controls,progress,routes,foreground:()=>foreground('active'),render(standalone=false){cursor=0;const tree=module.exports.FirstStepsCard({standalone});while(effects.length)effects.shift()();return tree;}};
}
test('first-use card presents one next action: connect, first moment, then actual widget placement',async()=>{
  const h=harness();h.render();await settle();let tree=h.render();
  nodes(tree).find(n=>n.props?.label==='Find your person').props.onPress();assert.equal(h.routes.at(-1),'/(onboarding)/connect');
  h.state.server.connections=[{connection:{status:'accepted'}}];h.render();await settle();tree=h.render();
  nodes(tree).find(n=>n.props?.label==='Send first moment').props.onPress();assert.equal(h.routes.at(-1),'/(tabs)/camera');
  h.state.server.updates=[{id:'received-first-moment'}];h.render();await settle();tree=h.render();
  nodes(tree).find(n=>n.props?.label==='Add your widget').props.onPress();assert.equal(h.routes.at(-1),'/(flows)/widget');
  h.controls.placed=true;h.foreground();await settle();assert.equal(h.render(),null);
});
test('deferring the guide hides it on Home and allows reopening it from Settings',async()=>{
  const h=harness();h.render();await settle();const tree=h.render();
  nodes(tree).find(n=>n.type==='Pressable').props.onPress();await settle();assert.equal(h.render(),null);
  assert.ok(h.render(true));assert.equal(h.progress.get('owner').dismissed,true);
});
test('late progress from another account cannot appear after an account switch',async()=>{
  const h=harness();let finish;h.controls.widget=()=>new Promise(resolve=>{finish=resolve;});h.render();
  h.state.server.profile={id:'other'};h.controls.widget=()=>Promise.resolve(false);h.render();await settle();
  finish(true);await settle();assert.equal(h.progress.get('other').widgetAdded,false);
  assert.ok(nodes(h.render()).some(n=>n.props?.label==='Find your person'));
});
