import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Tab({ url, webviewRef }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const animationFrameId = useRef(null);
  const stopTimeout = useRef(null);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const updateProgress = () => {
      if (progressRef.current < 90) {
        progressRef.current += 0.5;
        setProgress(progressRef.current);
        animationFrameId.current = requestAnimationFrame(updateProgress);
      } else {
        cancelAnimationFrame(animationFrameId.current);
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
  }, [webviewRef, url]);

  if (url === '') {
    return (
      <div className="p-6 flex flex-col items-center justify-center mx-auto text-center text-2xl text-cyan-700">
        <h1>Добро пожаловать в браузер Quasar!</h1>
        <p>Откройте новую вкладку и начните серфить.</p>
      </div>
    );
  }

  return (
    <div className="!relative !h-full !w-full">
      <AnimatePresence>
        {loading && (
          <motion.div
            key="progress-bar"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            exit={{ opacity: 0 }}
            transition={{ ease: 'linear', duration: 0.2 }}
            className="!absolute !top-0 !left-0 !h-[3px] !bg-[#0e7490] !z-10"
          />
        )}
      </AnimatePresence>

      <webview
        ref={webviewRef}
        src={url}
        className="!w-full !h-full"
        allowpopups="true"
        webpreferences="nativeWindowOpen=yes, contextIsolation=yes, nodeIntegration=no"
      />
    </div>
  );
}
