
import { useLadderEditorStore } from '@/stores/ladderEditorStore';
const items=['NO','NC','OUTPUT','TIMER','COUNTER','MEMORY','BRANCH'];
export default function Palette(){
 const store=useLadderEditorStore();
 const rungId=store.document.rungs?.[0]?.id;
 const add=(t:string)=>{
  if(!rungId)return;
  const at={gridX:5,gridY:5};
  if(t==='NO') store.addComponent(rungId,{kind:'CONTACT',mode:'NO',address:'I1',at} as any);
  if(t==='NC') store.addComponent(rungId,{kind:'CONTACT',mode:'NC',address:'I1',at} as any);
  if(t==='OUTPUT') store.addComponent(rungId,{kind:'COIL',address:'O1',at} as any);
  if(t==='TIMER') store.addComponent(rungId,{kind:'TIMER',address:'TIM1',presetMs:1000,at} as any);
  if(t==='COUNTER') store.addComponent(rungId,{kind:'COUNTER',address:'CTU1',presetCount:1,at} as any);
 };
 return <div>{items.map(i=><button key={i} onClick={()=>add(i)}>{i}</button>)}</div>
}
