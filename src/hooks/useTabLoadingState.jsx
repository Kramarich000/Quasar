import { useState, useEffect } from 'react';

export function useTabLoadingState(tabs) {
  const [loadingTabs, setLoadingTabs] = useState({});

  useEffect(() => {
    const listeners = [];

    tabs.forEach((tab) => {
      const webview = tab.webviewRef?.current;
      if (!webview) return;

      const handleStart = () => {
        setLoadingTabs((prev) => ({ ...prev, [tab.id]: true }));
      };

      const handleStop = () => {
        setLoadingTabs((prev) => ({ ...prev, [tab.id]: false }));
      };

      webview.addEventListener('did-start-loading', handleStart);
      webview.addEventListener('did-stop-loading', handleStop);

      listeners.push({ webview, handleStart, handleStop });
    });

    return () => {
      listeners.forEach(({ webview, handleStart, handleStop }) => {
        webview.removeEventListener('did-start-loading', handleStart);
        webview.removeEventListener('did-stop-loading', handleStop);
      });
    };
  }, [tabs.map((tab) => tab.webviewRef?.current).join(',')]); // Точное отслеживание изменения рефов

  return loadingTabs;
}
