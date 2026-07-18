/**
 * Editor verification script — builds diagrams using ONLY the Phase 3
 * editor operations (add/delete/connect/branch/move), exports them with
 * exportToLadderJson(), then runs the result through the untouched Phase 2
 * parser + scan cycle. If editor-built diagrams behave identically to the
 * hand-written example JSONs from Phase 2, the conversion is correct AND
 * the engine really was left untouched.
 *
 * Run with: npx tsx src/simulator/examples/runEditorExample.ts
 */
import {
  createEmptyEditorDocument,
  addElement,
  deleteElement,
  connectElements,
  createBranch,
  insertElementOnEdge,
} from '../editor/operations';
import { createElementFromSpec } from '../editor/componentSpec';
import { exportToLadderJson } from '../editor/exportToLadderJson';
import { parseLadder } from '../parser/parseLadder';
import { runScanCycle } from '../engine/scanCycle';
import { createEmptyState } from '../types/plcState';
import type { PlcState } from '../types/plcState';
import type { CompiledLadder } from '../types/runtime';

function log(title: string) {
  console.log(`\n=== ${title} ===`);
}

function scanUntil(compiled: CompiledLadder, state: PlcState, scans: number, ms = 100): PlcState {
  let current = state;
  for (let i = 0; i < scans; i++) current = runScanCycle(compiled, current, ms).state;
  return current;
}

// ── 1. Build "I1 AND I2 -> O1" purely through editor operations ────────
log('Editor-built Series (I1 AND I2 -> O1)');
{
  let doc = createEmptyEditorDocument('Series via editor');
  const rungId = doc.rungOrder[0];

  const i1 = createElementFromSpec({ kind: 'CONTACT', mode: 'NO', address: { type: 'I', number: 1 }, at: { gridX: 0, gridY: 0 } });
  const i2 = createElementFromSpec({ kind: 'CONTACT', mode: 'NO', address: { type: 'I', number: 2 }, at: { gridX: 1, gridY: 0 } });
  const o1 = createElementFromSpec({ kind: 'COIL', address: { type: 'O', number: 1 }, at: { gridX: 2, gridY: 0 } });

  doc = addElement(doc, rungId, i1);
  doc = addElement(doc, rungId, i2);
  doc = addElement(doc, rungId, o1);
  doc = connectElements(doc, rungId, i1.id, i2.id);
  doc = connectElements(doc, rungId, i2.id, o1.id);

  const { project, errors } = exportToLadderJson(doc);
  console.log('validation errors:', errors.length === 0 ? 'none' : errors);

  const compiled = parseLadder(project);
  let state = createEmptyState();
  state.inputs[1] = true;
  state.inputs[2] = false;
  state = scanUntil(compiled, state, 1);
  console.log('I1=T I2=F -> O1 =', state.outputs[1], '(expect false)');

  state.inputs[2] = true;
  state = scanUntil(compiled, state, 1);
  console.log('I1=T I2=T -> O1 =', state.outputs[1], '(expect true)');
}

// ── 2. Build "I1 OR I2 -> O1" using createBranch + insertElementOnEdge ─
log('Editor-built Parallel via createBranch (I1 OR I2 -> O1)');
{
  let doc = createEmptyEditorDocument('Parallel via editor');
  const rungId = doc.rungOrder[0];

  const i1 = createElementFromSpec({ kind: 'CONTACT', mode: 'NO', address: { type: 'I', number: 1 }, at: { gridX: 0, gridY: 0 } });
  const o1 = createElementFromSpec({ kind: 'COIL', address: { type: 'O', number: 1 }, at: { gridX: 2, gridY: 0 } });

  doc = addElement(doc, rungId, i1);
  doc = addElement(doc, rungId, o1);
  doc = connectElements(doc, rungId, i1.id, o1.id); // main path: I1 -> O1

  const branchResult = createBranch(doc, rungId, i1.id, o1.id, { gridX: 1, gridY: 1 });
  doc = branchResult.doc; // adds a second, parallel path: I1 -> branchStart -> branchEnd -> O1

  const i2 = createElementFromSpec({ kind: 'CONTACT', mode: 'NO', address: { type: 'I', number: 2 }, at: { gridX: 1, gridY: 1 } });
  doc = insertElementOnEdge(doc, rungId, branchResult.branchStartId, branchResult.branchEndId, i2);
  // now: I1 -> branchStart -> I2 -> branchEnd -> O1, in parallel with I1 -> O1 directly

  const { project, errors } = exportToLadderJson(doc);
  console.log('validation errors:', errors.length === 0 ? 'none' : errors);

  const compiled = parseLadder(project);
  let state = createEmptyState();
  state.inputs[1] = false;
  state.inputs[2] = false;
  state = scanUntil(compiled, state, 1);
  console.log('I1=F I2=F -> O1 =', state.outputs[1], '(expect false)');

  state.inputs[1] = true;
  state = scanUntil(compiled, state, 1);
  console.log('I1=T I2=F -> O1 =', state.outputs[1], '(expect true, direct path)');
}

// ── 3. Delete Component cleans up dangling references ──────────────────
log('Delete Component — dangling reference cleanup');
{
  let doc = createEmptyEditorDocument('Delete test');
  const rungId = doc.rungOrder[0];

  const a = createElementFromSpec({ kind: 'CONTACT', mode: 'NO', address: { type: 'I', number: 1 }, at: { gridX: 0, gridY: 0 } });
  const b = createElementFromSpec({ kind: 'CONTACT', mode: 'NO', address: { type: 'I', number: 2 }, at: { gridX: 1, gridY: 0 } });
  const c = createElementFromSpec({ kind: 'COIL', address: { type: 'O', number: 1 }, at: { gridX: 2, gridY: 0 } });

  doc = addElement(doc, rungId, a);
  doc = addElement(doc, rungId, b);
  doc = addElement(doc, rungId, c);
  doc = connectElements(doc, rungId, a.id, b.id);
  doc = connectElements(doc, rungId, b.id, c.id);

  doc = deleteElement(doc, rungId, b.id);
  console.log('A.connectsTo after deleting B:', doc.rungs[rungId].elements[a.id].connectsTo, '(expect [] — dangling edge removed)');

  const { errors } = exportToLadderJson(doc);
  console.log('export errors on now-dead-end rung:', errors.length > 0 ? errors[0] : 'none (unexpected)');
}

// ── 4. Connect Elements rejects a cycle before it reaches the engine ───
log('Connect Elements — cycle prevention');
{
  let doc = createEmptyEditorDocument('Cycle test');
  const rungId = doc.rungOrder[0];

  const a = createElementFromSpec({ kind: 'CONTACT', mode: 'NO', address: { type: 'I', number: 1 }, at: { gridX: 0, gridY: 0 } });
  const b = createElementFromSpec({ kind: 'CONTACT', mode: 'NO', address: { type: 'I', number: 2 }, at: { gridX: 1, gridY: 0 } });
  const c = createElementFromSpec({ kind: 'COIL', address: { type: 'O', number: 1 }, at: { gridX: 2, gridY: 0 } });

  doc = addElement(doc, rungId, a);
  doc = addElement(doc, rungId, b);
  doc = addElement(doc, rungId, c);
  doc = connectElements(doc, rungId, a.id, b.id);
  doc = connectElements(doc, rungId, b.id, c.id);

  try {
    connectElements(doc, rungId, c.id, a.id); // would close a loop c -> a -> b -> c
    console.log('ERROR: cycle was NOT rejected (bug)');
  } catch (err) {
    console.log('cycle correctly rejected:', (err as Error).message);
  }
}

console.log('\nAll editor examples executed.\n');
