const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),vm=require('node:vm'),ts=require('typescript');
function source(file,mocks){
 const module={exports:{}},output=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(output,{module,exports:module.exports,setTimeout,clearTimeout,require:id=>Object.hasOwn(mocks,id)?mocks[id]:require(id)});return module.exports;
}
const model=source('src/features/widgets/widgetModel.ts',{}),settle=()=>new Promise(resolve=>setImmediate(resolve));
function harness(send=async()=>({id:'event'}),sendPush=async()=>undefined){
 const renders=[],nudges=[],reactions=[],pushes=[];
 const controls={snapshot:{...model.emptyWidget('waiting'),ownerId:'owner',personId:'friend',name:'Friend'},session:{user:{id:'owner'}},settings:{enabled:true,personId:'friend'},offline:false,cleared:0,widgets:[],loads:0};
 const{widgetTaskHandler}=source('src/features/widgets/widgetTaskHandler.android.tsx',{
  './MomentWidget.android':{MomentWidget:'Widget'},
  './widgetData.android':{async loadWidgetSnapshot(){controls.loads++;if(controls.offline)throw Error('offline');return controls.snapshot;}},
  './widgetModel':model,'./widgetAppearance':{readWidgetAppearance:async()=>'dark'},
  './widgetStorage':{widgetStorage:{getSettings:async()=>controls.settings,async clearPhoto(){controls.cleared++;}}},
  './nativeWidgetApi.android':{getWidgetApi:()=>({getWidgetInfo:async name=>controls.widgets.filter(w=>w.widgetName===name)})},
  '@/src/lib/supabase':{getSupabase:()=>({auth:{getSession:async()=>({data:{session:controls.session}})}})},
  '@/src/features/activity/nudgeService':{nudgeService:{async send(person){nudges.push(person);return send();},errorMessage:e=>e.message}},
  '@/src/features/activity/reactionService':{reactionService:{async set(id,reaction){reactions.push({id,reaction});return send();},errorMessage:e=>e.message}},
  '@/src/features/notifications/notificationService':{notificationService:{async sendPush(...args){pushes.push(args);return sendPush(...args);}}},
 });
 const props={widgetInfo:{widgetName:'WydMedium',widgetId:1,width:320,height:170},widgetAction:'WIDGET_CLICK',clickAction:'NUDGE_PERSON',clickActionData:{ownerId:'owner',personId:'friend'},renderWidget:element=>renders.push(element.props)};
 return{run:overrides=>widgetTaskHandler({...props,...overrides}),controls,renders,nudges,reactions,pushes};
}
function moment(h){h.controls.snapshot={...h.controls.snapshot,mode:'moment',updateId:'moment',expiresAt:new Date(Date.now()+3600000).toISOString()};return{ownerId:'owner',personId:'friend',updateId:'moment',reaction:'heart'};}
test('placement and resize use the provider layout and exact launcher dimensions',async()=>{
 for(const design of model.widgetDesigns){const h=harness();await h.run({widgetAction:'WIDGET_RESIZED',widgetInfo:{widgetName:model.widgetNames[design],widgetId:1,width:360,height:240}});assert.equal(h.renders.at(-1).snapshot.design,design);assert.equal(h.renders.at(-1).width,360);}
});
test('all removed providers and unrelated tasks are ignored',async()=>{
 for(const widgetName of ['WydPortrait','WydMoment','WydReactions','Unrelated']){const h=harness();await h.run({widgetInfo:{widgetName,widgetId:1}});assert.equal(h.renders.length,0);assert.equal(h.controls.loads,0);}
});
test('Nudge sends directly to the selected person and requests its notification',async()=>{
 const h=harness();await h.run();assert.deepEqual(h.nudges,['friend']);assert.deepEqual(h.pushes,[['nudge','event']]);assert.equal(h.renders[0].pendingAction,'nudge');assert.equal(h.renders.at(-1).feedback,'Nudged!');
});
test('heart taps save immediately and restore the selected visual state',async()=>{
 for(const widgetName of ['WydMedium','WydLarge']){const reaction='heart',h=harness(),data={...moment(h),reaction};await h.run({clickAction:'REACT_TO_MOMENT',clickActionData:data,widgetInfo:{widgetName,widgetId:1,width:360,height:240}});assert.deepEqual(h.reactions,[{id:'moment',reaction}]);assert.deepEqual(h.pushes,[['reaction','event']]);assert.equal(h.renders.at(-1).snapshot.myReaction,reaction);}
});
test('Small has no reaction/Nudge actions and no size can send a removed sparkle',async()=>{
 for(const [widgetName,clickAction,reaction]of[['WydSmall','NUDGE_PERSON','heart'],['WydSmall','REACT_TO_MOMENT','heart'],['WydMedium','REACT_TO_MOMENT','sparkles'],['WydLarge','REACT_TO_MOMENT','sparkles']]){
  const h=harness(),data={...moment(h),reaction};await h.run({widgetInfo:{widgetName,widgetId:1,width:300,height:180},clickAction,clickActionData:data});assert.equal(h.nudges.length+h.reactions.length,0);
 }
});
test('stale identities, old moments, expired/own photos and disabled settings never send',async()=>{
 for(const scenario of ['owner','person','moment','expired','own','disabled','session','unsupported']){
  const h=harness(),data=moment(h);
  if(scenario==='owner')data.ownerId='other';
  if(scenario==='person')data.personId='previous';
  if(scenario==='moment')data.updateId='previous';
  if(scenario==='expired')h.controls.snapshot.expiresAt='2000-01-01';
  if(scenario==='own')h.controls.snapshot.personId='owner';
  if(scenario==='disabled')h.controls.settings.enabled=false;
  if(scenario==='session')h.controls.session={user:{id:'other'}};
  if(scenario==='unsupported')data.reaction='invalid';
  await h.run({clickAction:'REACT_TO_MOMENT',clickActionData:data});assert.equal(h.reactions.length,0,scenario);
 }
});
test('an already selected reaction does not trigger another write or notification',async()=>{
 const h=harness(),data=moment(h);h.controls.snapshot.myReaction='heart';await h.run({clickAction:'REACT_TO_MOMENT',clickActionData:data});assert.equal(h.reactions.length,0);assert.equal(h.pushes.length,0);
});
test('repeated taps while saving do not duplicate the write; logout redacts the result',async()=>{
 let finish;const h=harness(()=>new Promise(resolve=>{finish=resolve;})),data=moment(h);
 const first=h.run({clickAction:'REACT_TO_MOMENT',clickActionData:data});await settle();await h.run({clickAction:'REACT_TO_MOMENT',clickActionData:data});assert.equal(h.reactions.length,1);
 h.controls.snapshot=model.emptyWidget('signed-out');finish({id:'event'});await first;assert.equal(h.renders.at(-1).snapshot.ownerId,null);assert.equal(h.renders.at(-1).snapshot.photoData,null);
});
test('server cooldown errors restore usable controls and display feedback',async()=>{
 const h=harness(async()=>{throw Error('Wait 10 seconds between nudges.');});await h.run();assert.equal(h.renders.at(-1).feedback,'Wait 10 seconds between nudges.');assert.equal(h.renders.at(-1).pendingAction,undefined);
});
test('success renders before push settles, and the worker stays alive for push delivery',async()=>{
 let finishPush,finished=false;const h=harness(undefined,()=>new Promise(resolve=>{finishPush=resolve;}));
 const task=h.run().then(()=>{finished=true;});await settle();assert.equal(h.renders.at(-1).feedback,'Nudged!');assert.equal(finished,false);finishPush();await task;assert.equal(finished,true);
});
test('offline refresh renders a safe placeholder',async()=>{
 const h=harness();h.controls.offline=true;await h.run({widgetAction:'WIDGET_UPDATE'});assert.equal(h.renders.at(-1).snapshot.mode,'unavailable');
});
test('removing the last copy clears private cache while other sizes preserve it',async()=>{
 const h=harness();await h.run({widgetAction:'WIDGET_DELETED'});assert.equal(h.controls.cleared,1);
 const other=harness();other.controls.widgets=[{widgetName:'WydLarge',widgetId:2}];await other.run({widgetAction:'WIDGET_DELETED'});assert.equal(other.controls.cleared,0);
});
