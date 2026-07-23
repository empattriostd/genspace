import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { usePlcStore } from '@/stores/plcStore';
import { ADDRESS_RANGE } from '@/simulator/types/plcState';
import { cn } from '@/utils/cn';
import { COLOR_ACTIVE } from '../constants';

interface BottomIOPanelProps {
  isSimulating: boolean;
}

/**
 * Docked I/O panel — the "physical front panel" of the simulated PLC.
 * Reads/writes the exact same usePlcStore slice as the desktop
 * SimulationPanel (state.inputs / state.outputs / setInput), just laid
 * out for one-thumb reach: a collapsible strip pinned above the toolbox,
 * Input/Output as two horizontally scrollable rows instead of a side grid.
 */
export function BottomIOPanel({ isSimulating }: BottomIOPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const inputs = usePlcStore((s) => s.state.inputs);
  const outputs = usePlcStore((s) => s.state.outputs);
  const setInput = usePlcStore((s) => s.setInput);

  return (
    <div className="shrink-0 border-t border-border bg-secondary/95 backdrop-blur-glass dark:border-border-dark dark:bg-dark/95">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-muted-foreground"
      >
        <span>I/O PANEL{!isSimulating ? ' — press Run to enable inputs' : ''}</span>
        {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {!collapsed && (
        <div className="space-y-2 px-3 pb-2.5">
          <IoRow
            label="INPUT"
            addresses={ADDRESS_RANGE}
            prefix="I"
            values={inputs}
            interactive={isSimulating}
            onToggle={(n) => setInput(n, !inputs[n])}
          />
          <IoRow label="OUTPUT" addresses={ADDRESS_RANGE} prefix="O" values={outputs} interactive={false} />
        </div>
      )}
    </div>
  );
}

interface IoRowProps {
  label: string;
  addresses: number[];
  prefix: 'I' | 'O';
  values: Record<number, boolean>;
  interactive: boolean;
  onToggle?: (n: number) => void;
}

function IoRow({ label, addresses, prefix, values, interactive, onToggle }: IoRowProps) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground">{label}</p>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {addresses.map((n) => {
          const on = !!values[n];
          const isLamp = prefix === 'O';
          return (
            <button
              key={n}
              disabled={!interactive}
              onClick={() => onToggle?.(n)}
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xs font-bold transition-all active:scale-95 disabled:active:scale-100',
                on
                  ? 'border-transparent text-white'
                  : 'border-border text-muted-foreground dark:border-border-dark',
                isLamp && on && 'shadow-[0_0_10px_rgba(242,107,58,0.7)]',
                !interactive && !on && 'opacity-60'
              )}
              style={on ? { backgroundColor: COLOR_ACTIVE } : undefined}
            >
              {prefix}
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
