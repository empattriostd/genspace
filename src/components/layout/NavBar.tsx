import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Cpu, ListChecks, User } from 'lucide-react';
import { cn } from '@/utils/cn';

// Nav scope intentionally limited to the 4 pages built this pass
// (Home / Simulator / Quiz / Profile). Materials/Ranking/Teacher already
// have routes from Phase 1 but no nav entry yet — added when their UI is built.
const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/simulator', label: 'Simulator', icon: Cpu },
  { to: '/quiz', label: 'Quiz', icon: ListChecks },
  { to: '/profile', label: 'Profile', icon: User },
] as const;

/** Desktop: fixed left rail. Mobile: fixed bottom bar. Same data, two layouts. */
export function SidebarNav() {
  return (
    <nav className="hidden md:flex md:w-20 lg:w-56 shrink-0 flex-col gap-1 border-r border-border dark:border-border-dark p-3 lg:p-4">
      <div className="mb-4 px-2 hidden lg:block">
        <p className="font-display text-sm font-semibold">GENSPACE</p>
        <p className="text-[11px] text-muted-foreground">One Space for Everything.</p>
      </div>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
              'lg:justify-start justify-center',
              isActive
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:bg-muted/40 dark:hover:bg-white/5'
            )
          }
        >
          <item.icon size={20} strokeWidth={2.25} />
          <span className="hidden lg:inline">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md items-center justify-around gap-1 p-2 md:hidden">
      <div className="glass flex w-full items-center justify-around rounded-3xl px-2 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 -z-10 rounded-2xl bg-primary/15"
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.4 }}
                  />
                )}
                <item.icon
                  size={20}
                  strokeWidth={2.25}
                  className={isActive ? 'text-primary' : 'text-muted-foreground'}
                />
                <span className={isActive ? 'text-primary' : 'text-muted-foreground'}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
