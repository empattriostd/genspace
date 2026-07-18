import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Play,
  Square,
  RotateCcw,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';

// ⚠️ UI ONLY. `isPreviewRunning` below just toggles a decorative CSS/SVG
// animation so the "energized path" look can be reviewed — there is no
// scan cycle, no parser, no runtime here. The real engine is a dedicated
// later phase (src/simulator/engine).

const TOOLBAR_GROUPS: { icon: typeof Undo2; label: string }[][] = [
  [
    { icon: Undo2, label: 'Undo' },
    { icon: Redo2, label: 'Redo' },
  ],
  [
    { icon: ZoomOut, label: 'Zoom Out' },
    { icon: ZoomIn, label: 'Zoom In' },
  ],
];

// Domain-accurate ladder glyphs, hand-drawn as tiny SVGs rather than generic
// icons — these are the actual IEC-style symbols an instructor would expect.
function GlyphNOContact() {
  return (
    <svg viewBox="0 0 24 16" width="26" height="18">
      <line x1="0" y1="8" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" />
      <line x1="16" y1="1" x2="16" y2="15" stroke="currentColor" strokeWidth="1.5" />
      <line x1="16" y1="8" x2="24" y2="8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function GlyphNCContact() {
  return (
    <svg viewBox="0 0 24 16" width="26" height="18">
      <line x1="0" y1="8" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" />
      <line x1="16" y1="1" x2="16" y2="15" stroke="currentColor" strokeWidth="1.5" />
      <line x1="16" y1="8" x2="24" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="6" y1="15" x2="18" y2="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function GlyphCoil() {
  return (
    <svg viewBox="0 0 24 16" width="26" height="18">
      <line x1="0" y1="8" x2="7" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="17" y1="8" x2="24" y2="8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function GlyphTimer() {
  return (
    <svg viewBox="0 0 24 16" width="26" height="18">
      <rect x="4" y="1" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="12" y="11" fontSize="7" textAnchor="middle" fill="currentColor">T</text>
    </svg>
  );
}
function GlyphCounter() {
  return (
    <svg viewBox="0 0 24 16" width="26" height="18">
      <rect x="4" y="1" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="12" y="11" fontSize="7" textAnchor="middle" fill="currentColor">C</text>
    </svg>
  );
}
function GlyphMemory() {
  return (
    <svg viewBox="0 0 24 16" width="26" height="18">
      <rect x="4" y="1" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="12" y="11" fontSize="7" textAnchor="middle" fill="currentColor">M</text>
    </svg>
  );
}
function GlyphBranch() {
  return (
    <svg viewBox="0 0 24 16" width="26" height="18">
      <line x1="0" y1="8" x2="24" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="4" y1="8" x2="4" y2="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="20" y1="8" x2="20" y2="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="4" y1="2" x2="20" y2="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function GlyphWire() {
  return (
    <svg viewBox="0 0 24 16" width="26" height="18">
      <line x1="0" y1="8" x2="24" y2="8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function GlyphComment() {
  return (
    <svg viewBox="0 0 24 16" width="26" height="18">
      <rect x="2" y="2" width="20" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  );
}

const PALETTE = [
  { label: 'NO Contact', addr: 'I', Glyph: GlyphNOContact },
  { label: 'NC Contact', addr: 'I', Glyph: GlyphNCContact },
  { label: 'Output Coil', addr: 'O', Glyph: GlyphCoil },
  { label: 'Timer', addr: 'TIM', Glyph: GlyphTimer },
  { label: 'Counter', addr: 'CTU', Glyph: GlyphCounter },
  { label: 'Memory', addr: 'M', Glyph: GlyphMemory },
  { label: 'Branch', addr: '', Glyph: GlyphBranch },
  { label: 'Wire', addr: '', Glyph: GlyphWire },
  { label: 'Comment', addr: '', Glyph: GlyphComment },
];

export default function PlcSimulatorPage() {
  const [isPreviewRunning, setIsPreviewRunning] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const activeColor = isPreviewRunning ? '#F26B3A' : '#B8B8B8';

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-semibold">PLC Simulator</h2>
        <p className="text-sm text-muted-foreground">
          Pratinjau tampilan — logic engine belum aktif di fase ini.
        </p>
      </div>

      {/* Toolbar */}
      <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-2">
        {TOOLBAR_GROUPS.map((group, gi) => (
          <div key={gi} className="flex items-center gap-1 border-r border-border pr-2 last:border-none dark:border-border-dark">
            {group.map(({ icon: Icon, label }) => (
              <Button key={label} variant="ghost" size="icon" aria-label={label} title={label}>
                <Icon size={18} />
              </Button>
            ))}
          </div>
        ))}

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant={isPreviewRunning ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsPreviewRunning(true)}
          >
            <Play size={15} /> Run
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsPreviewRunning(false)}>
            <Square size={15} /> Stop
          </Button>
          <Button variant="ghost" size="icon" aria-label="Reset" title="Reset" onClick={() => setIsPreviewRunning(false)}>
            <RotateCcw size={18} />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Save" title="Save">
            <Save size={18} />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        {/* Component palette */}
        <div className="glass flex gap-2 overflow-x-auto rounded-2xl p-3 md:w-48 md:flex-col md:overflow-visible">
          {PALETTE.map(({ label, addr, Glyph }) => (
            <button
              key={label}
              onClick={() => setSelectedTool(label)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium transition-colors md:w-full',
                selectedTool === label
                  ? 'bg-primary/15 text-primary'
                  : 'hover:bg-muted/40 dark:hover:bg-white/5'
              )}
            >
              <span className="text-dark dark:text-secondary">
                <Glyph />
              </span>
              <span className="whitespace-nowrap">{label}</span>
              {addr && (
                <span className="ml-auto hidden text-[10px] text-muted-foreground md:inline">
                  {addr}#
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Canvas mock */}
        <div className="glass relative flex-1 overflow-hidden rounded-3xl p-4">
          <div
            className="absolute inset-0 opacity-[0.35] dark:opacity-[0.08]"
            style={{
              backgroundImage:
                'linear-gradient(to right, #80808020 1px, transparent 1px), linear-gradient(to bottom, #80808020 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <svg viewBox="0 0 480 180" className="relative w-full">
            {/* Rung 1: I1 --| |-- O1 --( ) */}
            <text x="8" y="46" fontSize="11" fill="currentColor" className="text-muted-foreground">
              Rung 1
            </text>
            <line x1="12" y1="60" x2="60" y2="60" stroke={activeColor} strokeWidth="2" />
            <text x="30" y="52" fontSize="10" fill={activeColor} textAnchor="middle">I1</text>
            <line x1="60" y1="52" x2="60" y2="68" stroke={activeColor} strokeWidth="2" />
            <line x1="70" y1="52" x2="70" y2="68" stroke={activeColor} strokeWidth="2" />
            <line x1="70" y1="60" x2="150" y2="60" stroke={activeColor} strokeWidth="2" />
            <circle cx="165" cy="60" r="14" fill="none" stroke={activeColor} strokeWidth="2" />
            <text x="165" y="64" fontSize="10" fill={activeColor} textAnchor="middle">O1</text>
            <line x1="179" y1="60" x2="220" y2="60" stroke={activeColor} strokeWidth="2" />

            {isPreviewRunning && (
              <motion.circle
                r="4"
                fill="#F26B3A"
                initial={{ cx: 12, cy: 60 }}
                animate={{ cx: [12, 220], cy: 60 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
              />
            )}

            {/* Rung 2: I2 --|/|-- TIM1 */}
            <text x="8" y="106" fontSize="11" fill="currentColor" className="text-muted-foreground">
              Rung 2
            </text>
            <line x1="12" y1="120" x2="60" y2="120" stroke="#B8B8B8" strokeWidth="2" />
            <text x="30" y="112" fontSize="10" fill="#B8B8B8" textAnchor="middle">I2</text>
            <line x1="55" y1="128" x2="65" y2="112" stroke="#B8B8B8" strokeWidth="2" />
            <line x1="60" y1="112" x2="60" y2="128" stroke="#B8B8B8" strokeWidth="2" />
            <line x1="70" y1="112" x2="70" y2="128" stroke="#B8B8B8" strokeWidth="2" />
            <line x1="70" y1="120" x2="150" y2="120" stroke="#B8B8B8" strokeWidth="2" />
            <rect x="152" y="106" width="28" height="28" rx="3" fill="none" stroke="#B8B8B8" strokeWidth="2" />
            <text x="166" y="124" fontSize="9" fill="#B8B8B8" textAnchor="middle">TIM1</text>
            <line x1="180" y1="120" x2="220" y2="120" stroke="#B8B8B8" strokeWidth="2" />
          </svg>

          <div className="relative mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Scan Cycle: -- ms</span>
            <Badge variant={isPreviewRunning ? 'success' : 'muted'}>
              {isPreviewRunning ? 'RUN (preview)' : 'STOP'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
