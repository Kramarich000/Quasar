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
      console.log('Favicon hook received update:', { id, favicon });
      
      if (!favicon) {
        console.log('No favicon provided, using default');
        return;
      }
      
      setFavicons((prev) => {
        if (prev[id] === favicon) {
          console.log('Favicon unchanged for tab:', id);
          return prev;
        }
        
        console.log('Updating favicon for tab:', id, 'from:', prev[id], 'to:', favicon);
        return {
          ...prev,
          [id]: favicon,
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
