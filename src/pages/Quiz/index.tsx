import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Image as ImageIcon, ListChecks, Wand2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/utils/cn';

// ⚠️ UI ONLY. `view` below just switches which static screen is shown so
// both states (join / sample question) can be reviewed on one page — there
// is no real exam lookup, no grading, no XP calculation happening here.

const QUESTION_TYPES = [
  { label: 'Pilihan Ganda', icon: ListChecks },
  { label: 'Gambar', icon: ImageIcon },
  { label: 'Ladder Logic', icon: Wand2 },
];

const OPTIONS = [
  'Output akan ON karena kontak NO tertutup',
  'Output akan OFF karena tidak ada sinyal',
  'Timer akan mulai menghitung mundur',
  'Counter akan bertambah satu',
];

export default function QuizPage() {
  const [view, setView] = useState<'join' | 'question'>('join');
  const [code, setCode] = useState(['', '', '', '', '']);
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-md">
      <AnimatePresence mode="wait">
        {view === 'join' ? (
          <motion.div
            key="join"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Card>
              <CardContent className="p-6">
                <h2 className="font-display text-lg font-semibold">Masukkan Kode Ujian</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Minta kode ke gurumu, contoh: PLC-8A92X
                </p>

                <div className="mt-6 flex items-center justify-center gap-2">
                  <span className="font-display text-lg font-semibold text-muted-foreground">
                    PLC-
                  </span>
                  {code.map((char, i) => (
                    <input
                      key={i}
                      value={char}
                      onChange={(e) => {
                        const next = [...code];
                        next[i] = e.target.value.slice(-1).toUpperCase();
                        setCode(next);
                      }}
                      maxLength={1}
                      className="h-12 w-9 rounded-xl border border-border bg-transparent text-center font-display text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-border-dark"
                    />
                  ))}
                </div>

                <Button className="mt-6 w-full" onClick={() => setView('question')}>
                  Gabung Ujian <ArrowRight size={16} />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setView('join')}>
                <ArrowLeft size={15} /> Keluar
              </Button>
              <Badge variant="default">+10 XP</Badge>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Soal 1/10</span>
                <span>PLC-8A92X</span>
              </div>
              <Progress value={10} />
            </div>

            <div className="flex gap-2">
              {QUESTION_TYPES.map((t, i) => (
                <Badge key={t.label} variant={i === 0 ? 'default' : 'outline'} className="gap-1">
                  <t.icon size={12} />
                  {t.label}
                </Badge>
              ))}
            </div>

            <Card>
              <CardContent className="p-5">
                <p className="font-medium leading-relaxed">
                  Jika kontak I1 berjenis Normally Open (NO) dan dalam kondisi ON, apa yang
                  terjadi pada Output O1 yang terhubung langsung setelahnya?
                </p>

                <div className="mt-4 space-y-2">
                  {OPTIONS.map((opt, i) => (
                    <button
                      key={opt}
                      onClick={() => setSelected(i)}
                      className={cn(
                        'w-full rounded-2xl border px-4 py-3 text-left text-sm transition-colors',
                        selected === i
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-muted/40 dark:border-border-dark dark:hover:bg-white/5'
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" disabled={selected === null}>
              Soal Berikutnya <ArrowRight size={16} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
