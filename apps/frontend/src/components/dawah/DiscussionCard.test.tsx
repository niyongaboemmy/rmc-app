import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Same shortcut the other component tests take: the hook is only used for labels.
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
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

  // The reading content is a link; the actions beside it are buttons and a separate
  // link, so this names the one it means rather than assuming the card has only one.
  it('links the title to the entry, which is where the answer lives', () => {
    render(<DiscussionCard question={item()} locale="en" />);

    expect(
      screen.getByRole('link', { name: /Can I combine prayers when travelling\?/ }),
    ).toHaveAttribute('href', '/en/dawah/discussions/combining-prayers-when-travelling');
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

  // The curated panel is a column of titles to pick from, not a feed to read: at that
  // width three lines of summary per row turns eight entries into a page of scrolling.
  describe('compact', () => {
    it('drops the summary', () => {
      render(<DiscussionCard question={item()} locale="en" compact />);

      expect(
        screen.queryByText('Yes — a traveller may combine Dhuhr with Asr, and Maghrib with Isha.'),
      ).not.toBeInTheDocument();
    });

    it('keeps the title and the link — it is still how you reach the entry', () => {
      render(<DiscussionCard question={item()} locale="en" compact />);

      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
        'Can I combine prayers when travelling?',
      );
      expect(
        screen.getByRole('link', { name: /Can I combine prayers when travelling\?/ }),
      ).toHaveAttribute('href', '/en/dawah/discussions/combining-prayers-when-travelling');
    });

    it('still shows the summary when not compact', () => {
      render(<DiscussionCard question={item()} locale="en" />);

      expect(
        screen.getByText('Yes — a traveller may combine Dhuhr with Asr, and Maghrib with Isha.'),
      ).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    // A card cannot meaningfully print itself out of a list — the reader wants the
    // answer, which is not on this row. Download opens the entry and prints THAT.
    it('links Download to the entry with the print flag', () => {
      render(<DiscussionCard question={item()} locale="en" />);

      const download = screen.getByRole('link', { name: /discussions.download/ });
      expect(download).toHaveAttribute(
        'href',
        '/en/dawah/discussions/combining-prayers-when-travelling?print=1',
      );
    });

    // navigator.share exists on phones and almost nowhere on the desktop, so the
    // clipboard is the common path rather than the exception.
    it('copies an ABSOLUTE url when there is no share sheet', async () => {
      const writeText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

      render(<DiscussionCard question={item()} locale="en" />);
      fireEvent.click(screen.getByRole('button', { name: /discussions.share/ }));

      await waitFor(() =>
        expect(writeText).toHaveBeenCalledWith(
          `${window.location.origin}/en/dawah/discussions/combining-prayers-when-travelling`,
        ),
      );
    });

    it('confirms the copy, so the click is not silent', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: jest.fn().mockResolvedValue(undefined) },
        configurable: true,
      });

      render(<DiscussionCard question={item()} locale="en" />);
      fireEvent.click(screen.getByRole('button', { name: /discussions.share/ }));

      await waitFor(() => expect(screen.getByText('discussions.linkCopied')).toBeInTheDocument());
    });

    it('prefers the native share sheet where there is one', async () => {
      const nativeShare = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', { value: nativeShare, configurable: true });
      const writeText = jest.fn();
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

      render(<DiscussionCard question={item()} locale="en" />);
      fireEvent.click(screen.getByRole('button', { name: /discussions.share/ }));

      await waitFor(() => expect(nativeShare).toHaveBeenCalled());
      expect(writeText).not.toHaveBeenCalled();
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    });

    // A dismissed share sheet rejects. That is a reader changing their mind, not an
    // error to surface.
    it('stays quiet when the share is dismissed', async () => {
      Object.defineProperty(navigator, 'share', {
        value: jest.fn().mockRejectedValue(new Error('AbortError')),
        configurable: true,
      });

      render(<DiscussionCard question={item()} locale="en" />);
      fireEvent.click(screen.getByRole('button', { name: /discussions.share/ }));

      await waitFor(() =>
        expect(screen.queryByText('discussions.linkCopied')).not.toBeInTheDocument(),
      );
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    });
  });

  // On the Most-Read panel the count is the reason the row is there — it is what the
  // ordering claims, so showing it lets a reader check the claim.
  describe('view count', () => {
    it('shows the count, grouped for the locale', () => {
      render(<DiscussionCard question={item({ viewCount: 2981255 })} locale="en" showViews />);

      expect(screen.getByText('2,981,255')).toBeInTheDocument();
    });

    it('is absent by default, so the feed does not read as a ranking', () => {
      render(<DiscussionCard question={item({ viewCount: 2981255 })} locale="en" showDate />);

      expect(screen.queryByText('2,981,255')).not.toBeInTheDocument();
    });

    // One or the other: two numbers in the same corner is a row that has to be read
    // twice to find out which is which.
    it('replaces the date rather than sitting beside it', () => {
      render(
        <DiscussionCard question={item({ viewCount: 12 })} locale="en" showViews showDate />,
      );

      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.queryByText('01/06/2026')).not.toBeInTheDocument();
    });
  });
});
