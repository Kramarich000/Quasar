import { motion, useMotionValue, AnimatePresence } from 'framer-motion';
import { IoClose } from 'react-icons/io5';

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
  function isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
  return (
    <AnimatePresence>
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 10 }}
        dragElastic={0}
        dragMomentum={0}
        layout={false}
        initial={{ opacity: 0, maxWidth: '0px' }}
        animate={{ opacity: 1, maxWidth: '300px' }}
        exit={{ opacity: 0, maxWidth: '0px' }}
        dragSnapToOrigin={true}
        // viewport={{ once: true }}
        transition={{ duration: 0.25, ease: 'linear' }}
        style={{ y, WebkitAppRegion: 'no-drag' }}
        key={tab.id}
        onDragEnd={(_, info) => {
          if (info.offset.y >= 10) {
            window.api.detachTab({
              url: tab.url,
              incognito: window.api.isIncognito,
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
        {loadingTabs[tab.id] ? (
          <div className="flex items-center justify-center z-11">
            <div className="animate-spin rounded-full !h-5 !w-5 border-t-2 border-[#0e7490] bg-transparent"></div>
          </div>
        ) : (
          <img
            className="!w-5 !h-5 object-contain"
            src={favicons[tab.id] || defaultFavicon}
            alt=""
            onError={(e) => {
              e.target.src = defaultFavicon;
            }}
          />
        )}

        <span
          style={{ WebkitAppRegion: 'no-drag' }}
          className="truncate pointer-events-none ml-2"
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
    </AnimatePresence>
  );
}
