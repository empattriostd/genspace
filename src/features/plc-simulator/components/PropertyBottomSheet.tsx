import { useState } from 'react';
import { X } from 'lucide-react';
import type { LadderElement } from '@/simulator/types/ladder';
import type { AddressType } from '@/simulator/types/address';
import { cn } from '@/utils/cn';

interface PropertyBottomSheetProps {
  element: LadderElement;
  onClose: () => void;
  onSave: (updates: { address?: { type: AddressType; number: number }; comment?: string; alias?: string }) => void;
}

/** Same rule as the desktop PropertyDialog: a CONTACT can read any bit, a
 * COIL only ever targets O or M, TIMER/COUNTER addresses are locked to
 * their own namespace. */
function allowedTypesFor(element: LadderElement): AddressType[] {
  switch (element.kind) {
    case 'CONTACT':
      return ['I', 'O', 'M', 'TIM', 'CTU'];
    case 'COIL':
      return ['O', 'M'];
    case 'TIMER':
      return ['TIM'];
    case 'COUNTER':
      return ['CTU'];
    default:
      return [];
  }
}

/**
 * Android bottom-sheet equivalent of PropertyDialog.tsx — slides up from
 * the bottom instead of a centered modal, large tap targets for the
 * address stepper. Wired to the exact same useLadderEditorStore.updateElement
 * action (via the onSave callback SimulatorPage passes down), so editing
 * here and editing on the desktop canvas mutate the identical document.
 *
 * Timer/Counter Preset is shown read-only: updateElementProperties (the
 * only mutation the editor store exposes for this) only accepts
 * address/comment/alias — preset is fixed at creation time via the
 * toolbox, matching what the underlying editor API actually supports
 * today rather than presenting a control this build can't wire through.
 */
export function PropertyBottomSheet({ element, onClose, onSave }: PropertyBottomSheetProps) {
  const hasAddress = 'address' in element && !!element.address;
  const allowedTypes = allowedTypesFor(element);
  const addressLocked = element.kind === 'TIMER' || element.kind === 'COUNTER';

  const [addressType, setAddressType] = useState<AddressType>(hasAddress ? element.address!.type : allowedTypes[0]);
  const [addressNumber, setAddressNumber] = useState(hasAddress ? element.address!.number : 1);
  const [comment, setComment] = useState(element.comment ?? '');
  const [alias, setAlias] = useState(element.alias ?? '');

  function handleSave() {
    onSave({
      address: hasAddress ? { type: addressType, number: addressNumber } : undefined,
      comment,
      alias,
    });
    onClose();
  }

  function step(delta: number) {
    setAddressNumber((n) => Math.min(26, Math.max(1, n + delta)));
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="animate-fade-in max-h-[75vh] overflow-y-auto rounded-t-3xl bg-secondary p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:bg-dark"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted" />

        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-dark dark:text-secondary">
            {element.kind === 'TIMER' ? 'Timer Settings' : element.kind === 'COUNTER' ? 'Counter Settings' : 'Element Properties'}
          </h3>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted/50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {hasAddress && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Address</label>
              <div className="mt-1.5 flex items-center gap-2">
                <select
                  value={addressType}
                  disabled={addressLocked}
                  onChange={(e) => setAddressType(e.target.value as AddressType)}
                  className="h-11 rounded-xl border border-border bg-white px-3 text-sm disabled:opacity-50 dark:border-border-dark dark:bg-white/5"
                >
                  {allowedTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                <div className="flex h-11 flex-1 items-center justify-between rounded-xl border border-border dark:border-border-dark">
                  <button onClick={() => step(-1)} className="h-full w-11 text-lg font-semibold text-primary active:bg-muted/50">
                    −
                  </button>
                  <span className="font-mono text-base font-semibold">{addressNumber}</span>
                  <button onClick={() => step(1)} className="h-full w-11 text-lg font-semibold text-primary active:bg-muted/50">
                    +
                  </button>
                </div>
              </div>
              {addressLocked && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Address type is fixed for {element.kind === 'TIMER' ? 'Timer' : 'Counter'} blocks — only the number changes.
                </p>
              )}
            </div>
          )}

          {element.kind === 'TIMER' && (
            <PresetRow label="Preset" value={`${element.presetMs} ms`} sub={`Mode: ${element.timerType}`} />
          )}
          {element.kind === 'COUNTER' && (
            <PresetRow label="Preset" value={`${element.presetCount}`} sub={`Mode: ${element.counterType}`} />
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Comment</label>
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Start button"
              className="mt-1.5 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm dark:border-border-dark dark:bg-white/5"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Alias (optional)</label>
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="e.g. START_BTN"
              className="mt-1.5 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm dark:border-border-dark dark:bg-white/5"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="h-12 flex-1 rounded-2xl border border-border text-sm font-medium dark:border-border-dark"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={cn('h-12 flex-1 rounded-2xl bg-primary text-sm font-semibold text-white active:opacity-90')}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PresetRow({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-white/60 px-3 py-2.5 dark:border-border-dark dark:bg-white/5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="font-mono text-sm font-semibold text-dark dark:text-secondary">{value}</span>
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{sub} · set from the toolbox at creation</p>
    </div>
  );
}
