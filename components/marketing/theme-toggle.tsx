'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

/* Detect hydration without setState-in-effect: the server snapshot is false,
 * the client snapshot is true, so `mounted` flips to true after hydration. */
const noopSubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/* Light/dark switcher for the marketing landing. Toggles the global next-themes
 * value (persisted to localStorage). Renders a neutral placeholder until mounted
 * to avoid a hydration mismatch on the theme-dependent icon. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={
        !mounted
          ? 'Changer de thème'
          : isDark
            ? 'Passer au thème clair'
            : 'Passer au thème sombre'
      }
      className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px"
    >
      {mounted ? (
        isDark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />
      ) : (
        <span className="size-4" aria-hidden />
      )}
    </button>
  );
}
