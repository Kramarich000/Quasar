import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaArrowRight, FaSearch } from 'react-icons/fa';
import { FaArrowRotateRight } from 'react-icons/fa6';

export default function ToolBar({ webviewRef, url, onChangeUrl }) {
  const [inputValue, setInputValue] = useState(url);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const animationFrameId = useRef(null);
  const stopTimeout = useRef(null);
  const [isReloading, setIsReloading] = useState(false);
  const reloadTimerRef = useRef(null);
  const [isWebViewReady, setIsWebViewReady] = useState(false);

  useEffect(() => {
    setInputValue(url);
  }, [url]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    let isInitialized = false;

    const safeHandleDomReady = () => {
      if (isInitialized) return;
      isInitialized = true;
      window.api.navigatorSpoof.override();
      setIsWebViewReady(true);

      const handleNewWindow = (e) => {
        e.preventDefault();
        window.api.send('open-external-url', e.url);
      };

      webview.addEventListener('new-window', handleNewWindow);

      return () => {
        webview.removeEventListener('new-window', handleNewWindow);
      };
    };

    webview.addEventListener('dom-ready', safeHandleDomReady);

    return () => {
      webview.removeEventListener('dom-ready', safeHandleDomReady);
      isInitialized = false;
    };
  }, [webviewRef]);

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

  return (
    <div className="!relative !bg-gray-800">
      <div className="flex items-center text-white px-2 h-12 space-x-2">
        <button
          onClick={() => {
            if (webviewRef.current?.canGoBack() === true) {
              webviewRef.current.goBack();
            }
          }}
          title="Назад"
          className="!p-2 !transition-colors !rounded !bg-transparent hover:!bg-gray-700 !outline-none !border-none"
        >
          <FaArrowLeft />
        </button>

        <button
          onClick={() => {
            if (webviewRef.current?.canGoForward() === true) {
              webviewRef.current.goForward();
            }
          }}
          title="Вперед"
          className="!p-2 !transition-colors !rounded !bg-transparent hover:!bg-gray-700 !outline-none !border-none"
        >
          <FaArrowRight />
        </button>

        <button
          onClick={() => {
            if (!isWebViewReady) return;

            if (reloadTimerRef.current) {
              clearTimeout(reloadTimerRef.current);
            }

            setIsReloading(true);
            webviewRef.current?.reload();

            reloadTimerRef.current = window.setTimeout(() => {
              setIsReloading(false);
            }, 1000);
          }}
          title="Обновить"
          className="!p-2 !transition-colors !rounded !bg-transparent hover:!bg-gray-700 !outline-none !border-none"
        >
          {/* <motion.div
            key={isReloading ? 'rotating' : 'stopped'}
            initial={{ rotate: 0 }}
            animate={{ rotate: isReloading ? 360 : 0 }}
            transition={{
              duration: 1,
              repeat: isReloading ? Infinity : 0,
              ease: 'linear',
            }}
          > */}
          <FaArrowRotateRight />
          {/* </motion.div> */}
        </button>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && navigate()}
          onClick={(e) => e.target.select()}
          onFocus={(e) => e.target.select()}
          placeholder="Введите URL или запрос"
          className="flex-1 bg-gray-700 placeholder-gray-400 px-3 py-1 rounded focus:outline-none"
          spellCheck={false}
        />

        {/* <button
          onClick={navigate}
          title="Перейти"
          className="!p-2 !transition-colors !rounded !bg-transparent hover:!bg-gray-700 !outline-none !border-none"
        >
          <FaSearch />
        </button> */}
      </div>
    </div>
  );
}
