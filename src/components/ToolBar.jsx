import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaArrowRight, FaSearch } from 'react-icons/fa';
import { FaArrowRotateRight, FaVolumeXmark } from 'react-icons/fa6';
import { FaVolumeUp } from 'react-icons/fa';
import { IoTime } from 'react-icons/io5';
import { setVolume } from '../utils/audioManager';
import HistoryPanel from './HistoryPanel';

export default function ToolBar({ url, onChangeUrl, isIncognito }) {
  const [inputValue, setInputValue] = useState(url);
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const debounceRef = useRef(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    const handleNavigationStateChanged = ({
      canGoBack: back,
      canGoForward: forward,
    }) => {
      setCanGoBack(back);
      setCanGoForward(forward);
    };

    window.api.on('navigationStateChanged', handleNavigationStateChanged);
    return () => {
      window.api.off('navigationStateChanged', handleNavigationStateChanged);
    };
  }, []);

  useEffect(() => {
    if (highlightedIndex !== -1 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [highlightedIndex]);

  const getDisplayUrl = (url) => {
    if (!url) return '';
    if (url === 'about:blank') return '';
    if (url.startsWith('file://')) return '';
    return url;
  };

  useEffect(() => {
    const displayUrl = getDisplayUrl(url);
    setInputValue(displayUrl);
  }, [url]);

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
    const displayUrl = getDisplayUrl(phrase);
    setInputValue(displayUrl);
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

  const toggleMute = () => {
    setIsMuted(!isMuted);
    setVolume(isMuted ? 0.4 : 0);
  };

  const openHistory = () => {
    window.api.bvLoadUrl('file://history.html');
  };

  return (
    <div className="!relative !bg-gray-800">
      <div className="flex items-center text-white px-2 h-12 space-x-2">
        <button
          onClick={() => window.api.bvGoBack()}
          title="Назад"
          disabled={!canGoBack}
          className={`!p-2 !transition-colors !rounded !bg-transparent hover:!bg-gray-700 !outline-none !border-none ${
            !canGoBack ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <FaArrowLeft />
        </button>

        <button
          onClick={() => window.api.bvGoForward()}
          title="Вперед"
          disabled={!canGoForward}
          className={`!p-2 !transition-colors !rounded !bg-transparent hover:!bg-gray-700 !outline-none !border-none ${
            !canGoForward ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <FaArrowRight />
        </button>

        <button
          onClick={() => window.api.bvReload()}
          title="Обновить"
          className="!p-2 !transition-colors !rounded !bg-transparent hover:!bg-gray-700 !outline-none !border-none"
        >
          <FaArrowRotateRight />
        </button>

        <motion.button
          onClick={toggleMute}
          title={isMuted ? "Включить звук" : "Выключить звук"}
          className="!p-2 !rounded !bg-transparent hover:!bg-gray-700 !outline-none !border-none relative"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <AnimatePresence mode="wait">
            {isMuted ? <FaVolumeXmark /> : <FaVolumeUp />}
          </AnimatePresence>
        </motion.button>

        <motion.button
          onClick={openHistory}
          title="История"
          className="!p-2 !rounded !bg-transparent hover:!bg-gray-700 !outline-none !border-none relative"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <IoTime size={20} />
        </motion.button>

        <div className="flex relative w-[100%] flex-col">
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
            onFocus={(e) => {
              e.target.select();
              e.stopPropagation();
              e.preventDefault();
              setIsSuggestOpen(suggestions.length > 0);
            }}
            placeholder="Введите URL или запрос"
            className="flex-1 z-101 bg-transparent placeholder-gray-400 !transition-colors px-3 py-1 rounded-[30px] border-b-2 border-gray-400 focus:!border-cyan-700 focus:outline-none relative "
            spellCheck={false}
          />

          {isSuggestOpen && suggestions.length > 0 && (
            <ul
              ref={containerRef}
              className="z-50 absolute top-[40px] left-0 w-full p-2 py-0 pb-1.5 text-left bg-gray-800 text-white rounded-b shadow-lg max-h-80 overflow-auto"
            >
              <FaSearch className="absolute !pointer-events-none !select-none top-[30%] left-[1%]" />

              {suggestions.map((phrase, idx) => (
                <li
                  key={phrase}
                  ref={(el) => (itemRefs.current[idx] = el)}
                  onMouseDown={() => handleSelect(phrase)}
                  className={`
                      px-3 pl-[40px] py-2 hover:bg-gray-600
                      ${
                        highlightedIndex === idx
                          ? 'bg-gray-600'
                          : 'hover:bg-gray-500'
                      }
                    `}
                >
                  <span className="!pointer-events-none">{phrase}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {isIncognito && (
          <div className="bg-transparent z-9999 absolute right-[25px]">
            Incognito Mode
          </div>
        )}
      </div>

      <HistoryPanel 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
      />
    </div>
  );
}
