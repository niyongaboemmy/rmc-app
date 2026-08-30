import { render, screen } from '@testing-library/react';
import { DiscussionCard } from './DiscussionCard';
import type { DiscussionListItem } from '@/lib/dawahApi';

/**
 * The listing row.
 *
 * What these pin down is mostly what is ABSENT. The row used to strip the tags off
 * `answerHtml` and cut at 180 characters, which meant the list endpoint had to return
 * every full answer in order to show a fragment of each. It now renders an authored
 * `summary`, and the row has no access to the answer at all — a regression that put the
 * answers back would be a payload problem long before it was a visible one, so it is
 * worth a test that fails rather than a comment that asks nicely.
 */
const item = (over: Partial<DiscussionListItem> = {}): DiscussionListItem => ({
  id: 'q-1',
  slug: 'combining-prayers-when-travelling',
  title: 'Can I combine prayers when travelling?',
  summary: 'Yes — a traveller may combine Dhuhr with Asr, and Maghrib with Isha.',
  language: 'en',
  category: null,
  answeredBy: null,
  answeredAt: null,
  viewCount: 0,
  publishedAt: '2026-06-01T00:00:00.000Z',
  createdAt: '2026-06-01T00:00:00.000Z',
  ...over,
});

describe('DiscussionCard', () => {
  it('shows the summary, not a truncated answer', () => {
    render(<DiscussionCard question={item()} locale="en" />);

    expect(
      screen.getByText('Yes — a traveller may combine Dhuhr with Asr, and Maghrib with Isha.'),
    ).toBeInTheDocument();
  });

  it('links the whole row to the entry, which is where the answer lives', () => {
    render(<DiscussionCard question={item()} locale="en" />);

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/en/dawah/discussions/combining-prayers-when-travelling',
    );
  });

  // An Arabic entry in the English listing is still Arabic. Getting this wrong puts the
  // punctuation on the wrong side and reads as a rendering bug to the one person who can
  // actually read it.
  it('takes direction from the ENTRY language, not the page locale', () => {
    render(<DiscussionCard question={item({ language: 'ar' })} locale="en" />);

    expect(screen.getByRole('heading', { level: 3 })).toHaveAttribute('dir', 'rtl');
  });

  // Badging every row "English" on the English page is noise, not signal.
  it('badges the language only when it differs from the page', () => {
    const { rerender } = render(<DiscussionCard question={item()} locale="en" />);
    expect(screen.queryByText('English')).not.toBeInTheDocument();

    rerender(<DiscussionCard question={item({ language: 'ar' })} locale="en" />);
    expect(screen.getByText('العربية')).toBeInTheDocument();
  });
});
