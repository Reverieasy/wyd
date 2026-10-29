const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),test=require('node:test');
const statuses=require('../src/features/updates/momentStatuses.ts');
const nodes=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
test('the eight contextual statuses are optional and selecting the same one again clears it',()=>{
  const state={server:{connections:[],termsStatus:{acceptedAt:'today'}},local:{draft:{photo:{uri:'photo'},status:null,recipientIds:[],circleIds:[],caption:'',sending:false}}};
  const colors={background:{card:'#FFF',accent:'#7722FF'},text:{heading:'#111',secondary:'#777'},border:{default:'#DDD'}};
  const mocks={react:{useState:v=>[v,()=>{}],useRef:v=>({current:v})},'react-native':{Pressable:'Pressable',View:'View',StyleSheet:{create:x=>x}},'expo-router':{Redirect:'Redirect',router:{}},'@expo/vector-icons/MaterialIcons':{__esModule:true,default:'Icon'},'@/src/components':Object.fromEntries(['ActionButton','AppText','Avatar','FlowHeader','MomentPhoto','Screen','StatusChip','TextField'].map(n=>[n,n])),'@/src/state/appStore':{useAppStore:()=>({state,actions:{setDraftStatus:value=>{state.local.draft.status=value;}}})},'@/src/features/updates/momentStatuses':statuses,'@/src/theme/ThemeProvider':{useThemeStyles:factory=>({colors,styles:factory({colors})})}};
  const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/(flows)/preview.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,require:id=>Object.hasOwn(mocks,id)?mocks[id]:require(id)});
  const chips=()=>nodes(module.exports.default()).filter(n=>n.type==='StatusChip');
  assert.deepEqual(chips().map(n=>n.props.label.split(' ').slice(1).join(' ')),['Studying','Working','Eating','Home','Outside','Gym','Chilling','Bedtime']);
  assert.equal(chips().some(n=>n.props.selected),false);
  chips().find(n=>n.props.label.includes('Gym')).props.onPress();assert.equal(state.local.draft.status,'gym');
  assert.equal(chips().filter(n=>n.props.selected).length,1);
  chips().find(n=>n.props.label.includes('Gym')).props.onPress();assert.equal(state.local.draft.status,null);
});
