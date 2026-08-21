import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LanguageSwitcher } from './LanguageSwitcher';

const mockPush = jest.fn();
const mockPathname = '/en/dashboard';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  useParams: () => ({ locale: 'en' }),
}));

/**
 * The switcher is a menu button: a trigger plus a menu of the three locales, each
 * labelled in its own language and marked with `aria-checked`. It is NOT a flat row
 * of EN/RW/AR buttons — an earlier version was, and these tests kept asserting that
 * shape long after it changed, so they failed for reasons unrelated to switching
 * languages.
 */
describe('LanguageSwitcher', () => {
  beforeEach(() => jest.clearAllMocks());

  const trigger = () => screen.getByRole('button', { name: /change language/i });
  const menu = () => screen.getByRole('menu');
  const items = () => within(menu()).getAllByRole('menuitemradio');
  const itemNamed = (name: RegExp) => within(menu()).getByRole('menuitemradio', { name });
  /** The visual card; it carries the open/closed classes, the menu is nested inside. */
  const panel = () => menu().parentElement as HTMLElement;

  describe('collapsed', () => {
    it('shows the current locale on the trigger', () => {
      render(<LanguageSwitcher />);
      expect(trigger()).toHaveAttribute('aria-expanded', 'false');
      expect(trigger()).toHaveAccessibleName('Change language — current: English');
      expect(within(trigger()).getByText('EN')).toBeInTheDocument();
    });

    it('declares the menu it controls', () => {
      render(<LanguageSwitcher />);
      expect(trigger()).toHaveAttribute('aria-haspopup', 'menu');
      expect(trigger().getAttribute('aria-controls')).toBe(menu().id);
      expect(menu().id).not.toBe('');
    });

    /**
     * Guards a real defect: the menu is always mounted and used to be hidden with
     * `opacity-0` alone, which leaves it focusable and readable by screen readers.
     * `invisible` (visibility: hidden) is what actually withdraws it.
     *
     * Asserted on the class rather than computed style because jsdom loads no Tailwind
     * stylesheet, so `toBeVisible()` cannot see the difference — the class IS the
     * behaviour here.
     */
    it('is withdrawn from the tab order and screen readers', () => {
      render(<LanguageSwitcher />);
      expect(panel()).toHaveClass('invisible');
    });
  });

  describe('opened', () => {
    it('lists the three locales by their own names', () => {
      render(<LanguageSwitcher />);
      fireEvent.click(trigger());

      expect(trigger()).toHaveAttribute('aria-expanded', 'true');
      expect(panel()).not.toHaveClass('invisible');
      expect(items().map((i) => i.textContent?.trim())).toEqual([
        '🇬🇧English',
        '🇷🇼Ikinyarwanda',
        '🇸🇦العربية',
      ]);
    });

    it('labels the menu by its heading', () => {
      render(<LanguageSwitcher />);
      fireEvent.click(trigger());
      expect(menu()).toHaveAccessibleName('Language');
    });

    it('checks only the active locale', () => {
      render(<LanguageSwitcher />);
      fireEvent.click(trigger());

      const checked = items().filter((i) => i.getAttribute('aria-checked') === 'true');
      expect(checked).toHaveLength(1);
      expect(checked[0]).toHaveTextContent('English');
    });

    it('moves focus onto the current language', () => {
      render(<LanguageSwitcher />);
      fireEvent.click(trigger());
      expect(itemNamed(/English/)).toHaveFocus();
    });

    it('keeps the items out of the tab sequence', () => {
      render(<LanguageSwitcher />);
      fireEvent.click(trigger());
      items().forEach((i) => expect(i).toHaveAttribute('tabindex', '-1'));
    });
  });

  describe('choosing a language', () => {
    it('swaps the locale segment of the current path', () => {
      render(<LanguageSwitcher />);
      fireEvent.click(trigger());
      fireEvent.click(itemNamed(/Ikinyarwanda/));

      expect(mockPush).toHaveBeenCalledWith('/rw/dashboard');
    });

    it('closes and returns focus to the trigger', () => {
      render(<LanguageSwitcher />);
      fireEvent.click(trigger());
      fireEvent.click(itemNamed(/العربية/));

      expect(mockPush).toHaveBeenCalledWith('/ar/dashboard');
      expect(trigger()).toHaveAttribute('aria-expanded', 'false');
      expect(trigger()).toHaveFocus();
    });
  });

  /**
   * The menu-button keyboard contract. The roles promise arrow-key navigation, so
   * these are what stop the markup announcing a widget it does not implement.
   */
  describe('keyboard', () => {
    it('opens on ArrowDown at the current language', () => {
      render(<LanguageSwitcher />);
      fireEvent.keyDown(trigger(), { key: 'ArrowDown' });

      expect(trigger()).toHaveAttribute('aria-expanded', 'true');
      expect(itemNamed(/English/)).toHaveFocus();
    });

    it('opens on ArrowUp at the last language', () => {
      render(<LanguageSwitcher />);
      fireEvent.keyDown(trigger(), { key: 'ArrowUp' });

      expect(trigger()).toHaveAttribute('aria-expanded', 'true');
      expect(itemNamed(/العربية/)).toHaveFocus();
    });

    it('walks the items with the arrow keys, wrapping at both ends', () => {
      render(<LanguageSwitcher />);
      fireEvent.click(trigger());

      fireEvent.keyDown(menu(), { key: 'ArrowDown' });
      expect(itemNamed(/Ikinyarwanda/)).toHaveFocus();

      fireEvent.keyDown(menu(), { key: 'ArrowDown' });
      expect(itemNamed(/العربية/)).toHaveFocus();

      fireEvent.keyDown(menu(), { key: 'ArrowDown' }); // wraps forward
      expect(itemNamed(/English/)).toHaveFocus();

      fireEvent.keyDown(menu(), { key: 'ArrowUp' }); // wraps backward
      expect(itemNamed(/العربية/)).toHaveFocus();
    });

    it('jumps to the ends with Home and End', () => {
      render(<LanguageSwitcher />);
      fireEvent.click(trigger());

      fireEvent.keyDown(menu(), { key: 'End' });
      expect(itemNamed(/العربية/)).toHaveFocus();

      fireEvent.keyDown(menu(), { key: 'Home' });
      expect(itemNamed(/English/)).toHaveFocus();
    });

    it('closes on Escape and returns focus to the trigger', () => {
      render(<LanguageSwitcher />);
      fireEvent.click(trigger());
      expect(trigger()).toHaveAttribute('aria-expanded', 'true');

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(trigger()).toHaveAttribute('aria-expanded', 'false');
      expect(trigger()).toHaveFocus();
    });

    it('closes on Tab without stealing focus back', () => {
      render(<LanguageSwitcher />);
      fireEvent.click(trigger());
      fireEvent.keyDown(menu(), { key: 'Tab' });

      expect(trigger()).toHaveAttribute('aria-expanded', 'false');
      expect(trigger()).not.toHaveFocus();
    });
  });
});
