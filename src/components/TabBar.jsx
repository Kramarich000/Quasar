import { useState, useEffect } from 'react';
import { IoClose, IoMoon, IoSunny, IoLockClosed } from 'react-icons/io5';
import { HiLockClosed } from 'react-icons/hi';
import { IoWarning } from 'react-icons/io5';
import { IoAdd } from 'react-icons/io5';
import TitleBar from './TitleBar';
import { BsIncognito } from 'react-icons/bs';
import { motion } from 'framer-motion';
import { Tooltip as ReactTooltip } from 'react-tooltip';

export default function TabBar({
  tabs,
  activeTab,
  isSecure,
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

  const [theme, setTheme] = useState(() => {
    return window.api.isIncognito ? 'dark' : 'light';
  });
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
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            initial={{ opacity: 0, maxWidth: 0 }}
            animate={{ opacity: 1, maxWidth: 300 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25, ease: 'linear' }}
            style={{ WebkitAppRegion: 'no-drag' }}
            key={tab.id}
            onDragEnd={(t, info) => {
              if (
                info.point.y < 10 ||
                info.point.y > window.innerHeight - 800
              ) {
                window.api.detachTab({
                  url: tab.url,
                  incognito: window.api.isIncognito ? true : false,
                  id: tab.id,
                });

                onCloseTab(tab.id);
              }
            }}
            onMouseDown={(event) => {
              if (event.button === 1) {
                event.preventDefault();
                onCloseTab(tab.id);
              } else if (event.button === 0) {
                onSelectTab(tab.id);
              }
            }}
            className={`relative 
              flex-shrink flex-grow !transition-colors basis-0 p-2 flex max-w-[300px] items-center px-2 mx-0.5 rounded-t-md
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
              title="Закрыть вкладку"
              className="!m-0 !ml-auto !p-0 !w-[20px] !h-[20px] flex items-center justify-center !right-4 !bg-transparent !outline-0 !border-0 hover:!bg-gray-500 !rounded-full !transition-all hover"
            >
              <IoClose />
            </button>
          </motion.div>
        ))}
        <button
          style={{ WebkitAppRegion: 'no-drag' }}
          onClick={() => onAddTab(false)}
          title="Открыть новую вкладку"
          className={`!mr-auto !p-0 flex items-center justify-center !w-[20px] !h-[20px] !bg-transparent !outline-none !border-none !transition-all hover:!bg-gray-500 !rounded-full  ${
            tabs.length >= MAX_TABS
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-gray-500'
          }`}
        >
          <IoAdd />
        </button>
        <button
          style={{ WebkitAppRegion: 'no-drag' }}
          onClick={() => window.api.createIncognitoWindow()}
          className={`!ml-8 !mt-1 !p-0 flex items-center justify-center !bg-transparent !outline-none !border-none !transition-all hover:!bg-gray-500 !rounded-full`}
          title="Новая вкладка в режиме инкогнито"
        >
          <BsIncognito size={25} />
        </button>

        <span
          style={{
            WebkitAppRegion: 'no-drag',
            pointerEvents: 'auto',
          }}
          title={
            isSecure
              ? 'Ваше соединение защищено'
              : 'Внимание! ваше соединение не защищено'
          }
          className="ml-4 mt-1"
        >
          {isSecure ? (
            <HiLockClosed color="green" size={25} />
          ) : (
            <IoWarning color="red" size={25} />
          )}
        </span>

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
