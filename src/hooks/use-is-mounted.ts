
'use client';

import { useState, useEffect } from 'react';

/**
 * A custom hook that returns `true` once the component has mounted on the client.
 * This is useful for preventing hydration mismatches when rendering content
 * that depends on client-side APIs or differs from the server-rendered output
 * (e.g., formatted dates, numbers, window-dependent values).
 *
 * @returns {boolean} `true` if the component is mounted, otherwise `false`.
 */
export function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}
