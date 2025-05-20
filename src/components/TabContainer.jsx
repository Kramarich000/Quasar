import { motion, useMotionValue, AnimatePresence } from 'framer-motion';
import { IoClose } from 'react-icons/io5';
import useHotkeys from '../hooks/useHotKeys';
export function TabContainer({
  tab,
  activeTab,
  loadingTabs,
  favicons,
  defaultFavicon,
  onSelectTab,
  onCloseTab,
}) {
  const y = useMotionValue(0);

  useHotkeys((e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      onCloseTab(activeTab);
    }
  });

  function isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
  return (
    <motion.div
      layout={false}
      initial={{ opacity: 1, maxWidth: '0px' }}
      animate={{ opacity: 1, maxWidth: '300px' }}
      exit={{ opacity: 1, maxWidth: '0px' }}
      transition={{ duration: 0.25, ease: 'linear' }}
      style={{ overflow: 'hidden' }}
      key={tab.id}
      onClick={(event) => {
        if (event.button === 0 && !event.target.closest('button')) {
          onSelectTab(tab.id);
        }
      }}
      onMouseDown={(event) => {
        if (event.button === 1) {
          event.preventDefault();
          onCloseTab(tab.id);
        }
      }}
      onKeyDown={(event) => {
        if (event.ctrlKey && event.key === 'w') {
          event.preventDefault();
          onCloseTab(tab.id);
        }
      }}
      className={`relative 
                 flex-shrink flex-grow h-full !transition-colors basis-0 p-2 flex max-w-[300px] items-center px-2 mx-0.5 rounded-t-md
                 overflow-hidden whitespace-nowrap
                 ${
                   tab.id === activeTab
                     ? 'bg-gray-900 '
                     : 'bg-gray-800 hover:bg-gray-700'
                 }
               `}
    >
      {/* <div
        style={{
          position: 'absolute',
          inset: 0,
          WebkitAppRegion: 'drag',
          zIndex: 100,
        }}
        onMouseDown={(e) => {
          if (e.button === 0) {
            window.api.detachAndDragTab({ url: tab.url, id: tab.id });
          }
        }}
      /> */}

      {loadingTabs[tab.id] ? (
        <div className="flex items-center justify-center z-11">
          <div className="animate-spin rounded-full !h-5 !w-5 border-t-2 border-[#0e7490] bg-transparent"></div>
        </div>
      ) : (
        <img
          className="!w-5 !h-5 object-contain !pointer-events-none !select-none"
          style={{ WebkitAppRegion: 'no-drag' }}
          src={favicons[tab.id] || defaultFavicon}
          alt=""
          onError={(e) => {
            e.target.src = defaultFavicon;
          }}
        />
      )}

      <span
        style={{ WebkitAppRegion: 'no-drag' }}
        className="truncate w-full h-full flex items-baseline text-left pointer-events-none pl-2 !select-none"
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
  );
}
