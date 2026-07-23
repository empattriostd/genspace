import { ArrowLeft, Play, Square, Save, MoreVertical, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface TopAppBarProps {
  projectName: string;
  isRunning: boolean;
  isSaving: boolean;
  onBack?: () => void;
  onSave: () => void;
  onToggleRun: () => void;
  onOpenMenu: () => void;
}

/**
 * Android-style top app bar for the PLC simulator. Fixed height, large
 * (44px+) touch targets, one-hand reachable actions on the right edge.
 * Every button here is wired straight to plcRuntime via the callbacks
 * SimulatorPage passes in — this component owns no engine state itself.
 */
export function TopAppBar({
  projectName,
  isRunning,
  isSaving,
  onBack,
  onSave,
  onToggleRun,
  onOpenMenu,
}: TopAppBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b border-border bg-secondary/95 px-1.5 backdrop-blur-glass dark:border-border-dark dark:bg-dark/95">
      <button
        onClick={onBack}
        aria-label="Back"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dark active:scale-95 active:bg-muted/50 dark:text-secondary dark:active:bg-white/10"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="min-w-0 flex-1 px-1">
        <p className="truncate text-[15px] font-semibold leading-tight text-dark dark:text-secondary">
          {projectName}
        </p>
        <p className="flex items-center gap-1 text-[11px] leading-tight text-muted-foreground">
          <span className={cn('h-1.5 w-1.5 rounded-full', isRunning ? 'bg-primary' : 'bg-muted-foreground/50')} />
          {isRunning ? 'Running' : 'Stopped'}
        </p>
      </div>

      <button
        onClick={onSave}
        disabled={isSaving}
        aria-label="Save"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dark active:scale-95 active:bg-muted/50 disabled:opacity-50 dark:text-secondary dark:active:bg-white/10"
      >
        {isSaving ? <Loader2 size={19} className="animate-spin" /> : <Save size={19} />}
      </button>

      <button
        onClick={onToggleRun}
        aria-label={isRunning ? 'Stop' : 'Run'}
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm active:scale-95',
          isRunning ? 'bg-dark dark:bg-white/20' : 'bg-primary'
        )}
      >
        {isRunning ? <Square size={17} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </button>

      <button
        onClick={onOpenMenu}
        aria-label="Menu"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dark active:scale-95 active:bg-muted/50 dark:text-secondary dark:active:bg-white/10"
      >
        <MoreVertical size={20} />
      </button>
    </header>
  );
}
