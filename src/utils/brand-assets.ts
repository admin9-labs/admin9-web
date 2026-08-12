export default function loadImageSource(source: string, fallback: string): Promise<string> {
  if (!source || source === fallback) return Promise.resolve(fallback);

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(source);
    image.onerror = () => resolve(fallback);
    image.src = source;
  });
}
