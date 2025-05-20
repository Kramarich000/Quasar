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
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const debounceRef = useRef(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  useEffect(() => {
    if (highlightedIndex !== -1 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [highlightedIndex]);
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
      setIsWebViewReady(false);
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

  // function isLikelyURL(text) {
  //   return /^https?:\/\/|^www\.|\.com|\.ru/.test(text.trim());
  // }

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = inputValue.trim();

    if (q.length < 1) {
      setSuggestions([]);
      setIsSuggestOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      let phrases = [];

      const fetchPhrases = async (url, extractFn) => {
        const res = await fetch(url);
        const data = await res.json();
        return extractFn(data);
      };

      try {
        phrases = await fetchPhrases(
          `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(
            q,
          )}`,
          (data) =>
            Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [],
        );

        if (phrases.length === 0) {
          phrases = await fetchPhrases(
            `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`,
            (data) =>
              Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [],
          );
        }

        // if (phrases.length === 0) {
        //   phrases = await fetchPhrases(
        //     `https://example.com/your-fallback-api?q=${encodeURIComponent(q)}`,
        //     data => data.suggestions || []
        //   );
        // }

        setSuggestions(phrases);
        setIsSuggestOpen(phrases.length > 0);
      } catch (error) {
        console.error('Autocomplete error:', error);
        setSuggestions([]);
        setIsSuggestOpen(false);
      }
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [inputValue]);

  const navigate = (query) => {
    let u = (query ?? inputValue).trim();
    if (!u) return;

    if (!/^https?:\/\//.test(u) && !/\.(com|ru|org|net)/.test(u)) {
      u = `https://www.google.com/search?q=${encodeURIComponent(u)}`;
    } else if (!/^https?:\/\//.test(u)) {
      u = 'https://' + u;
    }

    setIsSuggestOpen(false);
    onChangeUrl(u);
  };

  const handleSelect = (phrase) => {
    setInputValue(phrase);
    setIsSuggestOpen(false);
    navigate(phrase);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsSuggestOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault();
      setHighlightedIndex((i) => {
        const next = i + 1;
        return next >= suggestions.length ? 0 : next;
      });
      return;
    }
    if (e.key === 'ArrowUp' && suggestions.length) {
      e.preventDefault();
      setHighlightedIndex((i) => {
        const prev = i - 1;
        return prev < 0 ? suggestions.length - 1 : prev;
      });
      return;
    }
    if (e.key === 'Enter') {
      if (highlightedIndex >= 0) {
        handleSelect(suggestions[highlightedIndex]);
      } else {
        navigate();
      }
    }
  };

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

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
        <div className="flex relative w-[88%] flex-col">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => {
              e.target.select();
              e.stopPropagation();
              e.preventDefault();
              setIsSuggestOpen(suggestions.length > 0);
            }}
            onBlur={() => {
              setTimeout(() => {
                setIsSuggestOpen(false);
              }, 100);
            }}
            onFocus={(e) => {
              e.target.select();
              e.stopPropagation();
              e.preventDefault();
              setIsSuggestOpen(suggestions.length > 0);
            }}
            placeholder="Введите URL или запрос"
            className="flex-1 bg-gray-700 placeholder-gray-400 px-3 py-1 rounded focus:outline-none relative z-20"
            spellCheck={false}
          />

          {isSuggestOpen && suggestions.length > 0 && (
            <ul
              ref={containerRef}
              className="z-50 absolute top-[40px] left-0 w-full p-2 py-0 pb-1.5 text-left bg-gray-800 text-white rounded-b shadow-lg max-h-80 overflow-auto"
            >
              {suggestions.map((phrase, idx) => (
                <div className="relative ">
                  <FaSearch className="absolute !pointer-events-none !select-none top-[30%] left-[1%]" />
                  <li
                    key={idx}
                    ref={(el) => (itemRefs.current[idx] = el)}
                    onMouseDown={() => handleSelect(phrase)}
                    className={`
                      px-3 pl-[40px] py-2 hover:bg-gray-600
                      ${
                        highlightedIndex === idx
                          ? 'bg-gray-600'
                          : 'hover:bg-gray-600'
                      }
                    `}
                  >
                    <span className="!pointer-events-none">{phrase}</span>
                  </li>
                </div>
              ))}
            </ul>
          )}
        </div>

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
