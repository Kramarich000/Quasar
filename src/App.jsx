import { useState, useRef, useEffect } from 'react';
import TabBar from './components/TabBar';
import './App.css';
import ToolBar from './components/ToolBar';
import Tab from './components/Tab';

export default function App() {
  const webviewRef = useRef(null);

  const [tabs, setTabs] = useState([{ id: 1, url: 'https://google.com' }]);
  const [activeTab, setActiveTab] = useState(1);

  const addTab = () => {
    const id = Date.now();
    setTabs((t) => [...t, { id, url: 'https://google.com' }]);
    setActiveTab(id);
  };

  const closeTab = (idToClose) => {
    setTabs((prevTabs) => {
      const filtered = prevTabs.filter((tab) => tab.id !== idToClose);

      if (filtered.length === 0) {
        const newTab = { id: Date.now(), url: 'https://google.com' };
        setActiveTab(newTab.id);
        return [newTab];
      }

      if (activeTab === idToClose) {
        const idx = prevTabs.findIndex((tab) => tab.id === idToClose);
        const nextTab = prevTabs[idx - 1] || prevTabs[idx + 1] || filtered[0];
        setActiveTab(nextTab.id);
      }

      return filtered;
    });
  };

  useEffect(() => {
    const current = tabs.find((tab) => tab.id === activeTab);
    if (current && webviewRef.current) {
      webviewRef.current.src = current.url;
    }
  }, [activeTab, tabs]);

  return (
    <div className="flex flex-col h-full">
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onAddTab={addTab}
        onCloseTab={closeTab}
        onSelectTab={setActiveTab}
      />
      <ToolBar webviewRef={webviewRef} />
      <div className="flex-1 relative">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            url={tab.url}
            visible={tab.id === activeTab}
            webviewRef={tab.id === activeTab ? webviewRef : null}
          />
        ))}
      </div>
    </div>
  );
}
