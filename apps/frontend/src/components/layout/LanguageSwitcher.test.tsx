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
 * The switcher is a collapsed dropdown: one trigger plus a listbox of the three
 * locales, each labelled with its name in its own language. It is NOT a flat row of
 * EN/RW/AR buttons — an earlier version was, and these tests kept asserting that
 * shape long after it changed, so they failed for reasons that had nothing to do with
 * switching languages.
 */
describe('LanguageSwitcher', () => {
  beforeEach(() => jest.clearAllMocks());

  const trigger = () => screen.getByRole('button', { name: /change language/i });
  const listbox = () => screen.getByRole('listbox');

  it('shows the current locale on the collapsed trigger', () => {
    render(<LanguageSwitcher />);
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).toHaveAccessibleName('Change language — current: English');
    expect(within(trigger()).getByText('EN')).toBeInTheDocument();
  });

  it('points aria-controls at the listbox it opens', () => {
    render(<LanguageSwitcher />);
    expect(trigger().getAttribute('aria-controls')).toBe(listbox().id);
    expect(listbox().id).not.toBe('');
  });

  it('lists the three locales by their own names once opened', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(trigger());

    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    const options = within(listbox()).getAllByRole('option');
    expect(options.map((o) => o.textContent?.trim())).toEqual([
      '🇬🇧English',
      '🇷🇼Ikinyarwanda',
      '🇸🇦العربية',
    ]);
  });

  it('marks only the active locale as selected', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(trigger());

    const selected = within(listbox())
      .getAllByRole('option')
      .filter((o) => o.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent('English');
  });

  it('swaps the locale segment of the current path on click', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(trigger());
    fireEvent.click(within(listbox()).getByRole('option', { name: /Ikinyarwanda/ }));

    expect(mockPush).toHaveBeenCalledWith('/rw/dashboard');
  });

  it('closes after choosing a locale', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(trigger());
    fireEvent.click(within(listbox()).getByRole('option', { name: /العربية/ }));

    expect(mockPush).toHaveBeenCalledWith('/ar/dashboard');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  /**
   * Guards the fix for a real defect: the menu is always mounted and used to be hidden
   * with `opacity-0` alone, which leaves it focusable and readable by screen readers.
   * `invisible` (visibility: hidden) is what actually withdraws it.
   *
   * Asserted on the class rather than computed style because jsdom loads no Tailwind
   * stylesheet, so `toBeVisible()` cannot see the difference — the class IS the
   * behaviour here.
   */
  it('withdraws the collapsed menu from the tab order and screen readers', () => {
    render(<LanguageSwitcher />);
    expect(listbox()).toHaveClass('invisible');

    fireEvent.click(trigger());
    expect(listbox()).not.toHaveClass('invisible');
    expect(listbox()).toHaveClass('visible');
  });
});
