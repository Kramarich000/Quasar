import { useState, useEffect } from 'react';
import { IoClose, IoMoon, IoSunny } from 'react-icons/io5';
import { IoAdd } from 'react-icons/io5';
import TitleBar from './TitleBar';
export default function TabBar({
  tabs,
  activeTab,
  onAddTab,
  onCloseTab,
  onSelectTab,
}) {
  function isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  const [theme, setTheme] = useState('light');
  const MAX_TABS = 25;

  useEffect(() => {
    const root = document.getElementById('root');
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  return (
    <>
      <div
        className="flex items-center h-10 bg-gray-800 shadow overflow-x-auto overflow-y-hidden no-scrollbar"
        style={{ WebkitAppRegion: 'drag' }}
      >
        {tabs.map((tab) => (
          <div
            style={{ WebkitAppRegion: 'no-drag' }}
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`relative !transition-all 
            flex-shrink flex-grow basis-0 p-2 flex max-w-[300px] items-center px-2 mx-0.5 rounded-t-md
            overflow-hidden whitespace-nowrap
            ${
              tab.id === activeTab
                ? 'bg-gray-900 '
                : 'bg-gray-800 hover:bg-gray-700'
            }
          `}
          >
            <span
              style={{ WebkitAppRegion: 'no-drag' }}
              className="truncate pointer-events-none"
            >
              {tab.title && tab.title !== tab.url
                ? tab.title
                : isValidUrl(tab.url)
                ? new URL(tab.url).hostname
                : tab.url}
            </span>

            <button
              style={{ WebkitAppRegion: 'no-drag' }}
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              className="!m-0 !ml-auto !p-0 !w-[20px] !h-[20px] flex items-center justify-center !right-4 !bg-transparent !outline-0 !border-0 hover:!bg-gray-500 !rounded-full !transition-all hover"
            >
              <IoClose />
            </button>
          </div>
        ))}
        <button
          style={{ WebkitAppRegion: 'no-drag' }}
          onClick={onAddTab}
          className={`!mr-auto !p-0 flex items-center justify-center !w-[20px] !h-[20px] !bg-transparent !outline-none !border-none !transition-all hover:!bg-gray-500 !rounded-full  ${
            tabs.length >= MAX_TABS
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-gray-500'
          }`}
        >
          <IoAdd />
        </button>
        <div className="flex ml-10" style={{ WebkitAppRegion: 'no-drag' }}>
          {/* <button
            className="right-[7.5px] flex items-center justify-center !bg-transparent !outline-none !border-none !transition-all hover:!bg-gray-500 !rounded-none "
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          >
            {theme === 'light' ? <IoMoon /> : <IoSunny />}
          </button> */}
          <div style={{ WebkitAppRegion: 'no-drag' }}>
            <TitleBar />
          </div>
        </div>
      </div>
    </>
  );
}
