import { usePlcStore } from '@/stores/plcStore';
import { ADDRESS_RANGE } from '@/simulator/types/plcState';
import { cn } from '@/utils/cn';
import { COLOR_POWER_ON } from '../constants';

/**
 * Physical I/O panel: toggle switches for every input address, lamps for
 * every output address — the two things a real PLC's front panel (or
 * CX-Programmer's I/O monitor) always shows. Only interactive while a
 * simulation is actually running; outputs are always read-only (they only
 * change as a *result* of the scan cycle, never by direct user action).
 */
export function SimulationPanel({ isSimulating }: { isSimulating: boolean }) {
  const inputs = usePlcStore((s) => s.state.inputs);
  const outputs = usePlcStore((s) => s.state.outputs);
  const setInput = usePlcStore((s) => s.setInput);

  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-3 md:w-56 md:shrink-0">
      <div>
        <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">Inputs</h3>
        <div className="grid grid-cols-6 gap-1 md:grid-cols-4">
          {ADDRESS_RANGE.map((n) => (
            <button
              key={n}
              disabled={!isSimulating}
              onClick={() => setInput(n, !inputs[n])}
              title={`I${n}`}
              className={cn(
                'flex h-8 items-center justify-center rounded-lg border text-[11px] font-medium transition-colors disabled:opacity-40',
                inputs[n]
                  ? 'border-transparent text-white'
                  : 'border-border text-muted-foreground hover:bg-muted/40 dark:border-border-dark dark:hover:bg-white/5'
              )}
              style={inputs[n] ? { backgroundColor: COLOR_POWER_ON } : undefined}
            >
              I{n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">Outputs</h3>
        <div className="grid grid-cols-6 gap-1 md:grid-cols-4">
          {ADDRESS_RANGE.map((n) => (
            <div
              key={n}
              title={`O${n}`}
              className={cn(
                'flex h-8 items-center justify-center rounded-lg border text-[11px] font-medium',
                outputs[n]
                  ? 'border-transparent text-white'
                  : 'border-border text-muted-foreground dark:border-border-dark'
              )}
              style={outputs[n] ? { backgroundColor: COLOR_POWER_ON } : undefined}
            >
              O{n}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
