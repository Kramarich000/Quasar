export default function Tab({ url, webviewRef }) {
  if (url === 'welcome') {
    return (
      <div className="p-6 flex flex-col items-center justify-center mx-auto text-center text-2xl text-cyan-700">
        <h1>Добро пожаловать в браузер Quasar!</h1>
        <p>Откройте новую вкладку и начните серфить.</p>
      </div>
    );
  }

  return (
    <webview
      ref={webviewRef}
      src={url}
      className="w-full h-full"
      allowpopups="true"
      webpreferences="nativeWindowOpen=yes, contextIsolation=yes, nodeIntegration=no"
    />
  );
}
