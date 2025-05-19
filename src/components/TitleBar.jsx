import { useState } from 'react';

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = () => window.api.minimize();
  const handleMaximize = async () => {
    const maximized = await window.api.toggleMaximize();
    setIsMaximized(maximized);
  };
  const handleClose = () => window.api.close();

  return (
    <div className="titlebar flex items-center justify-end text-white py-1 select-none">
      <button
        title="Свернуть"
        onClick={handleMinimize}
        className="px-2 py-1 text-gray-400 !outline-none hover:!text-gray-100 hover:!bg-gray-500 !rounded-none !transition-all !border-none !bg-transparent"
      >
        ─
      </button>
      <button
        title={isMaximized ? 'Полноэкранный режим' : 'Окно'}
        onClick={handleMaximize}
        className="px-2 py-1 text-gray-400 !outline-none hover:!text-gray-100 hover:!bg-gray-500 !rounded-none !transition-all !border-none !bg-transparent"
      >
        {isMaximized ? '🗗' : '☐'}
      </button>
      <button
        title="Закрыть"
        onClick={handleClose}
        className="px-2 py-1 text-gray-400 !outline-none hover:!text-gray-100 hover:!bg-red-500 !rounded-none !transition-all !border-none !bg-transparent"
      >
        ✕
      </button>
    </div>
  );
}
