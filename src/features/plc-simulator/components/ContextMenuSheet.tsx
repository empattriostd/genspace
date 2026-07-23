import type { ReactNode } from 'react';
import { Trash2, GitBranch, GitPullRequestClosed, Pencil } from 'lucide-react';
import type { LadderElement } from '@/simulator/types/ladder';

interface ContextMenuSheetProps {
  element: LadderElement;
  onDelete: () => void;
  onInsertBranch: () => void;
  onDeleteBranch: () => void;
  onEditAddress: () => void;
  onClose: () => void;
}

/**
 * Long-press action sheet — the touch equivalent of a desktop right-click
 * menu. Every action calls straight into useLadderEditorStore (via the
 * callbacks SimulatorPage wires up) — deleteComponent for Delete,
 * branch() for Insert Branch (arms the same two-tap anchor flow the
 * desktop canvas uses), deleteComponent on the BRANCH_START/END node for
 * Delete Branch, and opens PropertyBottomSheet for Edit Address.
 */
export function ContextMenuSheet({
  element,
  onDelete,
  onInsertBranch,
  onDeleteBranch,
  onEditAddress,
  onClose,
}: ContextMenuSheetProps) {
  const isBranchNode = element.kind === 'BRANCH_START' || element.kind === 'BRANCH_END';
  const canEditAddress = element.kind !== 'WIRE' && element.kind !== 'BRANCH_START' && element.kind !== 'BRANCH_END';

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="animate-fade-in rounded-t-3xl bg-secondary p-2 pb-[max(1rem,env(safe-area-inset-bottom))] dark:bg-dark"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-muted" />
        <p className="px-3 pb-1 pt-1 text-xs font-semibold text-muted-foreground">
          {element.kind}
          {'address' in element && element.address ? ` · ${element.address.type}${element.address.number}` : ''}
        </p>

        <div className="space-y-1 pb-1">
          {canEditAddress && (
            <MenuItem icon={<Pencil size={18} />} label="Edit Address" onClick={onEditAddress} />
          )}
          {!isBranchNode && (
            <MenuItem icon={<GitBranch size={18} />} label="Insert Branch" onClick={onInsertBranch} />
          )}
          {isBranchNode && (
            <MenuItem icon={<GitPullRequestClosed size={18} />} label="Delete Branch" onClick={onDeleteBranch} />
          )}
          <MenuItem icon={<Trash2 size={18} />} label="Delete" tone="danger" onClick={onDelete} />
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  tone = 'default',
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      className={
        tone === 'danger'
          ? 'flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-sm font-medium text-red-500 active:bg-red-500/10'
          : 'flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-sm font-medium text-dark active:bg-muted/50 dark:text-secondary dark:active:bg-white/10'
      }
    >
      {icon}
      {label}
    </button>
  );
}
