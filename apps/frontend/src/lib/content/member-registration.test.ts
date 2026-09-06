import { MEMBER_REGISTRATION_DEFAULT, memberEducationLevels } from './member-registration';
import { tri } from './client';

/**
 * The member registration form's education levels, moved out of a `z.enum` in
 * the page and into CMS content.
 *
 * Same two invariants as the scholarship levels, and they fail just as quietly:
 *
 *   - the seeded ids must stay exactly what the old enum accepted, or a profile
 *     already carrying one loses its meaning.
 *   - the list an admin saved must be taken as saved. `mergeContent` merges
 *     arrays by INDEX, so a deleted level would come back wearing the labels of
 *     whichever level moved into its position — which is why this reads through
 *     `unmergedList` rather than the usual merge.
 */
describe('member education levels', () => {
  describe('the seeded six', () => {
    // These are the exact strings the removed z.enum accepted.
    it('keeps the ids the old enum accepted', () => {
      expect(MEMBER_REGISTRATION_DEFAULT.educationLevels.map((l) => l.id)).toEqual([
        'primary',
        'secondary',
        'bachelors',
        'masters',
        'phd',
        'other',
      ]);
    });

    /**
     * The labels are the point of the change. Before this the form title-cased
     * the key, so it read "Bachelors" and "Phd" in Kinyarwanda and Arabic too.
     */
    it('gives each one a real label in all three languages', () => {
      for (const level of MEMBER_REGISTRATION_DEFAULT.educationLevels) {
        expect(level.label.en.trim()).not.toBe('');
        expect(level.label.rw.trim()).not.toBe('');
        expect(level.label.ar.trim()).not.toBe('');
      }
    });

    /**
     * The seed is where the translations actually come from, and the easy way to
     * get this wrong is to fill all three columns with English and move on —
     * which would reproduce the exact bug being fixed, just one layer down.
     *
     * Checked as "differs from English" rather than "looks like Kinyarwanda",
     * which is not something a test can judge.
     */
    it('translates each label rather than repeating the English', () => {
      for (const level of MEMBER_REGISTRATION_DEFAULT.educationLevels) {
        expect(level.label.rw).not.toBe(level.label.en);
        expect(level.label.ar).not.toBe(level.label.en);
      }
    });

    it('writes the Arabic labels in Arabic script', () => {
      for (const level of MEMBER_REGISTRATION_DEFAULT.educationLevels) {
        expect(level.label.ar).toMatch(/[\u0600-\u06FF]/);
      }
    });
  });

  describe('memberEducationLevels', () => {
    it('falls back to the seed when the section has never been saved', () => {
      expect(memberEducationLevels(null)).toEqual(MEMBER_REGISTRATION_DEFAULT.educationLevels);
      expect(memberEducationLevels(undefined)).toEqual(
        MEMBER_REGISTRATION_DEFAULT.educationLevels,
      );
    });

    it('falls back to the seed when the blob holds something malformed', () => {
      expect(memberEducationLevels({ educationLevels: 'nope' })).toEqual(
        MEMBER_REGISTRATION_DEFAULT.educationLevels,
      );
    });

    it('takes a saved list exactly as saved', () => {
      const saved = {
        educationLevels: [
          { id: 'phd', label: tri('Doctorate', 'Dogitora', 'دكتوراه') },
          { id: 'edu1757000000000', label: tri('Apprenticeship', '', '') },
        ],
      };

      const result = memberEducationLevels(saved);

      expect(result.map((l) => l.id)).toEqual(['phd', 'edu1757000000000']);
      expect(result[1].label.en).toBe('Apprenticeship');
    });

    // An admin who clears the list gets an empty dropdown, not the seed back.
    it('respects an empty list rather than reseeding it', () => {
      expect(memberEducationLevels({ educationLevels: [] })).toEqual([]);
    });

    it('survives an entry with no label', () => {
      expect(memberEducationLevels({ educationLevels: [{ id: 'x' }] })).toEqual([
        { id: 'x', label: tri('') },
      ]);
    });
  });
});
