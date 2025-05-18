export default function Tab({ url, visible, webviewRef }) {
  return (
    <webview
      ref={webviewRef}
      src={url}
      className={`${visible ? 'block' : 'hidden'} w-full h-full`}
      style={{ display: visible ? 'flex' : 'none' }}
      allowpopups="true"
      webpreferences="nativeWindowOpen=yes, contextIsolation=yes"
    />
  );
}
