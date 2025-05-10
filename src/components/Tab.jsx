export default function Tab({ url, visible }) {
  return (
    <webview
      src={url}
      className={`${visible ? 'block' : 'hidden'} absolute inset-0 top-[0rem]`}
    />
  );
}
