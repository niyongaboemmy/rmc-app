import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuestionRating } from './QuestionRating';

// Same shortcut the other component tests take: the hook is only used for labels, so map
// every key to itself rather than standing up a provider.
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const rate = jest.fn();
jest.mock('@/lib/dawahApi', () => ({
  dawahApi: { discussions: { rate: (...args: unknown[]) => rate(...args) } },
}));

beforeAll(() => {
  // jsdom has no randomUUID on older versions, and the token's content is irrelevant here.
  if (!globalThis.crypto?.randomUUID) {
    Object.defineProperty(globalThis, 'crypto', {
      value: { ...globalThis.crypto, randomUUID: () => 'test-token-0000-1111-2222' },
      configurable: true,
    });
  }
});

beforeEach(() => {
  rate.mockReset().mockResolvedValue({ recorded: true });
  localStorage.clear();
});

// The two editorial strings now arrive as props; the server page resolves them from the
// CMS. Fixed stand-ins here so a copy change cannot break these tests.
const COPY = { prompt: 'Was this helpful?', thanks: 'Thanks!' };

const yes = () => screen.getByRole('button', { name: /rating\.yes/ });
const no = () => screen.getByRole('button', { name: /rating\.no/ });

describe('QuestionRating', () => {
  it('asks the question with both answers', () => {
    render(<QuestionRating slug="wudu" copy={COPY} />);
    expect(screen.getByText(COPY.prompt)).toBeInTheDocument();
    expect(yes()).toBeInTheDocument();
    expect(no()).toBeInTheDocument();
  });

  /**
   * Which button means which. The client is mocked here, so this pins the WIDGET's half of
   * the contract only — that Yes reaches the API layer as true and No as false. The
   * translation of that boolean into the wire's 'yes'/'no' is dawahApi's, and is pinned
   * separately in dawahApi.rate.test.ts.
   */
  it('sends true for yes and false for no', async () => {
    const { unmount } = render(<QuestionRating slug="wudu" copy={COPY} />);
    fireEvent.click(yes());
    await waitFor(() => expect(rate).toHaveBeenCalled());
    expect(rate.mock.calls[0][0]).toBe('wudu');
    expect(rate.mock.calls[0][1]).toBe(true);
    unmount();

    localStorage.clear();
    rate.mockClear();
    render(<QuestionRating slug="wudu" copy={COPY} />);
    fireEvent.click(no());
    await waitFor(() => expect(rate).toHaveBeenCalled());
    expect(rate.mock.calls[0][1]).toBe(false);
  });

  it('thanks the reader once the rating lands', async () => {
    render(<QuestionRating slug="wudu" copy={COPY} />);
    fireEvent.click(yes());
    expect(await screen.findByText(COPY.thanks)).toBeInTheDocument();
    expect(screen.queryByText(COPY.prompt)).not.toBeInTheDocument();
  });

  it('reuses one token across entries, so a reader is one voter everywhere', async () => {
    const { unmount } = render(<QuestionRating slug="wudu" copy={COPY} />);
    fireEvent.click(yes());
    await waitFor(() => expect(rate).toHaveBeenCalled());
    const first = rate.mock.calls[0][2];
    unmount();

    rate.mockClear();
    render(<QuestionRating slug="zakat" copy={COPY} />);
    fireEvent.click(yes());
    await waitFor(() => expect(rate).toHaveBeenCalled());
    expect(rate.mock.calls[0][2]).toBe(first);
  });

  it('remembers a prior rating for the same entry, and only that entry', async () => {
    const { unmount } = render(<QuestionRating slug="wudu" copy={COPY} />);
    fireEvent.click(yes());
    await screen.findByText(COPY.thanks);
    unmount();

    render(<QuestionRating slug="wudu" copy={COPY} />);
    expect(await screen.findByText(COPY.thanks)).toBeInTheDocument();
    unmount();

    // A different entry is a fresh question, not a settled one.
    render(<QuestionRating slug="zakat" copy={COPY} />);
    expect(screen.getByText(COPY.prompt)).toBeInTheDocument();
  });

  it('says so when the rating fails instead of thanking the reader', async () => {
    rate.mockRejectedValue(new Error('network'));
    render(<QuestionRating slug="wudu" copy={COPY} />);
    fireEvent.click(yes());
    expect(await screen.findByText('discussions.rating.failed')).toBeInTheDocument();
    expect(screen.queryByText(COPY.thanks)).not.toBeInTheDocument();
    // Still ratable — the reader can try again.
    expect(yes()).toBeEnabled();
  });
});
