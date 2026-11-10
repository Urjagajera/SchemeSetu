import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageContext';

const svc = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('../services/familyService', async (orig) => ({ ...(await orig<typeof import('../services/familyService')>()), familyService: svc }));
vi.mock('../hooks/useStates', () => ({ useStates: () => ['Gujarat', 'Kerala'] }));

const { FamilyPanel } = await import('./FamilyPanel');
const { memberProfile } = await import('../services/familyService');

const mother = { id: 'm1', label: 'Mother', gender: 'female', bpl: 'yes', age: '66' };

beforeEach(() => {
  localStorage.clear();
  Object.values(svc).forEach((f) => f.mockReset());
  svc.list.mockResolvedValue({ members: [mother], max: 6 });
});

const renderPanel = (selectedId: string | null, onSelect = vi.fn()) => {
  render(<LanguageProvider><FamilyPanel selectedId={selectedId} onSelect={onSelect} /></LanguageProvider>);
  return onSelect;
};

describe('FamilyPanel', () => {
  it('lists Me and the saved members, and picks one', async () => {
    const onSelect = renderPanel(null);
    fireEvent.click(await screen.findByRole('button', { name: 'Mother' }));
    expect(onSelect).toHaveBeenCalledWith(mother);
    expect(screen.getByRole('button', { name: 'Me' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('adds a member: a name is required, then the answers are saved and the new member is picked', async () => {
    svc.create.mockResolvedValue({ id: 'm2', label: 'Son', state: 'Kerala' });
    const onSelect = renderPanel(null);
    fireEvent.click(await screen.findByRole('button', { name: 'Add family member' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert').textContent).toMatch(/name or relation/);
    fireEvent.change(screen.getByLabelText('Name or relation (e.g. Mother)'), { target: { value: 'Son' } });
    fireEvent.change(screen.getByLabelText('State'), { target: { value: 'Kerala' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith({ id: 'm2', label: 'Son', state: 'Kerala' }));
    expect(svc.create.mock.calls[0][0]).toMatchObject({ label: 'Son', state: 'Kerala' });
  });

  it('says whose results are shown and that the own profile is unchanged', async () => {
    renderPanel('m1');
    expect(await screen.findByText(/Showing schemes for Mother\. Your own profile is not changed\./)).toBeTruthy();
  });

  it('hides "Add" once the limit is reached', async () => {
    svc.list.mockResolvedValue({ members: [mother], max: 1 });
    renderPanel(null);
    await screen.findByRole('button', { name: 'Mother' });
    expect(screen.queryByRole('button', { name: 'Add family member' })).toBeNull();
  });
});

describe('memberProfile', () => {
  it('turns a member into the profile the check uses, blanks staying blank', () => {
    expect(memberProfile(mother as never)).toMatchObject({ age: '66', gender: 'female', bpl: 'yes', state: '', income: '' });
  });
});
