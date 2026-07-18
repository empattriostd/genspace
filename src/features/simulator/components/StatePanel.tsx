import { usePlcStore } from '@/stores/plcStore';
import { ADDRESS_RANGE } from '@/simulator/types/plcState';
import { cn } from '@/utils/cn';

function Bit({ label, on, onClick }: { label: string; on: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-7 min-w-[3rem] items-center justify-center rounded-md px-2 font-mono text-[10px] font-semibold transition-colors',
        on
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-muted/50 text-muted-foreground hover:bg-muted dark:bg-white/5'
      )}
      title={onClick ? `Toggle ${label}` : label}
    >
      {label}
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

export default function StatePanel() {
  const state = usePlcStore((s) => s.state);
  const setInput = usePlcStore((s) => s.setInput);

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      <Group title="Inputs (I) — click to toggle">
        {ADDRESS_RANGE.map((n) => (
          <Bit key={`i${n}`} label={`I${n}`} on={Boolean(state.inputs[n])} onClick={() => setInput(n, !state.inputs[n])} />
        ))}
      </Group>
      <Group title="Outputs (O)">
        {ADDRESS_RANGE.map((n) => (
          <Bit key={`o${n}`} label={`O${n}`} on={Boolean(state.outputs[n])} />
        ))}
      </Group>
      <Group title="Memory (M)">
        {ADDRESS_RANGE.map((n) => (
          <Bit key={`m${n}`} label={`M${n}`} on={Boolean(state.memory[n])} />
        ))}
      </Group>
      <Group title="Timers (TIM)">
        {ADDRESS_RANGE.map((n) => {
          const t = state.timers[n];
          return (
            <Bit
              key={`tim${n}`}
              label={t ? `T${n}:${Math.floor(t.accumulatedMs / 1000)}s${t.done ? '✓' : ''}` : `T${n}`}
              on={Boolean(t?.done)}
            />
          );
        })}
      </Group>
      <Group title="Counters (CNT)">
        {ADDRESS_RANGE.map((n) => {
          const c = state.counters[n];
          return (
            <Bit
              key={`cnt${n}`}
              label={c ? `C${n}:${c.accumulatedCount}${c.done ? '✓' : ''}` : `C${n}`}
              on={Boolean(c?.done)}
            />
          );
        })}
      </Group>
    </div>
  );
}
