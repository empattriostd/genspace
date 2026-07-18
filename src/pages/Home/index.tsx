import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Flame, ChevronRight, Trophy, Cpu, ListChecks, BookOpen, Medal } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// ⚠️ UI ONLY — every value below is placeholder/dummy content for layout
// purposes. Wiring to real user/project/leaderboard data is a later phase.

const RECENT_ACTIVITY = [
  { label: 'Menyelesaikan quiz "Dasar Ladder Logic"', time: '2 jam lalu' },
  { label: 'Menyimpan project "Traffic Light v2"', time: 'Kemarin' },
  { label: 'Naik ke Level 7', time: '2 hari lalu' },
];

const LEADERBOARD_PREVIEW = [
  { name: 'Raka A.', xp: 2140 },
  { name: 'Bintang P.', xp: 1980 },
  { name: 'Ken M.', xp: 1875 },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function HomePage() {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="mx-auto flex max-w-5xl flex-col gap-4"
    >
      {/* Welcome Banner */}
      <motion.div variants={item} className="relative overflow-hidden rounded-3xl glass p-6 md:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, #F26B3A 0%, transparent 70%)' }}
        />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Halo, Bintang 👋</p>
            <h2 className="mt-1 font-display text-2xl font-semibold md:text-3xl">
              Lanjut belajar PLC hari ini?
            </h2>
          </div>
          <Badge variant="default" className="hidden sm:inline-flex">
            <Flame size={14} className="text-primary" />
            12 hari beruntun
          </Badge>
        </div>
      </motion.div>

      {/* Bento grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Continue Project — wide tile */}
        <motion.div variants={item} className="col-span-2 md:col-span-2 md:row-span-2">
          <Card className="flex h-full flex-col justify-between">
            <CardContent className="flex h-full flex-col justify-between p-5">
              <div>
                <Badge variant="muted">Lanjutkan Project</Badge>
                <h3 className="mt-3 font-display text-lg font-semibold">Traffic Light v2</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  3 rung ladder · terakhir diedit kemarin
                </p>
              </div>
              <div className="mt-6 space-y-3">
                <Progress value={62} />
                <Button className="w-full">
                  Lanjutkan <ChevronRight size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Daily Challenge */}
        <motion.div variants={item} className="col-span-2 md:col-span-2">
          <Card className="h-full">
            <CardContent className="flex items-center justify-between gap-3 p-5">
              <div>
                <Badge variant="default">Tantangan Harian</Badge>
                <h3 className="mt-2 font-medium">Rangkai 1 rung timer</h3>
                <p className="text-xs text-muted-foreground">Selesai sebelum 23:59</p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl font-semibold text-primary">+50</p>
                <p className="text-[11px] text-muted-foreground">XP</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Leaderboard preview */}
        <motion.div variants={item} className="col-span-1 md:col-span-2">
          <Card className="h-full">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Trophy size={16} className="text-primary" />
                <h3 className="text-sm font-semibold">Papan Peringkat</h3>
              </div>
              <div className="space-y-2.5">
                {LEADERBOARD_PREVIEW.map((u, i) => (
                  <div key={u.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          i === 0
                            ? 'text-primary font-semibold'
                            : 'text-muted-foreground'
                        }
                      >
                        {i + 1}.
                      </span>
                      <span>{u.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{u.xp} XP</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent activity */}
        <motion.div variants={item} className="col-span-1 md:col-span-2">
          <Card className="h-full">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Medal size={16} className="text-primary" />
                <h3 className="text-sm font-semibold">Aktivitas Terakhir</h3>
              </div>
              <div className="space-y-2.5">
                {RECENT_ACTIVITY.map((a) => (
                  <div key={a.label} className="text-sm">
                    <p className="leading-snug">{a.label}</p>
                    <p className="text-[11px] text-muted-foreground">{a.time}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Feature cards — quick access */}
      <motion.div variants={item} className="grid grid-cols-3 gap-3">
        {[
          { label: 'Simulator', icon: Cpu, to: '/simulator' },
          { label: 'Quiz', icon: ListChecks, to: '/quiz' },
          { label: 'Materi', icon: BookOpen, to: '/materials' },
        ].map((f) => (
          <Link key={f.label} to={f.to}>
            <Card className="hover:bg-white/70 dark:hover:bg-white/10 transition-colors">
              <CardContent className="flex flex-col items-center gap-2 py-5 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <f.icon size={20} />
                </div>
                <span className="text-xs font-medium">{f.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </motion.div>
    </motion.div>
  );
}
