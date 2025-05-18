import { IoClose } from 'react-icons/io5';
import { IoAdd } from 'react-icons/io5';
export default function TabBar({
  tabs,
  activeTab,
  onAddTab,
  onCloseTab,
  onSelectTab,
}) {
  return (
    <div className="flex items-center h-10 bg-gray-800 shadow overflow-x-auto overflow-y-hidden no-scrollbar pr-30">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onSelectTab(tab.id)}
          className={` relative !transition-all
            flex-shrink flex-grow basis-0 p-2 flex max-w-[300px] items-center px-2 mx-0.5 rounded-t-md cursor-pointer
            overflow-hidden whitespace-nowrap
            ${
              tab.id === activeTab
                ? 'bg-gray-900 '
                : 'bg-gray-800 hover:bg-gray-700'
            }
          `}
        >
          <span className="truncate">{new URL(tab.url).hostname}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCloseTab(tab.id);
            }}
            className="!m-0 !ml-auto !p-0 !w-[20px] !h-[20px] flex items-center justify-center no-drag !right-4 !bg-transparent !outline-0 !border-0 hover:!bg-gray-500 !rounded-full !transition-all hover"
          >
            <IoClose />
          </button>
        </div>
      ))}
      <button
        onClick={onAddTab}
        className="!mr-auto !p-0 flex items-center justify-center !w-[20px] !h-[20px] !bg-transparent !outline-none !border-none !transition-all hover:!bg-gray-500 !rounded-full no-drag"
      >
        <IoAdd />
      </button>
    </div>
  );
}
