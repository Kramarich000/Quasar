import { useState, useEffect } from 'react';
import { IoClose, IoMoon, IoSunny } from 'react-icons/io5';
import { HiLockClosed } from 'react-icons/hi';
import { IoWarning } from 'react-icons/io5';
import { IoAdd } from 'react-icons/io5';
import TitleBar from './TitleBar';
import { BsIncognito } from 'react-icons/bs';
import { motion, AnimatePresence } from 'framer-motion';
import defaultFavicon from '../assets/default-favicon.svg';
import { useTabLoadingState } from '../hooks/useTabLoadingState';
import { TabContainer } from './TabContainer';
import { SlGlobe } from 'react-icons/sl';

export default function TabBar({
  tabs,
  activeTab,
  isSecure,
  onAddTab,
  favicons = {},
  onCloseTab,
  onSelectTab,
  onTabReorder,
}) {
  const [theme, setTheme] = useState(() => {
    return window.api.isIncognito ? 'dark' : 'light';
  });
  const MAX_TABS = 25;

  useEffect(() => {
    const root = document.getElementById('root');
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);
  const loadingTabs = useTabLoadingState(tabs, activeTab);

  return (
    <>
      <div
        className="tabBar-scrollbar flex items-center h-10 bg-gray-800 shadow overflow-x-auto overflow-y-hidden no-scrollbar"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="!m-[5px]">
          <svg
            className="pointer-events-none"
            width="30"
            height="30"
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
        </div>
        <AnimatePresence initial={false}>
          {tabs.map((tab, index) => (
            <TabContainer
              key={tab.id}
              tab={tab}
              activeTab={activeTab}
              loadingTabs={loadingTabs}
              favicons={favicons}
              defaultFavicon={defaultFavicon}
              onSelectTab={onSelectTab}
              onCloseTab={onCloseTab}
              onTabReorder={onTabReorder}
              index={index}
            />
          ))}
        </AnimatePresence>
        <button
          style={{ WebkitAppRegion: 'no-drag' }}
          onClick={() => onAddTab(false)}
          title="Открыть новую вкладку"
          // className={`!mr-auto !p-0 flex items-center justify-center !w-[20px] !h-[20px] !bg-transparent !outline-none !border-none !transition-all hover:!bg-gray-500 !rounded-full hover:rotate-180 duration-300 ${
          //   tabs.length >= MAX_TABS
          //     ? 'opacity-50 cursor-not-allowed'
          //     : 'hover:bg-gray-500'
          // }`}
          className="!mr-auto !p-0 flex items-center justify-center !w-[20px] !h-[20px] !bg-transparent !outline-none !border-none !transition-all hover:!bg-gray-500 !rounded-full hover:rotate-180 duration-300"
        >
          <IoAdd size={20} />
        </button>
        <button
          style={{ WebkitAppRegion: 'no-drag' }}
          onClick={() => window.api.createIncognitoWindow()}
          className={`!ml-8 !mt-[5px] !p-0 flex items-center justify-center !bg-transparent !outline-none !border-none !transition-all hover:!bg-gray-500 !rounded-full`}
          title="Новая вкладка в режиме инкогнито"
        >
          <BsIncognito size={25} />
        </button>

        <span
          style={{
            WebkitAppRegion: 'no-drag',
            pointerEvents: 'auto',
          }}
          title={
            isSecure === 'secure'
              ? 'Ваше соединение защищено'
              : isSecure === 'insecure'
              ? 'Внимание! Ваше соединение не защищено'
              : 'Главная страница'
          }
          className="!ml-4 !mt-[5px]"
        >
          {isSecure === 'secure' && <HiLockClosed color="green" size={25} />}
          {isSecure === 'insecure' && <IoWarning color="red" size={25} />}
          {isSecure === 'local' && <SlGlobe size={25} />}
        </span>

        <div className="flex ml-10" style={{ WebkitAppRegion: 'no-drag' }}>
          {/* <button
            className="right-[7.5px] flex items-center justify-center !bg-transparent !outline-none !border-none !transition-all hover:!bg-gray-500 !rounded-none "
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          >
            {theme === 'light' ? <IoMoon /> : <IoSunny />}
          </button> */}
          <div style={{ WebkitAppRegion: 'no-drag' }}>
            <TitleBar />
          </div>
        </div>
      </div>
      <svg
        class="absolute bottom-0 z-100 left-0 w-full h-14 opacity-80 pointer-events-none"
        viewBox="0 0 100 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path d="M0 40 Q50 -20 100 40" fill="#0e7490" filter="url(#blur)" />
        <defs>
          <filter
            id="blur"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
            color-interpolation-filters="sRGB"
          >
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
      </svg>
    </>
  );
}
