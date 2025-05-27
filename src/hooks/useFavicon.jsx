import { useState, useEffect } from 'react';
import defaultFavicon from '../assets/default-favicon.svg';

export function useFavicon(tabs) {
  const [favicons, setFavicons] = useState(() =>
    tabs.reduce((acc, tab) => {
      acc[tab.id] = defaultFavicon;
      return acc;
    }, {}),
  );

  useEffect(() => {
    setFavicons((prev) => {
      const next = {};
      tabs.forEach((tab) => {
        next[tab.id] = prev[tab.id] || defaultFavicon;
      });
      return next;
    });
  }, [tabs]);

  useEffect(() => {
    const handler = ({ id, favicon }) => {
      if (!id) return;
      
      setFavicons((prev) => {
        if (prev[id] === favicon) {
          return prev;
        }
        
        const newFavicon = favicon || defaultFavicon;
        
        return {
          ...prev,
          [id]: newFavicon,
        };
      });
    };

    window.api.on('tabFaviconUpdated', handler);
    return () => {
      window.api.off('tabFaviconUpdated', handler);
    };
  }, []);

  return favicons;
}
