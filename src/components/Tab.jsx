import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaSearch } from 'react-icons/fa';

export default function Tab({ url, webviewRef, isActive, onChangeUrl }) {
  const isIncognito = window.api?.isIncognito;
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const animationFrameId = useRef(null);
  const stopTimeout = useRef(null);
  const [inputValue, setInputValue] = useState(url);

  useEffect(() => {
    setInputValue(url);
  }, [url]);

  function isLikelyURL(text) {
    return /^https?:\/\/|^www\.|\.com|\.ru/.test(text.trim());
  }

  const navigate = () => {
    let u = inputValue.trim();

    if (!u) return;

    if (!isLikelyURL(u)) {
      u = `https://www.google.com/search?q=${encodeURIComponent(u.trim())}`;
    } else if (!/^https?:\/\//.test(u)) {
      u = 'https://' + u.trim();
    }

    onChangeUrl(u);
  };

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const updateProgress = () => {
      if (progressRef.current < 90) {
        progressRef.current += 0.5;
        setProgress(progressRef.current);
        animationFrameId.current = requestAnimationFrame(updateProgress);
      }
    };

    const startLoading = () => {
      setLoading(true);
      progressRef.current = 10;
      setProgress(10);
      clearTimeout(stopTimeout.current);
      animationFrameId.current = requestAnimationFrame(updateProgress);
    };

    const stopLoading = () => {
      cancelAnimationFrame(animationFrameId.current);
      progressRef.current = 100;
      setProgress(100);
      stopTimeout.current = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 500);
    };

    webview.addEventListener('did-start-loading', startLoading);
    webview.addEventListener('did-stop-loading', stopLoading);

    return () => {
      webview.removeEventListener('did-start-loading', startLoading);
      webview.removeEventListener('did-stop-loading', stopLoading);
      cancelAnimationFrame(animationFrameId.current);
      clearTimeout(stopTimeout.current);
    };
  }, [webviewRef]);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        visibility: isActive ? 'visible' : 'hidden',
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: isActive ? 'auto' : 'none',
        zIndex: isActive ? 10 : 0,
      }}
    >
      <AnimatePresence>
        {loading && (
          <motion.div
            key="progress-bar"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            exit={{ opacity: 0 }}
            transition={{ ease: 'linear', duration: 0.2 }}
            className="!absolute !left-0 !h-[5px] !bg-[#0e7490] !z-50"
          />
        )}
      </AnimatePresence>
      <webview
        ref={webviewRef}
        src={url}
        style={{
          width: '100%',
          height: '100%',
          visibility: isActive ? 'visible' : 'hidden',
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: isActive ? 'auto' : 'none',
          zIndex: isActive ? 10 : 0,
        }}
        allowpopups="true"
        webpreferences="
          javascriptEnabled=yes,
          nativeWindowOpen=yes,
          contextIsolation=yes,
          sandbox=allow-scripts allow-same-origin,
          nodeIntegration=no"
      />
      {!url && isActive && (
        <div
          className="p-6 flex flex-col items-center justify-center mx-auto text-center text-2xl text-cyan-700"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: !isIncognito ? 'white' : 'black',
            zIndex: 10,
          }}
        >
          {!isIncognito ? (
            <>
              <div className="!w-full !flex !items-center !relative !justify-center !max-w-[1280px]">
                <FaSearch
                  color="white"
                  className="!absolute !z-10 !left-[20px]"
                />
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate()}
                  // onClick={(e) => e.target.select()}
                  // onFocus={(e) => e.target.select()}
                  placeholder="Введите URL или запрос"
                  className="!max-w-[1280px] !text-whitey !block !mx-auto !w-full !bg-gray-700 !placeholder-gray-400 !py-2 !pl-15 !rounded !outline-none !border-none"
                  spellCheck={false}
                />
              </div>
            </>
          ) : (
            <>
              <div className="!w-full !flex !items-center !relative !justify-center !max-w-[1280px]">
                <FaSearch
                  color="white"
                  className="!absolute !z-10 !left-[20px]"
                />
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate()}
                  // onClick={(e) => e.target.select()}
                  // onFocus={(e) => e.target.select()}
                  placeholder="Введите URL или запрос"
                  className="!max-w-[1280px] !text-whitey !block !mx-auto !w-full !bg-gray-700 !placeholder-gray-400 !py-2 !pl-15 !rounded !outline-none !border-none"
                  spellCheck={false}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
