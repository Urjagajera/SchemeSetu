import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => ({ default: { get: vi.fn(), delete: vi.fn() } }));

import { accountService } from './accountService';

beforeEach(() => {
  vi.mocked(axios.get).mockReset();
  vi.mocked(axios.delete).mockReset();
});

describe('accountService.downloadMyData', () => {
  it('fetches the export and saves it as a JSON file', async () => {
    const data = { account: { email: 'a@b.test' }, profile: null, bookmarks: [] };
    vi.mocked(axios.get).mockResolvedValue({ data });
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => { blob = b; return 'blob:x'; });
    URL.revokeObjectURL = vi.fn();
    const clicked: Array<{ download: string; href: string }> = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clicked.push({ download: this.download, href: this.href }); });

    await accountService.downloadMyData();

    expect(axios.get).toHaveBeenCalledWith('/api/account/export');
    expect(clicked).toEqual([{ download: 'schemesetu-my-data.json', href: 'blob:x' }]);
    const text = await new Promise<string>((resolve) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.readAsText(blob!); });
    expect(JSON.parse(text)).toEqual(data);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
    expect(document.querySelector('a[download]')).toBeNull(); // the temporary link is removed again
  });

  it('throws when the server says no, so the page can show an error', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('401'));
    await expect(accountService.downloadMyData()).rejects.toThrow('401');
  });
});

describe('accountService.deleteMyAccount', () => {
  it('calls DELETE /api/account', async () => {
    vi.mocked(axios.delete).mockResolvedValue({ data: { success: true } });
    await accountService.deleteMyAccount();
    expect(axios.delete).toHaveBeenCalledWith('/api/account');
  });

  it('throws if the server did not confirm, even with a 200', async () => {
    vi.mocked(axios.delete).mockResolvedValue({ data: {} });
    await expect(accountService.deleteMyAccount()).rejects.toThrow();
  });

  it('throws if the request fails', async () => {
    vi.mocked(axios.delete).mockRejectedValue(new Error('500'));
    await expect(accountService.deleteMyAccount()).rejects.toThrow('500');
  });
});
