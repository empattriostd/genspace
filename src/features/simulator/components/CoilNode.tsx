
import { Group, Rect, Text } from 'react-konva';
export default function CoilNode({x,y,label,mode}:any){
return <Group x={x} y={y}>
<Rect width={90} height={50} stroke="white" cornerRadius={6} />
<Text text={mode ? mode+' '+label : label} x={8} y={16} fill="white"/>
</Group>
}
