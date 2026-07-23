import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LadderElement } from '@/simulator/types/ladder';
import type { AddressType } from '@/simulator/types/address';

interface PropertyDialogProps {
  element: LadderElement;
  onClose: () => void;
  onSave: (updates: { address?: { type: AddressType; number: number }; comment?: string; alias?: string }) => void;
}

/** Valid address types per element kind — a CONTACT can read any bit, but a
 * COIL only ever targets O or M, and TIMER/COUNTER addresses are fixed to
 * their own namespace (changing a Timer's address type would turn it into
 * something else entirely, so that field is locked for those two kinds). */
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
 * Double-click property editor — Address / Comment / Alias, per the Phase 5
 * brief ("Semua Contact, Coil, Timer, Counter harus bisa di-double click").
 * Address can be reassigned from here; validity (duplicates, wrong type) is
 * still enforced by the existing parser at export/Run time, surfaced via
 * the toolbar's error banner — this dialog doesn't duplicate that check.
 */
export function PropertyDialog({ element, onClose, onSave }: PropertyDialogProps) {
  const hasAddress = 'address' in element && !!element.address;
  const allowedTypes = allowedTypesFor(element);

  const [addressType, setAddressType] = useState<AddressType>(hasAddress ? element.address!.type : allowedTypes[0]);
  const [addressNumber, setAddressNumber] = useState(hasAddress ? element.address!.number : 1);
  const [comment, setComment] = useState(element.comment ?? '');
  const [alias, setAlias] = useState(element.alias ?? '');

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function handleSave() {
    onSave({
      address: hasAddress ? { type: addressType, number: addressNumber } : undefined,
      comment,
      alias,
    });
    onClose();
  }

  const addressLocked = element.kind === 'TIMER' || element.kind === 'COUNTER';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Element Properties</CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-dark dark:hover:text-secondary">
            <X size={18} />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasAddress && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Address</label>
              <div className="mt-1 flex gap-2">
                <select
                  value={addressType}
                  disabled={addressLocked}
                  onChange={(e) => setAddressType(e.target.value as AddressType)}
                  className="h-9 rounded-xl border border-border bg-transparent px-2 text-sm disabled:opacity-50 dark:border-border-dark"
                >
                  {allowedTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={26}
                  value={addressNumber}
                  onChange={(e) => setAddressNumber(Math.min(26, Math.max(1, Number(e.target.value) || 1)))}
                  className="h-9 w-20 rounded-xl border border-border bg-transparent px-2 text-sm dark:border-border-dark"
                />
              </div>
              {addressLocked && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Address type is fixed for {element.kind === 'TIMER' ? 'Timer' : 'Counter'} blocks — only the number can change.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Comment</label>
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Start button"
              className="mt-1 h-9 w-full rounded-xl border border-border bg-transparent px-3 text-sm dark:border-border-dark"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Alias (optional)</label>
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="e.g. START_BTN"
              className="mt-1 h-9 w-full rounded-xl border border-border bg-transparent px-3 text-sm dark:border-border-dark"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
