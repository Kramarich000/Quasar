import { useState, useEffect, createRef } from 'react';
import TabBar from './components/TabBar';
import ToolBar from './components/ToolBar';
import Tab from './components/Tab';
import { useFavicon } from './hooks/useFavicon';
import './App.css';

export default function App() {
  const MAX_TABS = 25;

  // tabs: { id, url, title, webviewRef }

  const [tabs, setTabs] = useState([
    {
      id: 1,
      url: '',
      title: 'Новая вкладка',
      webviewRef: createRef(),
    },
  ]);
  const [activeTab, setActiveTab] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [isSecure, setIsSecure] = useState(false);
  const favicons = useFavicon(tabs, activeTab);
  useEffect(() => {
    const currentUrl = tabs.find((tab) => tab.id === activeTab)?.url;

    if (!currentUrl) {
      setIsSecure(true);
      return;
    }

    setIsSecure(currentUrl.startsWith('https://'));
  }, [activeTab, tabs]);

  useEffect(() => {
    const initTabUrlHandler = (url) => {
      if (url) {
        const id = Date.now();
        setTabs([{ id, url, title: url, webviewRef: createRef() }]);
        setActiveTab(id);
      }
    };

    window.api.on('init-tab-url', initTabUrlHandler);

    return () => {
      window.api.removeAllListeners('init-tab-url');
    };
  }, []);

  useEffect(() => {
    const activeTabData = tabs.find((tab) => tab.id === activeTab);
    if (!activeTabData) return;

    const webview = activeTabData.webviewRef.current;
    if (!webview) return;

    const handleNavigation = () => {
      const newUrl = webview.getURL();
      setTabs((prevTabs) =>
        prevTabs.map((tab) =>
          tab.id === activeTab ? { ...tab, url: newUrl } : tab,
        ),
      );
      setIsSecure(webview.getURL().startsWith('https://'));
    };

    const handleTitleUpdated = () => {
      const title = webview.getTitle();
      setTabs((prevTabs) =>
        prevTabs.map((tab) => (tab.id === activeTab ? { ...tab, title } : tab)),
      );
    };

    const handleNewWindow = () => {
      window.api.send('open-external-url', url);
    };

    const handleDidStartLoading = () => setIsLoading(true);
    const handleDidStopLoading = () => setIsLoading(false);

    const handleWillNavigate = (event) => {
      const chromeUA =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
      webview.setUserAgent(chromeUA);
      const headers = {
        'User-Agent': chromeUA,
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Upgrade-Insecure-Requests': '1',
      };

      event.preventDefault();

      webview.loadURL(event.url, {
        extraHeaders: Object.entries(headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n'),
      });
    };

    webview.addEventListener('did-navigate', handleNavigation);
    webview.addEventListener('did-navigate-in-page', handleNavigation);
    webview.addEventListener('page-title-updated', handleTitleUpdated);
    webview.addEventListener('did-start-loading', handleDidStartLoading);
    webview.addEventListener('did-stop-loading', handleDidStopLoading);
    webview.addEventListener('new-window', handleNewWindow);
    webview.addEventListener('will-navigate', handleWillNavigate);

    return () => {
      webview.removeEventListener('did-navigate', handleNavigation);
      webview.removeEventListener('did-navigate-in-page', handleNavigation);
      webview.removeEventListener('page-title-updated', handleTitleUpdated);
      webview.removeEventListener('did-start-loading', handleDidStartLoading);
      webview.removeEventListener('did-stop-loading', handleDidStopLoading);
      webview.removeEventListener('new-window', handleNewWindow);
      webview.removeEventListener('will-navigate', handleWillNavigate);
    };
  }, [activeTab, tabs]);

  const addTab = () => {
    if (tabs.length >= MAX_TABS) return;
    const id = Date.now();
    setTabs((t) => [
      ...t,
      {
        id,
        url: '',
        title: 'Новая вкладка',
        webviewRef: createRef(),
      },
    ]);
    setActiveTab(id);
  };

  const changeUrl = (id, newUrl) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === id
          ? {
              ...tab,
              url: newUrl,
              title: newUrl === 'welcome' ? 'Добро пожаловать' : newUrl,
            }
          : tab,
      ),
    );
  };

  const closeTab = (idToClose) => {
    setTabs((prevTabs) => {
      if (prevTabs.length === 1) return prevTabs;

      const filtered = prevTabs.filter((tab) => tab.id !== idToClose);

      if (activeTab === idToClose) {
        const idx = prevTabs.findIndex((tab) => tab.id === idToClose);
        const newActiveTab =
          prevTabs[idx - 1] || prevTabs[idx + 1] || filtered[0];
        setActiveTab(newActiveTab.id);
      }

      return filtered;
    });
  };

  // useEffect(() => {
  //   const activeTabData = tabs.find((tab) => tab.id === activeTab);
  //   if (!activeTabData) return;

  //   const webview = activeTabData.webviewRef.current;
  //   if (!webview) return;

  //   if (!isLoading && webview.src !== activeTabData.url) {
  //     webview.src = activeTabData.url;
  //   }
  // }, [activeTab, tabs, isLoading]);

  return (
    <div className="flex flex-col h-full">
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onAddTab={addTab}
        onCloseTab={closeTab}
        favicons={favicons}
        isSecure={isSecure}
        onSelectTab={setActiveTab}
      />

      <ToolBar
        // key={activeTab.id}
        webviewRef={tabs.find((tab) => tab.id === activeTab)?.webviewRef}
        url={tabs.find((tab) => tab.id === activeTab)?.url}
        onChangeUrl={(newUrl) => changeUrl(activeTab, newUrl)}
      />

      <div className="flex-1 flex relative">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            url={tab.url}
            isActive={tab.id === activeTab}
            webviewRef={tab.webviewRef}
            onChangeUrl={(newUrl) => changeUrl(activeTab, newUrl)}
          />
        ))}
      </div>
    </div>
  );
}
