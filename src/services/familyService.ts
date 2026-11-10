import axios from 'axios';
import type { UserProfile } from '../types';

/** A family member's eligibility answers (backend/src/routes/family.ts): a UserProfile with a name or relation. */
export type FamilyMember = Partial<UserProfile> & { id: string; label: string };
export type FamilyAnswers = Partial<Omit<FamilyMember, 'id'>>;

export const familyService = {
  async list(): Promise<{ members: FamilyMember[]; max: number }> {
    const res = await axios.get('/api/family');
    if (!Array.isArray(res.data?.members)) throw new Error('[familyService.list] Backend may not be running.');
    return { members: res.data.members, max: res.data.max ?? 6 };
  },
  async create(answers: FamilyAnswers): Promise<FamilyMember> {
    return (await axios.post('/api/family', answers)).data;
  },
  async update(id: string, answers: FamilyAnswers): Promise<FamilyMember> {
    return (await axios.put(`/api/family/${encodeURIComponent(id)}`, answers)).data;
  },
  async remove(id: string): Promise<void> {
    await axios.delete(`/api/family/${encodeURIComponent(id)}`);
  },
};

/** The member as a profile for the eligibility check (blank answers stay blank = unknown). */
export const memberProfile = (m: FamilyMember): UserProfile => ({
  age: m.age ?? '',
  dob: m.dob,
  gender: m.gender ?? '',
  state: m.state ?? '',
  category: m.category ?? '',
  occupation: m.occupation ?? '',
  income: m.income ?? '',
  residence: m.residence ?? '',
  land: m.land ?? '',
  education: '',
  govtJob: m.govtJob,
  incomeTax: m.incomeTax,
  bpl: m.bpl,
  pension: m.pension,
});
