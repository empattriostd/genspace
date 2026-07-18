import { motion } from 'framer-motion';
import { Flame, Award, Lock, FileBadge } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';

// ⚠️ UI ONLY — XP/level/badge values are hardcoded placeholders.
// Real XP math + Supabase profile data are wired in a later phase.

const BADGES = [
  { label: 'First Rung', unlocked: true },
  { label: 'Timer Master', unlocked: true },
  { label: 'Quiz Streak 7', unlocked: true },
  { label: 'Counter Pro', unlocked: false },
  { label: 'Branch Wizard', unlocked: false },
  { label: 'Top 10', unlocked: false },
];

const ACHIEVEMENTS = [
  { label: 'Menyelesaikan 10 quiz', date: '3 Jul 2026' },
  { label: 'Menyimpan 5 project ladder', date: '28 Jun 2026' },
];

function XpRing({ percent, level }: { percent: number; level: number }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <svg viewBox="0 0 108 108" className="h-32 w-32 -rotate-90">
        <circle cx="54" cy="54" r={radius} fill="none" strokeWidth="8" className="stroke-muted/60 dark:stroke-white/10" />
        <motion.circle
          cx="54"
          cy="54"
          r={radius}
          fill="none"
          stroke="#F26B3A"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-2xl font-bold">{level}</span>
        <span className="text-[10px] text-muted-foreground">LEVEL</span>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const xp = 680;
  const xpForNext = 1000;
  const percent = Math.round((xp / xpForNext) * 100);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      {/* Header */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 font-display text-xl font-semibold text-primary">
              BP
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Bintang Pratama</h2>
              <Badge variant="outline" className="mt-1">Student</Badge>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Flame size={16} className="text-primary" />
              12 hari
            </div>
            <XpRing percent={percent} level={7} />
          </div>
        </CardContent>
      </Card>
      <p className="-mt-2 text-center text-xs text-muted-foreground sm:text-right">
        {xp} / {xpForNext} XP menuju Level 8
      </p>

      {/* Badges */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Award size={16} className="text-primary" />
            <h3 className="text-sm font-semibold">Badges</h3>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {BADGES.map((b) => (
              <div key={b.label} className="flex flex-col items-center gap-1.5 text-center">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-2xl',
                    b.unlocked ? 'bg-primary/15 text-primary' : 'bg-muted/50 text-muted-foreground dark:bg-white/5'
                  )}
                >
                  {b.unlocked ? <Award size={20} /> : <Lock size={16} />}
                </div>
                <span className="text-[10px] leading-tight text-muted-foreground">{b.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Achievements</h3>
          <div className="space-y-3">
            {ACHIEVEMENTS.map((a) => (
              <div key={a.label} className="flex items-center justify-between text-sm">
                <span>{a.label}</span>
                <span className="text-xs text-muted-foreground">{a.date}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Certificate teaser */}
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground dark:bg-white/5">
            <FileBadge size={20} />
          </div>
          <div>
            <p className="text-sm font-medium">Sertifikat pertama menanti</p>
            <p className="text-xs text-muted-foreground">
              Selesaikan 5 quiz lagi untuk membuka sertifikat "Dasar PLC".
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
