
import { Line } from 'react-konva';
export default function InfiniteGrid({width,height,scale,offset}:any){
 const grid=40;
 const lines=[];
 const step=grid*scale;
 const startX=(-offset.x%step)-step;
 const startY=(-offset.y%step)-step;
 for(let x=startX;x<width+step;x+=step)
  lines.push(<Line key={'v'+x} points={[x,0,x,height]} stroke='#2a2a2a'/>);
 for(let y=startY;y<height+step;y+=step)
  lines.push(<Line key={'h'+y} points={[0,y,width,y]} stroke='#2a2a2a'/>);
 return <>{lines}</>;
}
