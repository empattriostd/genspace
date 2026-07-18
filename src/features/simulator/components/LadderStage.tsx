
import { Stage, Layer } from 'react-konva';
import InfiniteGrid from './InfiniteGrid';
import CanvasViewport from './CanvasViewport';
import ContactNode from './ContactNode';
import CoilNode from './CoilNode';
import TimerNode from './TimerNode';
import CounterNode from './CounterNode';
import MemoryNode from './MemoryNode';
import { useLadderEditorStore } from '@/stores/ladderEditorStore';

export default function LadderStage(){
 const document = useLadderEditorStore(s=>s.document);

 return <CanvasViewport>
 {({width,height,scale,position,onWheel,onDragEnd})=>(
 <Stage width={width} height={height}
 draggable x={position.x} y={position.y}
 scaleX={scale} scaleY={scale}
 onWheel={onWheel} onDragEnd={onDragEnd}>
   <Layer>
      <InfiniteGrid width={width} height={height} scale={scale} offset={position}/>
      {document.rungOrder.flatMap(rid=>{
        const rung=document.rungs[rid];
        return rung.elementOrder.map(id=>{
          const el=rung.elements[id];
          const x=(el.gridX||0)*120+200;
          const y=(el.gridY||0)*80+120;

          switch(el.kind){
            case 'CONTACT':
              return <ContactNode key={id} x={x} y={y}
                label={el.address?.value || 'I1'}
                mode={el.mode}/>;
            case 'COIL':
              return <CoilNode key={id} x={x} y={y}
                label={el.address?.value || 'O1'}/>;
            case 'TIMER':
              return <TimerNode key={id} x={x} y={y}
                label={el.address?.value || 'TIM1'}/>;
            case 'COUNTER':
              return <CounterNode key={id} x={x} y={y}
                label={el.address?.value || 'CTU1'}/>;
            case 'MEMORY':
              return <MemoryNode key={id} x={x} y={y}
                label={el.address?.value || 'M1'}/>;
            default:
              return null;
          }
        })
      })}
   </Layer>
 </Stage>
 )}
 </CanvasViewport>
}

// Phase4C placeholder interactions
