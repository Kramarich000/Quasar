// App.jsx
import { useState } from 'react';
import Tab from './components/Tab';
import TabBar from './components/TabBar';
import './App.css';

export default function App() {
  const [tabs, setTabs] = useState([{ id: 1, url: 'https://google.com' }]);
  const [activeTab, setActiveTab] = useState(1);

  const addTab = () => {
    const id = Date.now();
    setTabs([...tabs, { id, url: 'https://google.com' }]);
    setActiveTab(id);
  };

  const closeTab = (idToClose) => {
    const newTabs = tabs.filter((t) => t.id !== idToClose);
    setTabs(newTabs);
    if (activeTab === idToClose && newTabs.length > 0) {
      setActiveTab(newTabs[newTabs.length - 1].id);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <TabBar
        className="w-full sticky top-0 z-10"
        tabs={tabs}
        activeTab={activeTab}
        onAddTab={addTab}
        onCloseTab={closeTab}
        onSelectTab={setActiveTab}
      />
      <div className="flex-1 relative">
        {tabs.map((tab) => (
          <Tab key={tab.id} url={tab.url} visible={tab.id === activeTab} />
        ))}
      </div>
    </div>
  );
}
