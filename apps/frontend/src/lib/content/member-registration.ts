import { tri, type Tri } from './client';
import { unmergedList, type BoardLevel } from './service-boards';

/**
 * Copy and options for the member registration form.
 *
 * Currently just the education levels, which were a `z.enum` in the page and a
 * hardcoded array beside it. Two problems with that, and the second is the one
 * that matters:
 *
 *   - RMC could not add a level without a deploy.
 *   - the labels were produced by title-casing the key, so the form offered
 *     "Bachelors" and "Phd" in every language. The registration page is
 *     translated; this one control was not, and could not be, because there was
 *     no text to translate — only an identifier being displayed.
 *
 * Levels are `{ id, label }` for the same reason the scholarship ones are: the
 * id is what `member_profiles.education_level` stores, so it is generated once
 * and never derived from the label. Renaming "Bachelors" to "Bachelor's degree"
 * must not re-point the members who chose it.
 */
export interface MemberRegistrationContent {
  educationLevels: BoardLevel[];
}

export const MEMBER_REGISTRATION_DEFAULT: MemberRegistrationContent = {
  /**
   * The six ids are exactly the strings the old `z.enum` accepted, so any
   * profile already carrying one keeps its meaning. The labels are new: there
   * were none before, only a title-cased key.
   */
  educationLevels: [
    { id: 'primary', label: tri('Primary', 'Amashuri abanza', 'التعليم الابتدائي') },
    { id: 'secondary', label: tri('Secondary', 'Amashuri yisumbuye', 'التعليم الثانوي') },
    { id: 'bachelors', label: tri("Bachelor's degree", 'Impamyabumenyi ya Bakalorea', 'بكالوريوس') },
    { id: 'masters', label: tri("Master's degree", 'Impamyabumenyi ya Masters', 'ماجستير') },
    { id: 'phd', label: tri('Doctorate (PhD)', 'Impamyabumenyi ya Dogitora', 'دكتوراه') },
    { id: 'other', label: tri('Other', 'Ibindi', 'أخرى') },
  ],
};

/**
 * The levels an admin has saved, or the seeded six when the section has never
 * been edited. Unmerged: merging by index would hand a deleted level's
 * Kinyarwanda label to whichever level slid into its place.
 */
export function memberEducationLevels(saved: unknown): BoardLevel[] {
  return unmergedList(
    (saved as MemberRegistrationContent | null)?.educationLevels,
    MEMBER_REGISTRATION_DEFAULT.educationLevels,
    'edu',
    (item, id) => ({ id, label: (item?.label as Tri) ?? tri('') }),
  );
}
