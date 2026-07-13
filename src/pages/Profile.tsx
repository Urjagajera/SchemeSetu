import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { UserProfile } from '../types';
import { 
  User, 
  GraduationCap, 
  Coins, 
  MapPin, 
  Bookmark, 
  ShieldCheck,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

// Define Zod Validation Schema matching all requested fields
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
    message: 'Age must be a valid positive number'
  }),
  dob: z.string().min(1, 'Date of Birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  occupation: z.string().min(1, 'Occupation is required'),
  education: z.string().min(1, 'Education is required'),
  income: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >= 0, {
    message: 'Income must be a valid number'
  }),
  category: z.string().min(1, 'Social category is required'),
  state: z.string().min(1, 'State is required'),
  district: z.string().min(1, 'District is required'),
  minority: z.string().min(1, 'Minority status is required'),
  disability: z.string().min(1, 'Disability status is required'),
  farmer: z.string().min(1, 'Farmer status is required'),
  widow: z.string().min(1, 'Widow status is required'),
  veteran: z.string().min(1, 'Veteran status is required'),
  land: z.string().min(1, 'Landownership is required')
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const Profile: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const { t } = useTranslation();
  
  const [successMsg, setSuccessMsg] = useState('');
  const [activeSection, setActiveSection] = useState<'personal' | 'academic' | 'finance' | 'location' | 'special'>('personal');
  
  const [selectedTags, setSelectedTags] = useState<string[]>(profile.interests || profile.profileTags || []);
  const [newTagInput, setNewTagInput] = useState('');

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = newTagInput.trim();
      if (val && !selectedTags.includes(val)) {
        setSelectedTags([...selectedTags, val]);
        setNewTagInput('');
      }
    }
  };

  const handleAddCustomTagBtn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const val = newTagInput.trim();
    if (val && !selectedTags.includes(val)) {
      setSelectedTags([...selectedTags, val]);
      setNewTagInput('');
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      age: profile.age || '',
      dob: profile.dob || '1998-05-15',
      gender: profile.gender || 'male',
      occupation: profile.occupation || 'farmer',
      education: profile.education || 'graduate',
      income: profile.income || '300000',
      category: profile.category || 'general',
      state: profile.state || 'Uttar Pradesh',
      district: profile.district || 'Lucknow',
      minority: profile.minority || 'no',
      disability: profile.disability || 'no',
      farmer: profile.farmer || 'yes',
      widow: profile.widow || 'no',
      veteran: profile.veteran || 'no',
      land: profile.land || 'yes'
    }
  });

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      setSuccessMsg('');
      await updateProfile({
        ...values,
        interests: selectedTags,
        profileTags: selectedTags
      });
      setSuccessMsg('Your eligibility profile has been successfully saved!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
    }
  };

  const sections = [
    { id: 'personal', label: 'Personal Information', icon: User },
    { id: 'academic', label: 'Education Details', icon: GraduationCap },
    { id: 'finance', label: 'Financial Profile', icon: Coins },
    { id: 'location', label: 'Location & Address', icon: MapPin },
    { id: 'special', label: 'Special Categories', icon: Bookmark }
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto w-full space-y-6"
    >
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary dark:text-white">
          {t('profile')}
        </h1>
        <p className="font-body text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 mt-1">
          Manage your personal information, address, and financial filters used to verify scheme eligibility.
        </p>
      </div>

      {successMsg && (
        <div className="bg-[#d1fadf] border border-green-200 text-[#027a48] rounded-xl p-4 flex items-center gap-2 text-xs md:text-sm">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* Left column navigation tabs */}
        <div className="md:col-span-1 space-y-3">
          <div className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-3 shadow-sm flex flex-col space-y-1 transition-colors">
            {sections.map(sec => {
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs md:text-sm font-bold text-left transition-colors focus:outline-none",
                    activeSection === sec.id
                      ? "bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950"
                      : "text-on-surface-variant hover:bg-surface-container-low dark:text-zinc-400 dark:hover:bg-zinc-800"
                  )}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {sec.label}
                </button>
              );
            })}
          </div>

          {/* Verification badge */}
          <div className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-5 shadow-sm text-center space-y-3 transition-colors">
            <div className="flex justify-center text-green-600 dark:text-green-400">
              <ShieldCheck className="w-12 h-12" />
            </div>
            <div>
              <h4 className="font-heading text-xs md:text-sm font-extrabold text-primary dark:text-white">
                {t('verifiedCitizen')}
              </h4>
              <p className="text-[10px] md:text-xs text-on-surface-variant dark:text-zinc-500 leading-relaxed mt-1">
                Your credentials are encrypted and stored in Supabase secure storage vault.
              </p>
            </div>
          </div>
        </div>

        {/* Right column form parameters */}
        <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-6 transition-colors">
          
          {/* Section 1: Personal */}
          {activeSection === 'personal' && (
            <div className="space-y-4">
              <h3 className="font-heading text-sm md:text-base font-extrabold text-primary dark:text-white pb-2 border-b dark:border-zinc-800">
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">Name</label>
                  <input
                    type="text"
                    {...register('name')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  />
                  {errors.name && <p className="text-[10px] text-red-500 font-bold">{errors.name.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">Age</label>
                  <input
                    type="number"
                    {...register('age')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  />
                  {errors.age && <p className="text-[10px] text-red-500 font-bold">{errors.age.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">Date of Birth</label>
                  <input
                    type="date"
                    {...register('dob')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  />
                  {errors.dob && <p className="text-[10px] text-red-500 font-bold">{errors.dob.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">Gender</label>
                  <select
                    {...register('gender')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Education */}
          {activeSection === 'academic' && (
            <div className="space-y-4">
              <h3 className="font-heading text-sm md:text-base font-extrabold text-primary dark:text-white pb-2 border-b dark:border-zinc-800">
                Education details
              </h3>
              
              <div className="space-y-1 max-w-sm">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">Education Qualification</label>
                <select
                  {...register('education')}
                  className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                >
                  <option value="below 10th">Below Class X</option>
                  <option value="10th">Class X</option>
                  <option value="12th">Class XII</option>
                  <option value="undergraduate">Undergraduate Student</option>
                  <option value="graduate">Graduate Degree Holder</option>
                  <option value="post-graduate">Post-Graduate Degree Holder</option>
                </select>
              </div>
            </div>
          )}

          {/* Section 3: Financial */}
          {activeSection === 'finance' && (
            <div className="space-y-4">
              <h3 className="font-heading text-sm md:text-base font-extrabold text-primary dark:text-white pb-2 border-b dark:border-zinc-800">
                Financial Profile
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">Occupation</label>
                  <select
                    {...register('occupation')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="farmer">Farmer / Agriculturist</option>
                    <option value="student">Student / Intern</option>
                    <option value="entrepreneur">Entrepreneur / Small MSME Owner</option>
                    <option value="employee">Salaried Employee</option>
                    <option value="senior citizen">Retired Pensioner</option>
                    <option value="unemployed">Self-Unemployed</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">Annual Family Income (₹)</label>
                  <input
                    type="number"
                    step="10000"
                    {...register('income')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  />
                  {errors.income && <p className="text-[10px] text-red-500 font-bold">{errors.income.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">Is a practicing Farmer?</label>
                  <select
                    {...register('farmer')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">Own Cultivable Land?</label>
                  <select
                    {...register('land')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Location */}
          {activeSection === 'location' && (
            <div className="space-y-4">
              <h3 className="font-heading text-sm md:text-base font-extrabold text-primary dark:text-white pb-2 border-b dark:border-zinc-800">
                Location Details
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">State / Union Territory</label>
                  <input
                    type="text"
                    {...register('state')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">District</label>
                  <input
                    type="text"
                    {...register('district')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">Residence Area Type</label>
                  <select
                    {...register('land')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="rural">Rural (Village)</option>
                    <option value="urban">Urban (City / Town)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Special Categories */}
          {activeSection === 'special' && (
            <div className="space-y-4">
              <h3 className="font-heading text-sm md:text-base font-extrabold text-primary dark:text-white pb-2 border-b dark:border-zinc-800">
                Special Social Categories
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">Social Category</label>
                  <select
                    {...register('category')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="general">General (Unreserved)</option>
                    <option value="sc">Scheduled Caste (SC)</option>
                    <option value="st">Scheduled Tribe (ST)</option>
                    <option value="obc">Other Backward Classes (OBC)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">Belongs to Minority Community?</label>
                  <select
                    {...register('minority')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">Has Physical Disability?</label>
                  <select
                    {...register('disability')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">Is a Widow / Widower?</label>
                  <select
                    {...register('widow')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">Is a Military Veteran?</label>
                  <select
                    {...register('veteran')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>

              {/* Keywords & Interests */}
              <div className="space-y-4 pt-4 border-t dark:border-zinc-800">
                <h4 className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
                  Select Your Keywords & Interests (Relevance Tags)
                </h4>
                
                <div className="flex flex-wrap gap-2">
                  {[
                    'Student', 'Scholarship', 'Education', 'Stipend', 'Internship',
                    'Farmer', 'Agriculture', 'Animal Husbandry', 'Dairy Farmer',
                    'Woman', 'Women', 'Maternity', 'Widow',
                    'Scheduled Caste', 'Scheduled Tribe', 'OBC',
                    'Disabled', 'PwD', 'Artisan', 'Entrepreneur', 'Business'
                  ].map((tag, idx) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all",
                          isSelected
                            ? "bg-secondary border-secondary text-white dark:bg-sky-500 dark:border-sky-500 dark:text-zinc-950"
                            : "bg-surface-container-low border-outline-variant text-primary dark:bg-zinc-850 dark:border-zinc-800 dark:text-zinc-300 hover:bg-secondary/10 dark:hover:bg-sky-500/10"
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Tag Input */}
                <div className="space-y-1 pt-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
                    Add Custom Tags (Press Enter or click Add)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={handleAddCustomTag}
                      placeholder="e.g. Solar, Pension, Fellowship..."
                      className="flex-1 rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTagBtn}
                      className="px-4 py-2 bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 font-bold text-xs rounded-lg active:scale-95"
                    >
                      Add
                    </button>
                  </div>
                  
                  {/* Selected Tags list preview */}
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {selectedTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container/10 border border-secondary/20 text-secondary dark:bg-zinc-850 dark:border-zinc-800 dark:text-sky-400 text-[10px] font-bold"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className="text-red-500 hover:text-red-700 focus:outline-none ml-1 font-extrabold text-[12px]"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Action Submission Buttons */}
          <div className="pt-4 border-t border-outline-variant dark:border-zinc-800 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-secondary hover:bg-opacity-95 text-white dark:bg-sky-500 dark:text-zinc-950 font-bold text-xs md:text-sm rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50 focus:outline-none"
            >
              {isSubmitting ? 'Saving Profile...' : 'Save Changes'}
            </button>
          </div>

        </div>

      </form>
    </motion.div>
  );
};

export default Profile;
