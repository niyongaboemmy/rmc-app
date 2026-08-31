import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EntryEditor } from './EntryEditor';

// Same shortcut the other component tests take: the hook is only used for labels, so map
// every key to itself rather than standing up a provider.
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
jest.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'en' }),
}));

// The rich editor pulls in TipTap, which needs a real DOM range implementation jsdom
// does not provide. It is not what these cases are about.
jest.mock('@/components/ui/RichTextEditor', () => ({
  RichTextEditor: () => <div data-testid="rich-editor" />,
}));
jest.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ success: jest.fn(), error: jest.fn() }),
}));

const entry = jest.fn();
const nextEntryNumber = jest.fn();
jest.mock('@/lib/dawahApi', () => ({
  serverMessage: () => null,
  dawahApi: {
    categories: () => Promise.resolve([]),
    discussions: { preview: () => Promise.resolve({ html: '' }) },
    admin: {
      discussions: {
        entry: (...a: unknown[]) => entry(...a),
        nextEntryNumber: () => nextEntryNumber(),
      },
    },
  },
}));

const existing = (over: Record<string, unknown> = {}) => ({
  id: 'q-1',
  slug: 'a-question',
  entryNumber: 7,
  isEssential: false,
  title: 'A question long enough to pass',
  body: '',
  summary: null,
  answerBody: 'An answer',
  language: 'en',
  status: 'published',
  categoryId: null,
  author: null,
  answeredBy: null,
  answeredAt: null,
  publishedAt: null,
  ...over,
});

beforeEach(() => {
  entry.mockReset().mockResolvedValue(existing());
  nextEntryNumber.mockReset().mockResolvedValue({ nextEntryNumber: 18 });
});

/**
 * The question-detail field, and when it is shown.
 *
 * This exists because the behaviour regressed once and nothing noticed: a later commit
 * reverted it while every test stayed green, because there were no tests. Both fields
 * were labelled "Question" — the title and a body textarea — and on an admin-authored
 * entry the title IS the question, so the second box only invited it to be typed twice.
 */
describe('EntryEditor question detail', () => {
  it('is absent when composing a new entry', async () => {
    render(<EntryEditor entryId={null} onClose={jest.fn()} onSaved={jest.fn()} />);

    await waitFor(() => expect(screen.getByTestId('rich-editor')).toBeInTheDocument());
    expect(screen.queryByText('discussions.admin.questionLabel')).not.toBeInTheDocument();
  });

  // A member's submission, where the asker explained their situation. That text has to
  // stay correctable rather than becoming unreachable.
  it('is shown for an entry that already has detail', async () => {
    entry.mockResolvedValue(existing({ body: 'The asker explained their situation' }));

    render(<EntryEditor entryId="q-1" onClose={jest.fn()} onSaved={jest.fn()} />);

    await waitFor(() =>
      expect(screen.getByText('discussions.admin.questionLabel')).toBeInTheDocument(),
    );
  });

  it('is absent for an existing entry that has none', async () => {
    render(<EntryEditor entryId="q-1" onClose={jest.fn()} onSaved={jest.fn()} />);

    await waitFor(() => expect(screen.getByTestId('rich-editor')).toBeInTheDocument());
    expect(screen.queryByText('discussions.admin.questionLabel')).not.toBeInTheDocument();
  });
});

describe('EntryEditor entry number', () => {
  it('previews the next number when composing', async () => {
    render(<EntryEditor entryId={null} onClose={jest.fn()} onSaved={jest.fn()} />);

    await waitFor(() => expect(nextEntryNumber).toHaveBeenCalled());
  });

  // A display field failing to load must not stop an admin writing an entry.
  it('renders anyway when the number cannot be fetched', async () => {
    nextEntryNumber.mockRejectedValue(new Error('offline'));

    render(<EntryEditor entryId={null} onClose={jest.fn()} onSaved={jest.fn()} />);

    await waitFor(() => expect(screen.getByTestId('rich-editor')).toBeInTheDocument());
  });
});
