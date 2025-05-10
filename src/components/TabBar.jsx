// src/components/TabBar.jsx
export default function TabBar({
  className = '',
  tabs,
  activeTab,
  onAddTab,
  onCloseTab,
  onSelectTab,
}) {
  return (
    <div
      className={`${className} flex items-center justify-start h-10 bg-gray-200 px-2 shadow`}
    >
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onSelectTab(tab.id)}
          className={`flex items-center px-3 mr-1 rounded-t-md cursor-pointer
            ${
              tab.id === activeTab
                ? 'bg-white border-t border-l border-r border-gray-300'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
        >
          <span className="truncate max-w-xs">{new URL(tab.url).hostname}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCloseTab(tab.id);
            }}
            className="ml-1 p-1 no-drag"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={onAddTab}
        className="ml-auto px-3 py-1 bg-green-400 rounded hover:bg-green-500 no-drag"
      >
        +
      </button>
    </div>
  );
}
