import { useState } from 'react';
import { FaArrowLeft, FaArrowRight, FaSync, FaSearch } from 'react-icons/fa';

export default function ToolBar({ webviewRef }) {
  const [url, setUrl] = useState('');
  function isLikelyURL(text) {
    return /^https?:\/\/|^www\.|\.com|\.ru/.test(text);
  }

  const navigate = () => {
    let u = url.trim();
    if (!isLikelyURL(u)) {
      u = `https://www.google.com/search?q=${encodeURIComponent(u)}`;
    } else if (!/^https?:\/\//.test(u)) {
      u = 'https://' + u;
    }
    webviewRef.current?.loadURL(u);
  };

  return (
    <div className="flex items-center bg-gray-800 text-white px-2 h-12 space-x-2">
      <button
        onClick={() =>
          webviewRef.current?.canGoBack &&
          webviewRef.current.canGoBack() &&
          webviewRef.current.goBack()
        }
        className="p-2 rounded !bg-transparent !transition-all hover:!bg-gray-700 !outline-none !border-none"
      >
        <FaArrowLeft />
      </button>
      <button
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
        onClick={() =>
          webviewRef.current?.reload && webviewRef.current.reload()
        }
        className="p-2 rounded !bg-transparent !transition-all hover:!bg-gray-700 !outline-none !border-none"
      >
        <FaSync />
      </button>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && navigate()}
        placeholder="Введите URL или запрос"
        className="flex-1 bg-gray-700 placeholder-gray-400 px-3 py-1 rounded focus:outline-none"
      />
      <button
        onClick={navigate}
        className="p-2 rounded !bg-transparent !transition-all hover:!bg-gray-700 !outline-none !border-none"
      >
        <FaSearch />
      </button>
    </div>
  );
}
