import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoTrash, IoSearch } from 'react-icons/io5';

export default function HistoryPanel({ isOpen, onClose }) {
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredHistory, setFilteredHistory] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    const filtered = history.filter(entry => 
      entry.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredHistory(filtered);
  }, [searchQuery, history]);

  const loadHistory = async () => {
    try {
      const data = await window.api.getHistory();
      setHistory(data);
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Вы уверены, что хотите очистить всю историю?')) {
      window.api.clearHistory();
      setHistory([]);
    }
  };

  const handleRemoveEntry = (id) => {
    window.api.removeHistoryEntry(id);
    setHistory(prev => prev.filter(entry => entry.id !== id));
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          className="fixed right-0 top-0 h-full w-96 bg-gray-800 shadow-lg z-50"
        >
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl text-white">История</h2>
              <button
                onClick={handleClearHistory}
                className="text-red-500 hover:text-red-400"
                title="Очистить историю"
              >
                <IoTrash size={20} />
              </button>
            </div>

            <div className="relative mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск в истории..."
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg pl-10"
              />
              <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            <div className="overflow-y-auto h-[calc(100vh-8rem)]">
              {filteredHistory.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-700 rounded-lg p-3 mb-2"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <a
                        href={entry.url}
                        className="text-white hover:text-cyan-400 block truncate"
                        title={entry.title}
                      >
                        {entry.title}
                      </a>
                      <p className="text-gray-400 text-sm truncate" title={entry.url}>
                        {entry.url}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {formatDate(entry.timestamp)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveEntry(entry.id)}
                      className="text-gray-400 hover:text-red-400 ml-2"
                      title="Удалить из истории"
                    >
                      <IoTrash size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 