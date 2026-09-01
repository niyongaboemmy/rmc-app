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
const COPY = {
  prompt: 'Was this helpful?',
  thanks: 'Thanks!',
  suggestPrompt: 'Any suggestions?',
  reasonPrompt: 'Tell us why.',
  // One per line, as the CMS stores it.
  reasons: 'Not clear\nDoes not answer my question\nSomething else',
};

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

  // The verdict is recorded on the click and the widget then ASKS WHY, rather than
  // closing. A reader who stops here has still told RMC the thing it most needed.
  it('opens the suggestion form after yes, not a thank-you', async () => {
    render(<QuestionRating slug="wudu" copy={COPY} />);
    fireEvent.click(yes());

    expect(await screen.findByText(COPY.suggestPrompt)).toBeInTheDocument();
    expect(screen.queryByText(COPY.thanks)).not.toBeInTheDocument();
  });

  it('offers the reasons after no, from the list the CMS supplied', async () => {
    render(<QuestionRating slug="wudu" copy={COPY} />);
    fireEvent.click(no());

    expect(await screen.findByText(COPY.reasonPrompt)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Not clear' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Does not answer my question' }),
    ).toBeInTheDocument();
    // The suggestion form belongs to the other answer.
    expect(screen.queryByText(COPY.suggestPrompt)).not.toBeInTheDocument();
  });

  it('thanks the reader once the follow-up is sent', async () => {
    render(<QuestionRating slug="wudu" copy={COPY} />);
    fireEvent.click(yes());
    await screen.findByText(COPY.suggestPrompt);

    fireEvent.click(screen.getByRole('button', { name: /discussions.rating.send/ }));

    expect(await screen.findByText(COPY.thanks)).toBeInTheDocument();
  });

  // The second call carries the same verdict plus the detail, so the server's upsert
  // attaches it to the row the first call wrote rather than creating another.
  it('sends the suggestion and email against the same verdict', async () => {
    render(<QuestionRating slug="wudu" copy={COPY} />);
    fireEvent.click(yes());
    await screen.findByText(COPY.suggestPrompt);

    fireEvent.change(screen.getByLabelText('discussions.rating.commentLabel'), {
      target: { value: 'Add the evidence' },
    });
    fireEvent.change(screen.getByLabelText('discussions.rating.emailLabel'), {
      target: { value: 'reader@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /discussions.rating.send/ }));

    await waitFor(() => expect(rate).toHaveBeenCalledTimes(2));
    expect(rate.mock.calls[1][1]).toBe(true);
    expect(rate.mock.calls[1][3]).toMatchObject({
      comment: 'Add the evidence',
      email: 'reader@example.com',
    });
  });

  it('sends the chosen reason after no', async () => {
    render(<QuestionRating slug="wudu" copy={COPY} />);
    fireEvent.click(no());
    await screen.findByText(COPY.reasonPrompt);

    fireEvent.change(screen.getByLabelText('discussions.rating.reasonLabel'), {
      target: { value: 'Not clear' },
    });
    fireEvent.click(screen.getByRole('button', { name: /discussions.rating.send/ }));

    await waitFor(() => expect(rate).toHaveBeenCalledTimes(2));
    expect(rate.mock.calls[1][1]).toBe(false);
    expect(rate.mock.calls[1][3]).toMatchObject({ reason: 'Not clear' });
  });

  // Nothing to send is not an error; it is a button that would post an empty message.
  it('cannot send an empty reason', async () => {
    render(<QuestionRating slug="wudu" copy={COPY} />);
    fireEvent.click(no());
    await screen.findByText(COPY.reasonPrompt);

    expect(screen.getByRole('button', { name: /discussions.rating.send/ })).toBeDisabled();
  });

  // Changing sides must not carry the other form's answer across.
  it('clears what was typed when the verdict is switched', async () => {
    render(<QuestionRating slug="wudu" copy={COPY} />);
    fireEvent.click(no());
    await screen.findByText(COPY.reasonPrompt);
    fireEvent.change(screen.getByLabelText('discussions.rating.reasonLabel'), {
      target: { value: 'Not clear' },
    });

    fireEvent.click(yes());
    await screen.findByText(COPY.suggestPrompt);
    fireEvent.click(screen.getByRole('button', { name: /discussions.rating.send/ }));

    await waitFor(() => expect(rate).toHaveBeenCalledTimes(3));
    expect(rate.mock.calls[2][3]).not.toMatchObject({ reason: 'Not clear' });
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
    await screen.findByText(COPY.suggestPrompt);
    fireEvent.click(screen.getByRole('button', { name: /discussions.rating.send/ }));
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
