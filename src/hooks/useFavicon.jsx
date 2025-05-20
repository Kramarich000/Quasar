import { useState, useEffect } from 'react';
import defaultFavicon from '../assets/default-favicon.svg';

export function useFavicon(tabs, activeTab) {
  const [favicons, setFavicons] = useState({});

  useEffect(() => {
    const activeTabData = tabs.find((tab) => tab.id === activeTab);
    if (!activeTabData || !activeTabData.webviewRef?.current) return;

    const webview = activeTabData.webviewRef.current;

    const getFavicon = (tabId) => {
      webview
        .executeJavaScript(
          `
        (() => {
          const iconLink = document.querySelector('link[rel="icon"]');
          const shortcutIconLink = document.querySelector('link[rel="shortcut icon"]');
          return iconLink ? iconLink.href : (shortcutIconLink ? shortcutIconLink.href : null);
        })()
      `,
        )
        .then((iconUrl) => {
          setFavicons((prev) => ({
            ...prev,
            [tabId]: iconUrl || defaultFavicon,
          }));
        })
        .catch(() => {
          setFavicons((prev) => ({
            ...prev,
            [tabId]: defaultFavicon,
          }));
        });
    };

    const handleDomReady = () => {
      getFavicon(activeTab);
    };

    webview.addEventListener('dom-ready', handleDomReady);

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
    };
  }, [tabs, activeTab]);

  return favicons;
}
