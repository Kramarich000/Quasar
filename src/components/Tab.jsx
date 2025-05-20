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
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const wcIdRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const debounceRef = useRef(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDomReady = () => {
      wcIdRef.current = webview.getWebContentsId();

      if (!isActive) {
        window.api.freezeTab(wcIdRef.current);
      }
    };

    webview.addEventListener('dom-ready', handleDomReady);

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
    };
  }, [webviewRef]);

  useEffect(() => {
    if (highlightedIndex !== -1 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [highlightedIndex]);

  useEffect(() => {
    const id = wcIdRef.current;
    if (id == null) return;

    if (isActive) {
      window.api.unfreezeTab(id);
    } else {
      window.api.freezeTab(id);
    }
  }, [isActive]);

  useEffect(() => {
    setInputValue(url);
  }, [url]);

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
            exit={{ opacity: 1 }}
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
        webpreferences="javascriptEnabled=yes,nativeWindowOpen=yes,contextIsolation=yes,sandbox=allow-scripts allow-same-origin,nodeIntegration=no"
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
              <div className="mb-12">
                <svg
                  className="pointer-events-none"
                  width="300"
                  height="300"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g clip-path="url(#clip0_12_166)">
                    <path
                      d="M50 100C77.6142 100 100 77.6142 100 50C100 22.3858 77.6142 0 50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100Z"
                      fill="url(#paint0_linear_12_166)"
                    />
                    <path
                      d="M50.4217 86.0738C52.5863 87.0822 55.5481 87.589 59.3124 87.589C60.3207 87.589 61.5139 87.5045 62.8918 87.3356C64.2645 87.1666 65.3468 86.9713 66.1335 86.7443V77.5632C64.3384 78.012 62.5698 78.2337 60.8276 78.2337C59.1962 78.2337 58.0717 77.8853 57.454 77.1831C56.8363 76.4809 56.5301 75.2297 56.5301 73.4347C70.2356 71.4654 77.0884 62.3953 77.0884 46.2189C77.0884 36.3938 74.8235 29.2295 70.3043 24.7366C65.785 20.2438 59.0273 18 50.0416 18C40.9978 18 34.2295 20.2438 29.7366 24.7366C25.2438 29.2295 23 36.3938 23 46.2189C23 62.7331 30.159 71.8614 44.4823 73.6036C44.5403 76.8611 44.9996 79.5008 45.8708 81.5229C46.7419 83.5449 48.2571 85.0601 50.4217 86.0738ZM60.0251 58.4779C57.9186 61.0912 54.5925 62.3953 50.0416 62.3953C45.4378 62.3953 42.0801 61.0912 39.9736 58.4779C37.8671 55.8698 36.8164 51.7835 36.8164 46.2189C36.8164 40.2108 37.8565 35.945 39.9313 33.4161C42.0115 30.8872 45.3798 29.6254 50.0416 29.6254C54.6506 29.6254 57.9872 30.8872 60.0673 33.4161C62.1474 35.945 63.1875 40.2108 63.1875 46.2189C63.1875 51.7835 62.1316 55.8698 60.0251 58.4779Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <linearGradient
                      id="paint0_linear_12_166"
                      x1="0"
                      y1="100"
                      x2="100"
                      y2="0"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stop-color="#27EAFF" />
                      <stop offset="1" stop-color="#0028FF" />
                    </linearGradient>
                    <clipPath id="clip0_12_166">
                      <rect width="100" height="100" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
                <p className="text-[#0e7490] text-7xl">Quasar</p>
              </div>
              <div className="!w-full !flex !items-center !relative !justify-center !max-w-[1280px]">
                <FaSearch
                  color="white"
                  className="!absolute !z-10 !left-[20px]"
                />
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => {
                    e.target.select();
                    setIsSuggestOpen(suggestions.length > 0);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setIsSuggestOpen(false);
                    }, 100);
                  }}
                  onFocus={(e) => {
                    e.target.select();
                    setIsSuggestOpen(suggestions.length > 0);
                  }}
                  placeholder="Введите URL или запрос"
                  className="!max-w-[1280px] !text-white !block !mx-auto !w-full !bg-gray-700 !placeholder-gray-400 !py-2 !pl-15 !rounded !outline-none !border-none"
                  spellCheck={false}
                />
                {isSuggestOpen && suggestions.length > 0 && (
                  <ul
                    ref={containerRef}
                    className="z-50 absolute top-[48px] left-0 w-full p-2 py-0 pb-1.5 text-left bg-gray-800 text-white rounded-b shadow-lg max-h-50 overflow-auto"
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
            </>
          ) : (
            <>
              <div className="mb-12">
                <svg
                  className="pointer-events-none"
                  width="300"
                  height="300"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g clip-path="url(#clip0_12_166)">
                    <path
                      d="M50 100C77.6142 100 100 77.6142 100 50C100 22.3858 77.6142 0 50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100Z"
                      fill="url(#paint0_linear_12_166)"
                    />
                    <path
                      d="M50.4217 86.0738C52.5863 87.0822 55.5481 87.589 59.3124 87.589C60.3207 87.589 61.5139 87.5045 62.8918 87.3356C64.2645 87.1666 65.3468 86.9713 66.1335 86.7443V77.5632C64.3384 78.012 62.5698 78.2337 60.8276 78.2337C59.1962 78.2337 58.0717 77.8853 57.454 77.1831C56.8363 76.4809 56.5301 75.2297 56.5301 73.4347C70.2356 71.4654 77.0884 62.3953 77.0884 46.2189C77.0884 36.3938 74.8235 29.2295 70.3043 24.7366C65.785 20.2438 59.0273 18 50.0416 18C40.9978 18 34.2295 20.2438 29.7366 24.7366C25.2438 29.2295 23 36.3938 23 46.2189C23 62.7331 30.159 71.8614 44.4823 73.6036C44.5403 76.8611 44.9996 79.5008 45.8708 81.5229C46.7419 83.5449 48.2571 85.0601 50.4217 86.0738ZM60.0251 58.4779C57.9186 61.0912 54.5925 62.3953 50.0416 62.3953C45.4378 62.3953 42.0801 61.0912 39.9736 58.4779C37.8671 55.8698 36.8164 51.7835 36.8164 46.2189C36.8164 40.2108 37.8565 35.945 39.9313 33.4161C42.0115 30.8872 45.3798 29.6254 50.0416 29.6254C54.6506 29.6254 57.9872 30.8872 60.0673 33.4161C62.1474 35.945 63.1875 40.2108 63.1875 46.2189C63.1875 51.7835 62.1316 55.8698 60.0251 58.4779Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <linearGradient
                      id="paint0_linear_12_166"
                      x1="0"
                      y1="100"
                      x2="100"
                      y2="0"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stop-color="#27EAFF" />
                      <stop offset="1" stop-color="#0028FF" />
                    </linearGradient>
                    <clipPath id="clip0_12_166">
                      <rect width="100" height="100" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
                <p className="text-[#0e7490] text-7xl">Quasar</p>
              </div>
              <div className="!w-full !flex !items-center !relative !justify-center !max-w-[1280px]">
                <FaSearch
                  color="white"
                  className="!absolute !z-10 !left-[20px]"
                />
                <input
                  type="text"
                  value={inputValue}
                  onClick={(e) => {
                    e.target.select();
                    setIsSuggestOpen(suggestions.length > 0);
                  }}
                  onFocus={(e) => {
                    e.target.select();
                    setIsSuggestOpen(suggestions.length > 0);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setIsSuggestOpen(false);
                    }, 100);
                  }}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Введите URL или запрос"
                  className="!max-w-[1280px] !text-white !block !mx-auto !w-full !bg-gray-700 !placeholder-gray-400 !py-2 !pl-15 !rounded !outline-none !border-none"
                  spellCheck={false}
                />
                {isSuggestOpen && suggestions.length > 0 && (
                  <ul
                    ref={containerRef}
                    className="z-50 absolute top-[48px] left-0 w-full p-2 py-0 pb-1.5 text-left bg-gray-800 text-white rounded-b shadow-lg max-h-50 overflow-auto"
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
