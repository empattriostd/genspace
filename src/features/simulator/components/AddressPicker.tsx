import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Address, AddressType } from '@/simulator/types/address';
import { cn } from '@/utils/cn';

export interface AddressPickerProps {
  open: boolean;
  allowedTypes: AddressType[];
  maxForType?: Partial<Record<AddressType, number>>;
  title: string;
  initial: Address | null;
  onConfirm: (addr: Address) => void;
  onCancel: () => void;
}

const TYPE_LABELS: Record<AddressType, string> = {
  I: 'Input',
  O: 'Output',
  TIM: 'Timer',
  CTU: 'Counter',
  M: 'Memory',
};

const TYPE_PREFIX: Record<AddressType, string> = {
  I: 'I',
  O: 'O',
  TIM: 'T',
  CTU: 'C',
  M: 'M',
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
  const [type, setType] = useState<AddressType>(initial?.type ?? allowedTypes[0] ?? 'I');
  const [number, setNumber] = useState<number>(initial?.number ?? 1);

  useEffect(() => {
    if (open) {
      setType(initial?.type ?? allowedTypes[0] ?? 'I');
      setNumber(initial?.number ?? 1);
    }
  }, [open, initial, allowedTypes]);

  const max = maxForType?.[type] ?? 26;
  const preview = `${TYPE_PREFIX[type]}${number}`;

  const confirm = () => {
    if (number < 1 || number > max) return;
    onConfirm({ type, number });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={onCancel}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300" />
            <h3 className="mb-4 text-center text-lg font-bold text-dark">{title}</h3>

            {/* Type selector */}
            <div className="mb-4 flex flex-wrap gap-2">
              {allowedTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    'flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                    type === t
                      ? 'bg-[#F26B3A] text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            {/* Number input */}
            <div className="mb-4 flex items-center justify-center gap-4">
              <button
                onClick={() => setNumber((n) => Math.max(1, n - 1))}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl font-bold text-gray-600 active:bg-gray-200"
              >
                −
              </button>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-mono font-bold text-dark">{preview}</span>
                <span className="text-[10px] text-gray-400">1–{max}</span>
              </div>
              <button
                onClick={() => setNumber((n) => Math.min(max, n + 1))}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl font-bold text-gray-600 active:bg-gray-200"
              >
                +
              </button>
            </div>

            {/* Quick number grid */}
            <div className="mb-5 grid grid-cols-8 gap-1.5">
              {Array.from({ length: Math.min(16, max) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setNumber(n)}
                  className={cn(
                    'rounded-lg py-1.5 text-xs font-mono font-semibold transition-colors',
                    number === n
                      ? 'bg-[#F26B3A] text-white'
                      : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-600 active:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirm}
                className="flex-1 rounded-xl bg-[#F26B3A] py-3 text-sm font-semibold text-white shadow-md active:bg-[#D95A2E]"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
