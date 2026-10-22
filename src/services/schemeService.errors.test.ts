import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), isAxiosError: (e: unknown) => !!(e as { isAxiosError?: boolean })?.isAxiosError },
}));

import { schemeService } from './schemeService';

/** What axios rejects with: no response at all (offline), or the server's status. */
const offline = () => Object.assign(new Error('Network Error'), { isAxiosError: true });
const httpError = (status: number) => Object.assign(new Error(`Request failed with status code ${status}`), { isAxiosError: true, response: { status } });

beforeEach(() => {
  vi.mocked(axios.get).mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('when schemes cannot be loaded, the service fails instead of returning sample schemes', () => {
  it.each([
    ['getSchemes', () => schemeService.getSchemes({ limit: 3 })],
    ['getFilterOptions', () => schemeService.getFilterOptions()],
    ['getFeaturedSchemes', () => schemeService.getFeaturedSchemes()],
    ['getSchemeById', () => schemeService.getSchemeById('5ed68276-ab5e-4cfe-843b-f19d985dd730')],
  ])('%s rejects when offline', async (_name, call) => {
    vi.mocked(axios.get).mockRejectedValue(offline());
    await expect(call()).rejects.toThrow('Network Error');
  });

  it('getSchemes rejects on a server error too', async () => {
    vi.mocked(axios.get).mockRejectedValue(httpError(500));
    await expect(schemeService.getSchemes()).rejects.toThrow('500');
  });
});

describe('getSchemeById tells "not found" apart from "could not load"', () => {
  it('a 404 means there is no such scheme: null, not an error', async () => {
    vi.mocked(axios.get).mockRejectedValue(httpError(404));
    await expect(schemeService.getSchemeById('missing')).resolves.toBeNull();
  });

  it('a server error is an error, not "not found"', async () => {
    vi.mocked(axios.get).mockRejectedValue(httpError(503));
    await expect(schemeService.getSchemeById('abc')).rejects.toThrow('503');
  });
});
