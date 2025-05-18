import { useState, useRef, useEffect } from 'react';
import TabBar from './components/TabBar';
import ToolBar from './components/ToolBar';
import Tab from './components/Tab';
import './App.css';

export default function App() {
  const webviewRef = useRef(null);
  const MAX_TABS = 25;

  const [tabs, setTabs] = useState([
    { id: 1, url: 'welcome', title: 'Добро пожаловать' },
  ]);
  const [activeTab, setActiveTab] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleNavigation = () => {
      const newUrl = webview.getURL();
      setTabs((prevTabs) =>
        prevTabs.map((tab) =>
          tab.id === activeTab ? { ...tab, url: newUrl } : tab,
        ),
      );
    };

    const handleTitleUpdated = () => {
      const title = webview.getTitle();
      setTabs((prevTabs) =>
        prevTabs.map((tab) => (tab.id === activeTab ? { ...tab, title } : tab)),
      );
    };

    const handleDidStartLoading = () => {
      setIsLoading(true);
    };

    const handleDidStopLoading = () => {
      setIsLoading(false);
    };

    webview.addEventListener('did-navigate', handleNavigation);
    webview.addEventListener('did-navigate-in-page', handleNavigation);
    webview.addEventListener('page-title-updated', handleTitleUpdated);
    webview.addEventListener('did-start-loading', handleDidStartLoading);
    webview.addEventListener('did-stop-loading', () => {
      const url = webview.getURL();
      const title = webview.getTitle();
      window.api.send('history-add', { url, title, timestamp: Date.now() });
    });

    return () => {
      webview.removeEventListener('did-navigate', handleNavigation);
      webview.removeEventListener('did-navigate-in-page', handleNavigation);
      webview.removeEventListener('page-title-updated', handleTitleUpdated);
      webview.removeEventListener('did-start-loading', handleDidStartLoading);
      webview.removeEventListener('did-stop-loading', handleDidStopLoading);
    };
  }, [activeTab]);

  const addTab = () => {
    if (tabs.length >= MAX_TABS) {
      return;
    }
    const id = Date.now();
    setTabs((t) => [...t, { id, url: 'https://google.com' }]);
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
      const filtered = prevTabs.filter((tab) => tab.id !== idToClose);

      if (filtered.length === 0) {
        const welcomeTab = {
          id: Date.now(),
          url: 'welcome',
          title: 'Добро пожаловать',
        };
        setActiveTab(welcomeTab.id);
        return [welcomeTab];
      }

      if (activeTab === idToClose) {
        const idx = prevTabs.findIndex((tab) => tab.id === idToClose);
        const newActiveTab =
          prevTabs[idx - 1] || prevTabs[idx + 1] || filtered[0];
        setActiveTab(newActiveTab.id);
      }

      return filtered;
    });
  };

  useEffect(() => {
    const current = tabs.find((tab) => tab.id === activeTab);
    const webview = webviewRef.current;
    if (current && webview) {
      if (!isLoading && webview.src !== current.url) {
        webview.src = current.url;
      }
    }
  }, [activeTab, tabs, isLoading]);

  // useEffect(() => {
  //   console.log('window.api:', window.api);
  // }, []);

  return (
    <div className="flex flex-col h-full">
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onAddTab={addTab}
        onCloseTab={closeTab}
        onSelectTab={setActiveTab}
      />
      <ToolBar
        webviewRef={webviewRef}
        url={tabs.find((tab) => tab.id === activeTab)?.url}
        onChangeUrl={(newUrl) => changeUrl(activeTab, newUrl)}
      />
      <div className="flex-1 flex relative">
        <Tab
          url={tabs.find((tab) => tab.id === activeTab)?.url}
          webviewRef={webviewRef}
        />
      </div>
    </div>
  );
}
