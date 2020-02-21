import cuid from 'cuid';

export function getElementByIdWithError(id): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Element with id ${id} could not be found on DOM`);
  }
  return element;
}

export function generateUniqueDOMId(appId: string = ''): string {
  const elementId = `${cuid()}__${appId}`;

  console.info(`_getUniqueAppId ${elementId}`);
  return elementId;
}

export function getOriginFromURL(url: string): string {
  const anchor = document.createElement('a');
  anchor.href = url;
  return anchor.origin;
}

export function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      console.info(`loadScript ${url}`);
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.body.appendChild(script);
    } catch (err) {
      reject();
    }
  });
}
