const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),test=require('node:test'),ts=require('typescript');
const model=require('../src/features/widgets/widgetModel.ts'),icons=require('../src/features/widgets/widgetIcons.ts');
const layoutModule={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/widgets/widgetLayout.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:layoutModule,exports:layoutModule.exports,require:id=>id==='./widgetModel'?model:require(id)});
const layout=layoutModule.exports;
const mod={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/widgets/MomentWidget.android.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module:mod,exports:mod.exports,require:id=>id==='react-native-android-widget'?Object.fromEntries(['FlexWidget','OverlapWidget','TextWidget','SvgWidget','ImageWidget'].map(n=>[n,n])):id==='./widgetModel'?model:id==='./widgetLayout'?layout:id==='./widgetIcons'?icons:require(id)});
const nodes=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
const snapshot={...model.emptyWidget('moment'),ownerId:'owner',personId:'friend',name:'Ivan',status:'Bedtime',createdAt:new Date(Date.now()-1260000).toISOString(),updateId:'moment',expiresAt:new Date(Date.now()+3600000).toISOString(),photoData:'data:image/jpeg;base64,private'};
const render=(design,width=360,height=240,extra={})=>mod.exports.MomentWidget({snapshot:{...snapshot,design,...extra},width,height});
test('three new providers replace every old widget and request the exact grid sizes',()=>{
 const widgets=require('../app.json').expo.plugins.find(p=>Array.isArray(p)&&p[0]==='react-native-android-widget')[1].widgets;
 assert.equal(widgets.length,3);
 for(const [design,w,h] of [['small',2,2],['medium',4,2],['large',4,3]]){
  const p=widgets.find(p=>p.name===model.widgetNames[design]);assert.ok(p);assert.equal(p.targetCellWidth,w);assert.equal(p.targetCellHeight,h);assert.equal(p.resizeMode,'horizontal|vertical');
  assert.ok(fs.existsSync(path.join(__dirname,'..',p.previewImage)));
 }
 for(const old of ['WydPortrait','WydMoment','WydReactions'])assert.equal(model.widgetDesignForName(old),null);
});
test('moments fill the rounded photo card with a gradient and no previous logo/footer card',()=>{
 for(const design of model.widgetDesigns){
  const tree=render(design),all=nodes(tree);assert.equal(tree.type,'OverlapWidget');assert.equal(tree.props.style.overflow,'hidden');
  const photo=all.find(n=>n.type==='ImageWidget');assert.equal(photo.props.resizeMode,'cover');assert.equal(photo.props.imageWidth,360);assert.equal(photo.props.imageHeight,240);
  assert.equal(tree.props.clickActionData.uri,'watchudoin://moment/moment');
  assert.ok(all.some(n=>n.props?.svg?.includes('linearGradient id="shade"')));
  assert.equal(all.filter(n=>n.type==='ImageWidget').length,1);
 }
});
test('Small has camera only; Medium and Large have heart/Nudge without sparkles',()=>{
 for(const [design,reactions,nudge]of[['small',[],false],['medium',['heart'],true],['large',['heart'],true]]){
  const all=nodes(render(design));assert.deepEqual(all.filter(n=>n.props?.clickAction==='REACT_TO_MOMENT').map(n=>n.props.clickActionData.reaction),reactions);
  assert.equal(all.some(n=>n.props?.clickAction==='NUDGE_PERSON'),nudge);
  const camera=all.find(n=>n.props?.accessibilityLabel==='Send yours: open camera to reply to Ivan');
  assert.equal(camera.props.clickActionData.uri,'watchudoin://widget-reply?owner=owner&person=friend');
 }
});
test('selected hearts stay filled and repeated taps do not send another reaction',()=>{
 const all=nodes(render('medium',360,180,{myReaction:'heart'}));
 const heart=all.find(n=>n.props?.accessibilityLabel==='Selected heart reaction');assert.equal(heart.props.clickAction,'WIDGET_NOOP');
 assert.ok(nodes(heart).some(n=>n.props?.svg?.includes('fill="#FF4E79"')));
});
test('stale, signed-out and own moments cannot display private photos or send interactions',()=>{
 for(const value of [{...snapshot,expiresAt:'2000-01-01'},{...model.emptyWidget('signed-out')},{...snapshot,personId:'owner'}]){
  const all=nodes(mod.exports.MomentWidget({snapshot:{...value,design:'large'},width:300,height:220}));
  assert.equal(all.some(n=>['NUDGE_PERSON','REACT_TO_MOMENT'].includes(n.props?.clickAction)),false);
  if(value.mode==='signed-out'||value.expiresAt==='2000-01-01')assert.equal(all.some(n=>n.type==='ImageWidget'),false);
 }
 const pending=nodes(mod.exports.MomentWidget({snapshot:{...snapshot,design:'large'},width:360,height:240,pendingAction:'heart'}));
 assert.equal(pending.some(n=>['NUDGE_PERSON','REACT_TO_MOMENT'].includes(n.props?.clickAction)),false);
 assert.ok(pending.some(n=>n.props?.accessibilityLabel?.startsWith('Send yours')&&n.props.clickAction==='OPEN_URI'));
});
test('waiting widgets still offer a fresh camera reply and new indicators require a current photo',()=>{
 const waiting={...model.emptyWidget('waiting'),ownerId:'owner',personId:'friend',name:'Ivan',design:'medium'};
 const all=nodes(mod.exports.MomentWidget({snapshot:waiting,width:300,height:160}));
 assert.ok(all.some(n=>n.props?.accessibilityLabel?.startsWith('Send yours')));
 assert.equal(all.some(n=>n.props?.clickAction==='REACT_TO_MOMENT'),false);
 assert.ok(nodes(render('large',360,240,{isNew:true})).some(n=>n.props?.style?.backgroundColor==='#9D62FF'));
 assert.match(render('large',360,240,{isNew:true}).props.accessibilityLabel,/New moment/);
 assert.equal(nodes(render('large',360,240,{isNew:true,expiresAt:'2000-01-01'})).some(n=>n.props?.style?.backgroundColor==='#9D62FF'),false);
});
test('default and resized layouts keep their controls and metadata within supported bounds',()=>{
 for(const [design,width,height]of[['small',130,110],['small',180,180],['medium',250,110],['medium',360,180],['large',250,180],['large',360,270],['large',500,360]]){
  const l=layout.widgetLayout(design,width,height);assert.ok(l.footerHeight+2*l.padding<=height);assert.ok(l.buttonSize<=l.footerHeight);
  if(!l.stacked)assert.ok(l.actionsWidth+l.gap+l.detailsWidth<=l.innerWidth+1);else assert.ok(l.actionsWidth<=l.innerWidth);
  const tree=nodes(render(design,width,height));
  assert.ok(tree.filter(n=>n.type==='TextWidget').reduce((sum,n)=>sum+n.props.style.lineHeight,0)+(l.stacked?l.buttonSize+l.gap:0)<=l.footerHeight+1);
 }
});
