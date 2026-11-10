import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageContext';
import { DataSourceBanner } from './DataSourceBanner';

const setOnline = (value: boolean) => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value);
const renderBanner = () => render(<LanguageProvider><DataSourceBanner /></LanguageProvider>);

describe('DataSourceBanner: offline', () => {
  afterEach(() => vi.restoreAllMocks());

  it('says the device is offline, and what still works, when there is no network', () => {
    setOnline(false);
    renderBanner();
    expect(screen.getByRole('status').textContent).toMatch(/You're offline\. Scheme pages you opened recently still open/);
  });

  it('shows nothing online with real data, and appears when the connection drops', () => {
    const online = setOnline(true);
    renderBanner();
    expect(screen.queryByRole('status')).toBeNull();
    online.mockReturnValue(false);
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(screen.getByRole('status').textContent).toMatch(/offline/);
  });
});
