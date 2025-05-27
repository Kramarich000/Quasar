import { useState, useEffect, createRef } from 'react';
import TabBar from './components/TabBar';
import ToolBar from './components/ToolBar';
// import Tab from './components/Tab';
import { useFavicon } from './hooks/useFavicon';
import './App.css';
import './styles/global.css';

export default function App() {
  const MAX_TABS = 15;

  const generateId = () => {
    if (crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    } else {
      return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    }
  };

  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSecure, setIsSecure] = useState(true);
  const favicons = useFavicon(tabs);
  const [isIncognito, setIsIncognito] = useState(false);

  useEffect(() => {
    const header = document.querySelector('.header-bar');
    if (header) {
      const height = header.offsetHeight;
      window.api.setHeaderHeight(height);
    }
  }, []);

  useEffect(() => {
    const firstId = generateId();
    const createFirstTab = async () => {
      try {
        const result = await window.api.bvCreateTab({ id: firstId, url: '' });
        if (result.success) {
          setTabs([{ id: firstId, url: '', title: 'Новая вкладка' }]);
          setActiveTab(firstId);
        } else {
          console.error('Failed to create first tab:', result.error);
        }
      } catch (error) {
        console.error('Error creating first tab:', error);
      }
    };
    createFirstTab();
  }, []);

  useEffect(() => {
    const onSwitched = (newId) => {
      setActiveTab(newId);
    };
    const onTitleUpdated = ({ id, title }) => {
      setTabs((t) => t.map((tab) => (tab.id === id ? { ...tab, title } : tab)));
    };

    const onUrlUpdated = ({ id, url }) => {
      setTabs((t) => t.map((tab) => (tab.id === id ? { ...tab, url } : tab)));
    };
    const onLoadStart = () => setIsLoading(true);
    const onLoadStop = () => setIsLoading(false);

    window.api.on('tabSwitched', onSwitched);
    window.api.on('tabTitleUpdated', onTitleUpdated);
    window.api.on('tabUrlUpdated', onUrlUpdated);
    window.api.on('bvDidStartLoading', onLoadStart);
    window.api.on('bvDidStopLoading', onLoadStop);

    return () => {
      window.api.off('tabSwitched', onSwitched);
      window.api.off('tabTitleUpdated', onTitleUpdated);
      window.api.off('tabUrlUpdated', onUrlUpdated);
      window.api.off('bvDidStartLoading', onLoadStart);
      window.api.off('bvDidStopLoading', onLoadStop);
    };
  }, []);

  const URL_STATUS = {
    SECURE: 'secure',
    INSECURE: 'insecure',
    LOCAL: 'local',
  };

  useEffect(() => {
    const currentUrl = tabs.find((t) => t.id === activeTab)?.url || '';
    let status = URL_STATUS.INSECURE;

    try {
      if (!currentUrl || currentUrl === 'about:blank') {
        status = URL_STATUS.LOCAL;
      } else if (
        currentUrl.startsWith('file://') ||
        currentUrl.startsWith('app://') ||
        currentUrl.includes('tab-content.html')
      ) {
        status = URL_STATUS.LOCAL;
      } else {
        const urlObj = new URL(currentUrl);
        if (urlObj.protocol === 'https:') {
          status = URL_STATUS.SECURE;
        } else {
          status = URL_STATUS.INSECURE;
        }
      }
    } catch {
      status = URL_STATUS.INSECURE;
    }

    setIsSecure(status);
  }, [
    tabs,
    activeTab,
    URL_STATUS.INSECURE,
    URL_STATUS.LOCAL,
    URL_STATUS.SECURE,
  ]);

  useEffect(() => {
    setIsIncognito(window.api.isIncognitoFlag);
  }, []);

  const addTab = async () => {
    if (tabs.length >= MAX_TABS) return;

    const id = generateId();
    try {
      const result = await window.api.bvCreateTab({ id, url: '' });
      if (result.success) {
        await window.api.bvCreateTab({ id, url: '' });
        setTabs((prev) => [...prev, { id, url: '', title: 'Новая вкладка' }]);
        await selectTab(id);
      } else {
        console.error('Failed to create tab:', result.error);
      }
    } catch (error) {
      console.error('Error creating tab:', error);
    }
  };

  const selectTab = async (id) => {
    if (id === activeTab) return;

    try {
      await window.api.bvSwitchTab(id);
      setActiveTab(id);
    } catch (error) {
      console.error('Error switching tab:', error);
    }
  };

  const changeUrl = async (id, newUrl) => {
    try {
      setTabs((t) =>
        t.map((tab) => (tab.id === id ? { ...tab, url: newUrl } : tab)),
      );

      if (id === activeTab) {
        await window.api.bvLoadUrl(newUrl);
        
        // Сохраняем в историю
        const tab = tabs.find(t => t.id === id);
        if (tab && newUrl && !newUrl.startsWith('about:') && !newUrl.startsWith('file:')) {
          window.api.historyAdd({
            url: newUrl,
            title: tab.title || newUrl
          });
        }
      }
    } catch (error) {
      console.error('Error changing URL:', error);
    }
  };

  const closeTab = async (id) => {
    if (tabs.length === 1) return;

    try {
      await window.api.bvCloseTab(id);

      setTabs((prev) => prev.filter((tab) => tab.id !== id));

      if (activeTab === id) {
        const remaining = tabs.filter((tab) => tab.id !== id);
        if (remaining.length > 0) {
          await selectTab(remaining[0].id);
        }
      }
    } catch (error) {
      console.error('Error closing tab:', error);
    }
  };

  const reorderTabs = (draggedId, targetId) => {
    setTabs((prevTabs) => {
      const draggedIndex = prevTabs.findIndex((tab) => tab.id === draggedId);
      const targetIndex = prevTabs.findIndex((tab) => tab.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return prevTabs;

      const newTabs = [...prevTabs];
      [newTabs[draggedIndex], newTabs[targetIndex]] = [
        newTabs[targetIndex],
        newTabs[draggedIndex],
      ];

      return newTabs;
    });
  };

  return (
    <div className="flex flex-col !h-full !w-full">
      <div className="header-bar relative">
        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onAddTab={addTab}
          onCloseTab={closeTab}
          onSelectTab={selectTab}
          onTabReorder={reorderTabs}
          favicons={favicons}
          isSecure={isSecure}
        />

        <ToolBar
          key={activeTab}
          isIncognito={isIncognito}
          url={tabs.find((t) => t.id === activeTab)?.url || ''}
          onChangeUrl={(url) => changeUrl(activeTab, url)}
        />
      </div>
    </div>
  );
}
