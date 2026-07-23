import { useEffect, useRef, useState } from 'react';

/** Tracks a container div's rendered size so the Konva Stage can always
 * fill it exactly, including on window resize / sidebar toggle. */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}
