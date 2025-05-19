import { useState, useEffect } from 'react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { FaSync, FaSearch } from 'react-icons/fa';
export default function ToolBar({ webviewRef, url, onChangeUrl }) {
  const [inputValue, setInputValue] = useState(url);

  useEffect(() => {
    setInputValue(url);
  }, [url]);

  function isLikelyURL(text) {
    return /^https?:\/\/|^www\.|\.com|\.ru/.test(text);
  }

  const navigate = () => {
    let u = inputValue.trim();
    if (!isLikelyURL(u)) {
      u = `https://www.google.com/search?q=${encodeURIComponent(u)}`;
    } else if (!/^https?:\/\//.test(u)) {
      u = 'https://' + u;
    }
    onChangeUrl(u);
  };

  return (
    <div className="flex items-center bg-gray-800 text-white px-2 h-12 space-x-2">
      <button
        onClick={() =>
          webviewRef.current?.canGoBack &&
          webviewRef.current.canGoBack() &&
          webviewRef.current.goBack()
        }
        title="Назад"
        className="p-2 rounded !bg-transparent !transition-all hover:!bg-gray-700 !outline-none !border-none"
      >
        <FaArrowLeft />
      </button>
      <button
        title="Вперед"
        onClick={() =>
          webviewRef.current?.canGoForward &&
          webviewRef.current.canGoForward() &&
          webviewRef.current.goForward()
        }
        className="p-2 rounded !bg-transparent !transition-all hover:!bg-gray-700 !outline-none !border-none"
      >
        <FaArrowRight />
      </button>
      <button
        title="Обновить"
        onClick={() =>
          webviewRef.current?.reload && webviewRef.current.reload()
        }
        className="p-2 rounded !bg-transparent !transition-all hover:!bg-gray-700 !outline-none !border-none"
      >
        <FaSync />
      </button>
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && navigate()}
        onClick={(e) => {
          e.target.select();
        }}
        onFocus={(e) => {
          e.target.select();
        }}
        placeholder="Введите URL или запрос"
        className="flex-1 bg-gray-700 placeholder-gray-400 px-3 py-1 rounded focus:outline-none"
      />
      <button
        title="Свернуть"
        onClick={navigate}
        className="p-2 rounded !bg-transparent !transition-all hover:!bg-gray-700 !outline-none !border-none"
      >
        <FaSearch />
      </button>
    </div>
  );
}
