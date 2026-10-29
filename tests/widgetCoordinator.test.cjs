const assert=require('node:assert/strict'),fs=require('node:fs'),test=require('node:test'),vm=require('node:vm'),ts=require('typescript');

test('reading a moment or changing my reaction refreshes widgets without waiting for resume',()=>{
 const slots=[],dependencies=[],cleanups=[],effects=[],timers=new Map();let cursor=0,nextTimer=0,refreshes=0;
 const state={server:{session:{user:{id:'owner'}},updatesLoading:false,connections:[],updates:[{id:'moment',senderId:'friend',expiresAt:'2026-10-30',seenAt:null,reactions:[]}]}};
 const mocks={
  react:{useRef(initial){const i=cursor++;return slots[i]??={current:initial};},useEffect(run,deps){const i=cursor++;if(!dependencies[i]||deps.some((v,j)=>v!==dependencies[i][j])){cleanups[i]?.();dependencies[i]=deps;effects.push(()=>{cleanups[i]=run();});}}},
  'react-native':{AppState:{addEventListener:()=>({remove(){}})}},
  '@/src/state/appStore':{useAppStore:()=>({state})},'@/src/theme/ThemeProvider':{useTheme:()=>({mode:'dark'})},
  './widgetService':{widgetService:{isAvailable:()=>true,async refresh(){refreshes++;},async clear(){}}},
 };
 const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/widgets/WidgetCoordinator.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module:mod,exports:mod.exports,require:id=>Object.hasOwn(mocks,id)?mocks[id]:require(id),setTimeout:run=>{timers.set(++nextTimer,run);return nextTimer;},clearTimeout:id=>timers.delete(id)});
 function render(){cursor=0;mod.exports.WidgetCoordinator();effects.splice(0).forEach(run=>run());for(const[id,run]of timers){timers.delete(id);run();}}
 render();assert.equal(refreshes,1);
 state.server.updates[0].seenAt='2026-10-29T02:00:00Z';render();assert.equal(refreshes,2);
 state.server.updates[0].reactions=[{userId:'other',type:'heart'}];render();assert.equal(refreshes,2);
 state.server.updates[0].reactions.push({userId:'owner',type:'heart'});render();assert.equal(refreshes,3);
 state.server.updates[0].reactions[1].type='sparkles';render();assert.equal(refreshes,4);
});
