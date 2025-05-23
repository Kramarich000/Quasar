import { motion, useMotionValue, AnimatePresence } from 'framer-motion';
import { IoClose } from 'react-icons/io5';
import useHotkeys from '../hooks/useHotKeys';
import { useState, useEffect, useRef } from 'react';

export function TabContainer({
  tab,
  activeTab,
  loadingTabs,
  favicons,
  defaultFavicon,
  onSelectTab,
  onCloseTab,
}) {
  const [isFaviconLoading, setIsFaviconLoading] = useState(true);
  const faviconUrl = favicons[tab.id] || defaultFavicon;
  const imgRef = useRef(null);
  const loadingTimeoutRef = useRef(null);
  const prevUrlRef = useRef(tab.url);

  const isInternalUrl = (url) => {
    if (!url) return true;
    if (url === 'about:blank') return true;
    if (url.startsWith('file://')) return true;
    return false;
  };

  useEffect(() => {
    const newUrl = tab.url;

    if (isInternalUrl(newUrl) && favicons[tab.id]) {
      delete favicons[tab.id];
    }
  }, [tab.url]);

  useEffect(() => {
    const prevUrl = prevUrlRef.current;
    const newUrl = tab.url;

    if (prevUrl !== newUrl) {
      console.log('URL changed:', { oldUrl: prevUrl, newUrl });

      if (isInternalUrl(newUrl)) {
        setIsFaviconLoading(false);
      } else {
        setIsFaviconLoading(true);
      }

      prevUrlRef.current = newUrl;
    }
  }, [tab.url]);

  useEffect(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    if (faviconUrl === defaultFavicon || faviconUrl.startsWith('data:')) {
      setIsFaviconLoading(false);
      return;
    }

    const img = new Image();

    img.onload = () => {
      loadingTimeoutRef.current = setTimeout(() => {
        if (imgRef.current && imgRef.current.src === faviconUrl) {
          setIsFaviconLoading(false);
        }
      }, 100);
    };

    img.onerror = () => {
      if (imgRef.current && imgRef.current.src === faviconUrl) {
        setIsFaviconLoading(false);
      }
    };

    img.src = faviconUrl;

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [faviconUrl, defaultFavicon]);

  const handleFaviconLoad = () => {
    console.log('Favicon loaded in img element:', {
      tabId: tab.id,
      faviconUrl,
    });
    setIsFaviconLoading(false);
  };

  const handleFaviconError = (e) => {
    console.log('Favicon error in img element:', { tabId: tab.id, faviconUrl });
    if (e.target.src !== defaultFavicon) {
      e.target.src = defaultFavicon;
    } else {
      setIsFaviconLoading(false);
    }
  };

  console.log('Rendering tab:', {
    tabId: tab.id,
    faviconUrl,
    isFaviconLoading,
  });

  useHotkeys((e) => {
    if (e.ctrlKey && e.code === 'KeyW') {
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

  function getDisplayTitle() {
    if (tab.title && tab.title !== tab.url) {
      return tab.title;
    }
    if (isValidUrl(tab.url)) {
      try {
        return new URL(tab.url).hostname;
      } catch {
        return tab.url;
      }
    }
    return tab.url || 'Новая вкладка';
  }
  return (
    <motion.div
      layout={false}
      initial={{ opacity: 0, maxWidth: '0px' }}
      animate={{
        opacity: 1,
        maxWidth: '300px',
        transition: {
          duration: 0.2,
          ease: 'easeOut',
        },
      }}
      exit={{
        opacity: 0,
        maxWidth: '0px',
        transition: {
          duration: 0.15,
          ease: 'easeIn',
        },
      }}
      style={{
        overflow: 'hidden',
        willChange: 'opacity, max-width',
      }}
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
      className={`relative 
                 flex-shrink min-w-0 shadow-inner z-101 duration-150 ease-in-out flex-grow h-full !transition-colors basis-0 flex max-w-[300px] items-center px-2 mx-0.5 rounded-[30px]
                 overflow-hidden whitespace-nowrap
                 ${
                   tab.id === activeTab
                     ? 'bg-gray-900 text-white !shadow-[inset_0px_0px_20px_0px_#0e7490]'
                     : 'bg-gray-900 text-gray-300 hover:bg-gray-700 '
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

      {isFaviconLoading ? (
        <div className="flex items-center justify-center z-11">
          <div className="animate-spin rounded-full !h-5 !w-5 border-t-2 border-[#0e7490] bg-transparent"></div>
        </div>
      ) : (
        <img
          ref={imgRef}
          key={`${tab.id}-${faviconUrl}`}
          className="!w-5 !h-5 object-contain !pointer-events-none !select-none"
          style={{ WebkitAppRegion: 'no-drag' }}
          onLoad={handleFaviconLoad}
          onError={handleFaviconError}
          src={faviconUrl}
          alt=""
        />
      )}

      <span
        style={{ WebkitAppRegion: 'no-drag' }}
        className="truncate w-full h-full flex items-center text-left pointer-events-none pl-2 !select-none"
        title={tab.url || 'Новая вкладка'}
      >
        {getDisplayTitle()}
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
        <IoClose size={20} />
      </button>
    </motion.div>
  );
}
