
import { useEffect,useState } from 'react';
export default function CanvasViewport({children}:any){
 const [size,setSize]=useState({width:window.innerWidth,height:window.innerHeight});
 const [scale,setScale]=useState(1);
 const [position,setPosition]=useState({x:0,y:0});
 useEffect(()=>{
  const fn=()=>setSize({width:window.innerWidth,height:window.innerHeight});
  window.addEventListener('resize',fn);
  return ()=>window.removeEventListener('resize',fn);
 },[]);
 const onWheel=(e:any)=>{
  e.evt.preventDefault();
  const dir=e.evt.deltaY>0?-1:1;
  setScale(s=>Math.min(3,Math.max(0.25,s+dir*0.1)));
 };
 return children({
  ...size,
  scale,
  position,
  onWheel,
  onDragEnd:(e:any)=>setPosition({x:e.target.x(),y:e.target.y()}),
  zoomIn:()=>setScale((s:any)=>Math.min(3,s+0.1)),
  zoomOut:()=>setScale((s:any)=>Math.max(0.25,s-0.1))
 });
}
