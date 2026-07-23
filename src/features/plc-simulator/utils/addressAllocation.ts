import type { AddressType } from '@/simulator/types/address';
import type { EditorDocument } from '@/simulator/editor/types';

/**
 * Picks the smallest unused address number (1-26) of the given type across
 * the whole document, so dropping a palette item onto the canvas doesn't
 * force an address-picker dialog on every single drop. The user can still
 * change it afterward via the (future) properties panel.
 */
export function nextAvailableAddress(doc: EditorDocument, type: AddressType): number {
  const used = new Set<number>();
  for (const rungId of doc.rungOrder) {
    for (const id of doc.rungs[rungId].elementOrder) {
      const el = doc.rungs[rungId].elements[id];
      if ('address' in el && el.address?.type === type) used.add(el.address.number);
    }
  }
  for (let n = 1; n <= 26; n++) {
    if (!used.has(n)) return n;
  }
  return 26; // document is using every address of this type — reuse the last one rather than throw
}
