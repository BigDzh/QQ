import { startTransition } from 'react';
import { NavigateFunction, To } from 'react-router-dom';

export function safeNavigate(navigate: NavigateFunction, to: To, options?: { replace?: boolean; state?: unknown }) {
  startTransition(() => {
    navigate(to, options);
  });
}
