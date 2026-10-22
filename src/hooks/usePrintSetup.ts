import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

/**
 * Gets a page ready for the browser's print dialog, however it was opened (the Print button or Ctrl+P):
 * - dark mode is switched to light while printing, because browsers drop backgrounds and white text would vanish;
 * - the moment of printing is returned, so the printed note can carry that day's date.
 */
export function usePrintSetup(): Date {
  const [printedAt, setPrintedAt] = useState(() => new Date());

  useEffect(() => {
    const root = document.documentElement;
    let wasDark = false;
    const before = () => {
      // Rendered before the print snapshot is taken, not after.
      flushSync(() => setPrintedAt(new Date()));
      wasDark = root.classList.contains('dark');
      if (wasDark) root.classList.replace('dark', 'light');
    };
    const after = () => {
      if (wasDark) root.classList.replace('light', 'dark');
      wasDark = false;
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
      after();
    };
  }, []);

  return printedAt;
}
