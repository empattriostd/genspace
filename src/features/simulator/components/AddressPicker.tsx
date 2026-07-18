import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import type { Address, AddressType } from '@/simulator/types/address';

export interface AddressPickerProps {
  open: boolean;
  /** Kinds of address allowed for this component. */
  allowedTypes: AddressType[];
  /** Max number for each type (e.g. 26 for I/O, 999 for M/TIM/CTU). */
  maxForType?: Partial<Record<AddressType, number>>;
  title: string;
  initial?: Address | null;
  onConfirm: (addr: Address) => void;
  onCancel: () => void;
}

const DEFAULT_MAX: Record<AddressType, number> = {
  I: 26,
  O: 26,
  M: 999,
  TIM: 999,
  CTU: 999,
};

const TYPE_LABELS: Record<AddressType, string> = {
  I: 'I (Input)',
  O: 'O (Output)',
  M: 'M (Memory)',
  TIM: 'TIM (Timer)',
  CTU: 'CNT (Counter)',
};

const TYPE_PREFIX: Record<AddressType, string> = {
  I: 'I',
  O: 'O',
  M: 'M',
  TIM: 'TIM',
  CTU: 'CNT',
};

export default function AddressPicker({
  open,
  allowedTypes,
  maxForType,
  title,
  initial,
  onConfirm,
  onCancel,
}: AddressPickerProps) {
  const [type, setType] = useState<AddressType>(allowedTypes[0] ?? 'I');
  const [number, setNumber] = useState<number>(1);

  useEffect(() => {
    if (!open) return;
    setType(initial?.type ?? allowedTypes[0] ?? 'I');
    setNumber(initial?.number ?? 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const max = useMemo(() => ({ ...DEFAULT_MAX, ...(maxForType ?? {}) })[type], [type, maxForType]);

  if (!open) return null;

  const confirm = () => {
    const n = Math.max(1, Math.min(max, Math.floor(number) || 1));
    onConfirm({ type, number: n });
  };

  const prefix = TYPE_PREFIX[type];
  const preview = `${prefix}${number}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        className="glass w-full max-w-md rounded-3xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X size={18} />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address Type</p>
            <div className="flex flex-wrap gap-2">
              {allowedTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    type === t
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/40 text-muted-foreground hover:bg-muted dark:bg-white/5'
                  )}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Number (1–{max})
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={max}
                value={number}
                onChange={(e) => setNumber(Number(e.target.value))}
                className="h-10 w-24 rounded-xl border border-border bg-white/60 px-3 text-sm font-mono dark:bg-white/5 dark:text-secondary"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirm();
                  if (e.key === 'Escape') onCancel();
                }}
              />
              <div className="flex flex-1 items-center justify-center rounded-xl bg-muted/40 py-2 font-mono text-lg font-semibold text-primary dark:bg-white/5">
                {preview}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={confirm}>
              <Check size={16} /> Confirm
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
