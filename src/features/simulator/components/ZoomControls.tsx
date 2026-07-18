
export default function ZoomControls({zoomIn,zoomOut,scale}:any){
 return <div className='absolute right-4 top-4 flex gap-2'>
 <button onClick={zoomOut}>-</button>
 <span>{Math.round(scale*100)}%</span>
 <button onClick={zoomIn}>+</button>
 </div>
}
