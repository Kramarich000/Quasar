import { useState, useEffect } from 'react';
import defaultFavicon from '../assets/default-favicon.svg';

// Кэш для favicon
const faviconCache = new Map();

export function useFavicon(tabs, activeTab) {
  const [favicons, setFavicons] = useState({});

  useEffect(() => {
    const activeTabData = tabs.find((tab) => tab.id === activeTab);
    if (!activeTabData) return;

    const getFavicon = async (tabId) => {
      try {
        const result = await window.api.getFavicon(tabId);
        if (result && result.favicon) {
          setFavicons((prev) => ({
            ...prev,
            [tabId]: result.favicon,
          }));
        } else {
          setFavicons((prev) => ({
            ...prev,
            [tabId]: defaultFavicon,
          }));
        }
      } catch (error) {
        console.error('Error getting favicon:', error);
        setFavicons((prev) => ({
          ...prev,
          [tabId]: defaultFavicon,
        }));
      }
    };

    getFavicon(activeTab);
  }, [tabs, activeTab]);

  return favicons;
}
