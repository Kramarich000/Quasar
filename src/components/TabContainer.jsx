import { motion, useMotionValue, AnimatePresence } from 'framer-motion';
import { IoClose } from 'react-icons/io5';
import useHotkeys from '../hooks/useHotKeys';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

export function TabContainer({
  tab,
  activeTab,
  loadingTabs,
  favicons,
  defaultFavicon,
  onSelectTab,
  onCloseTab,
  onTabReorder,
  index,
}) {
  const [isFaviconLoading, setIsFaviconLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragDirection, setDragDirection] = useState(null);
  const faviconUrl = favicons[tab.id] || defaultFavicon;
  const imgRef = useRef(null);
  const loadingTimeoutRef = useRef(null);
  const prevUrlRef = useRef(tab.url);
  const dragRef = useRef(null);

  const isInternalUrl = useCallback((url) => {
    if (!url) return true;
    if (url === 'about:blank') return true;
    if (url.startsWith('file://')) return true;
    return false;
  }, []);

  useEffect(() => {
    const newUrl = tab.url;

    if (isInternalUrl(newUrl) && favicons[tab.id]) {
      delete favicons[tab.id];
    }
  }, [tab.url, isInternalUrl, favicons, tab.id]);

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
  }, [tab.url, isInternalUrl]);

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

  const handleFaviconLoad = useCallback(() => {
    console.log('Favicon loaded in img element:', {
      tabId: tab.id,
      faviconUrl,
    });
    setIsFaviconLoading(false);
  }, [tab.id, faviconUrl]);

  const handleFaviconError = useCallback(
    (e) => {
      console.log('Favicon error in img element:', {
        tabId: tab.id,
        faviconUrl,
      });
      if (e.target.src !== defaultFavicon) {
        e.target.src = defaultFavicon;
      } else {
        setIsFaviconLoading(false);
      }
    },
    [tab.id, faviconUrl, defaultFavicon],
  );

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

  const isValidUrl = useCallback((string) => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, []);

  const getDisplayTitle = useMemo(() => {
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
  }, [tab.title, tab.url, isValidUrl]);

  const handleTabClick = useCallback(
    (event) => {
      if (event.button === 0 && !event.target.closest('button')) {
        onSelectTab(tab.id);
      }
    },
    [onSelectTab, tab.id],
  );

  const handleTabMouseDown = useCallback(
    (event) => {
      if (event.button === 1) {
        event.preventDefault();
        onCloseTab(tab.id);
      }
    },
    [onCloseTab, tab.id],
  );

  const handleCloseClick = useCallback(
    (e) => {
      e.stopPropagation();
      onCloseTab(tab.id);
    },
    [onCloseTab, tab.id],
  );

  const handleDragStart = useCallback(
    (e) => {
      setIsDragging(true);
      e.dataTransfer.setData('text/plain', tab.id);
      e.dataTransfer.effectAllowed = 'move';

      const emptyImage = new Image();
      e.dataTransfer.setDragImage(emptyImage, 0, 0);
    },
    [tab.id],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX;
    const centerX = rect.left + rect.width / 2;
    setDragDirection(mouseX < centerX ? 'left' : 'right');
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      setDragDirection(null);

      const draggedTabId = e.dataTransfer.getData('text/plain');
      if (draggedTabId && draggedTabId !== tab.id) {
        onTabReorder(draggedTabId, tab.id);
      }
    },
    [tab.id, onTabReorder],
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, maxWidth: '0px' }}
      animate={{
        opacity: 1,
        maxWidth: '300px',
        scale: isDragging ? 0.95 : 1,
        x: 0,
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
        willChange: 'opacity, max-width, transform',
        position: 'relative',
      }}
      key={tab.id}
      ref={dragRef}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleTabClick}
      onMouseDown={handleTabMouseDown}
      className={`relative 
                 flex-shrink min-w-0 shadow-inner z-101 duration-150 ease-in-out flex-grow h-full !transition-colors basis-0 flex max-w-[300px] items-center px-2 mx-0.5 rounded-[30px]
                 overflow-hidden whitespace-nowrap
                 ${
                   tab.id === activeTab
                     ? 'bg-gray-900 text-white !shadow-[inset_0px_0px_20px_0px_#0e7490]'
                     : 'bg-gray-900 text-gray-300 hover:bg-gray-700 '
                 }
                 ${isDragging ? 'opacity-50' : ''}
                 ${isDragOver ? 'scale-105' : ''}
               `}
    >
      {/* {isDragOver && (
        <div
          className={`absolute top-0 bottom-0 w-1 bg-[#0e7490] transition-all duration-200 ${
            dragDirection === 'left' ? 'left-0' : 'right-0'
          }`}
          style={{
            boxShadow: '0 0 10px #0e7490',
          }}
        />
      )} */}

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
        {getDisplayTitle}
      </span>

      <button
        style={{ WebkitAppRegion: 'no-drag' }}
        onClick={handleCloseClick}
        title="Закрыть вкладку"
        className="!m-0 !ml-auto !p-0 !w-[20px] !h-[20px] flex items-center justify-center !right-4 !bg-transparent !outline-0 !border-0 hover:!bg-gray-500 !rounded-full !transition-all hover:rotate-180 duration-300"
      >
        <IoClose size={20} />
      </button>
    </motion.div>
  );
}
