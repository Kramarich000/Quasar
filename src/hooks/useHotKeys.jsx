import { useEffect } from 'react';

export default function useHotkeys(callback) {
  useEffect(() => {
    const handle = (e) => callback(e);
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [callback]);
}
