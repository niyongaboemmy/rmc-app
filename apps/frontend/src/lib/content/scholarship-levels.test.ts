import {
  SCHOLARSHIP_SERVICE_DEFAULT,
  boardLevels,
  levelLabel,
  type ScholarshipServiceContent,
} from './service-boards';
import { tri } from './client';

/**
 * Education levels moved from a hardcoded enum into CMS content, which means a
 * programme row now stores a key whose meaning lives in a blob an admin edits.
 * Two things have to hold for that to be safe, and neither fails loudly:
 *
 *   - the seeded ids must stay EXACTLY `secondary`, `tvet` and `university`,
 *     because those strings are already in `scholarship_programs.level`. Change
 *     one and every existing programme silently loses its level.
 *   - a key whose level has been deleted must resolve to nothing, not to itself.
 *     Falling back to the raw key would print `lvl1757012345678` on a public
 *     page.
 */
describe('scholarship levels as CMS content', () => {
  describe('the seeded three', () => {
    // This is the whole reason no data migration was needed.
    it('keeps the ids that are already stored on programme rows', () => {
      expect(SCHOLARSHIP_SERVICE_DEFAULT.levels.map((l) => l.id)).toEqual([
        'secondary',
        'tvet',
        'university',
      ]);
    });

    it('gives each one a label in all three languages', () => {
      for (const level of SCHOLARSHIP_SERVICE_DEFAULT.levels) {
        expect(level.label.en.trim()).not.toBe('');
        expect(level.label.rw.trim()).not.toBe('');
        expect(level.label.ar.trim()).not.toBe('');
      }
    });
  });

  describe('boardLevels', () => {
    it('falls back to the seed when the section has never been saved', () => {
      expect(boardLevels(null, SCHOLARSHIP_SERVICE_DEFAULT)).toEqual(
        SCHOLARSHIP_SERVICE_DEFAULT.levels,
      );
    });

    it('falls back to the seed when the blob holds something malformed', () => {
      expect(boardLevels({ levels: 'not an array' }, SCHOLARSHIP_SERVICE_DEFAULT)).toEqual(
        SCHOLARSHIP_SERVICE_DEFAULT.levels,
      );
    });

    /**
     * The unmerged rule. Merging by index would hand a deleted level's
     * Kinyarwanda label to whichever level slid into its position — the exact
     * trap `unmergedList` exists for.
     */
    it('takes a saved list exactly as saved, rather than merging it with the seed', () => {
      const saved = {
        levels: [{ id: 'university', label: tri('Uni', 'Kaminuza', 'جامعة') }],
      } as unknown as ScholarshipServiceContent;

      const result = boardLevels(saved, SCHOLARSHIP_SERVICE_DEFAULT);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('university');
      expect(result[0].label.en).toBe('Uni');
    });

    // An admin who removes every level gets an empty dropdown, not the seed back.
    it('respects an empty list rather than reseeding it', () => {
      expect(boardLevels({ levels: [] }, SCHOLARSHIP_SERVICE_DEFAULT)).toEqual([]);
    });

    it('survives an entry with no label', () => {
      const result = boardLevels({ levels: [{ id: 'x' }] }, SCHOLARSHIP_SERVICE_DEFAULT);

      expect(result[0]).toEqual({ id: 'x', label: tri('') });
    });
  });

  describe('levelLabel', () => {
    const levels = SCHOLARSHIP_SERVICE_DEFAULT.levels;

    it('finds the label for a stored key', () => {
      expect(levelLabel(levels, 'secondary')?.en).toBe('Secondary School');
    });

    /**
     * The case that keeps debris off the public page. A programme pointing at a
     * level an admin deleted renders no chip at all — callers test for null.
     */
    it('returns null for a level that no longer exists', () => {
      expect(levelLabel(levels, 'lvl1757012345678')).toBeNull();
    });

    it('returns null for a programme with no level set', () => {
      expect(levelLabel(levels, null)).toBeNull();
      expect(levelLabel(levels, undefined)).toBeNull();
      expect(levelLabel(levels, '')).toBeNull();
    });

    it('returns null when every level has been deleted', () => {
      expect(levelLabel([], 'secondary')).toBeNull();
    });

    // Keys are matched literally: `Secondary` is not `secondary`.
    it('does not match a key by case', () => {
      expect(levelLabel(levels, 'Secondary')).toBeNull();
    });
  });
});
