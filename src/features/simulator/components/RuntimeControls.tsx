
export default function RuntimeControls({run,stop,reset}:any){
return <div><button onClick={run}>Run</button><button onClick={stop}>Stop</button><button onClick={reset}>Reset</button></div>
}
