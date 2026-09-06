import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScholarshipProgramsTab } from './ScholarshipProgramsTab';

jest.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'en' }),
}));

// TipTap needs a real DOM range implementation jsdom does not provide, and none
// of this is about the editor — it only opens inside the create/edit modal.
jest.mock('@/components/ui/RichTextEditor', () => ({
  RichTextEditor: () => <div data-testid="rich-editor" />,
}));

const listPrograms = jest.fn();
const publishProgram = jest.fn();
const closeProgram = jest.fn();
jest.mock('@/lib/scholarshipAdminApi', () => ({
  scholarshipAdminApi: {
    listPrograms: () => listPrograms(),
    publishProgram: (id: string) => publishProgram(id),
    closeProgram: (id: string) => closeProgram(id),
    deleteProgram: jest.fn(),
  },
}));

// The levels come from the CMS; the seeded defaults are enough here.
jest.mock('@/lib/content-api', () => ({
  ContentKeys: { scholarshipService: 'scholarship-service' },
  getSiteContent: () => Promise.resolve(null),
  SCHOLARSHIP_SERVICE_DEFAULT: { levels: [] },
}));
jest.mock('@/lib/content/service-boards', () => ({
  boardLevels: () => [],
}));

const program = (over: Record<string, unknown> = {}) => ({
  id: 'p-1',
  title: 'S4 bursary',
  description: '<p>x</p>',
  slug: 's4-bursary',
  status: 'draft',
  level: null,
  slots: null,
  deadline: null,
  opensAt: null,
  referenceNumber: 'RMC-SCHP-2609-0001',
  requiredDocuments: [],
  attachments: [],
  titleI18n: null,
  descriptionI18n: null,
  isOpen: false,
  ...over,
});

/** The row's action cell, found via the title it is the only row for. */
async function actionsFor(title: string) {
  const cell = await screen.findByText(title);
  const row = cell.closest('tr');
  if (!row) throw new Error('row not found');
  return within(row);
}

beforeEach(() => {
  jest.clearAllMocks();
  publishProgram.mockResolvedValue(undefined);
  closeProgram.mockResolvedValue(undefined);
  jest.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => jest.restoreAllMocks());

/**
 * The two state changes are the consequential actions on this screen: one puts a
 * scholarship in front of the public, the other stops it taking applications.
 * They were bare text among four icon buttons — the least visible thing in the
 * row, and the label lied on a closed scholarship.
 */
describe('ScholarshipProgramsTab — publish and close', () => {
  it('offers Publish on a draft', async () => {
    listPrograms.mockResolvedValue([program({ status: 'draft' })]);
    render(<ScholarshipProgramsTab canManage />);

    const row = await actionsFor('S4 bursary');
    expect(row.getByRole('button', { name: /publish/i })).toBeInTheDocument();
    expect(row.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('offers Close on a published scholarship', async () => {
    listPrograms.mockResolvedValue([program({ status: 'published' })]);
    render(<ScholarshipProgramsTab canManage />);

    const row = await actionsFor('S4 bursary');
    expect(row.getByRole('button', { name: /close/i })).toBeInTheDocument();
    expect(row.queryByRole('button', { name: /publish/i })).not.toBeInTheDocument();
  });

  /**
   * The wording bug. Publishing a CLOSED scholarship runs the same endpoint, but
   * to a reader "Publish" on something already published once is not what is
   * happening — it is being reopened.
   */
  it('says Reopen, not Publish, on a closed scholarship', async () => {
    listPrograms.mockResolvedValue([program({ status: 'closed' })]);
    render(<ScholarshipProgramsTab canManage />);

    const row = await actionsFor('S4 bursary');
    expect(row.getByRole('button', { name: /reopen/i })).toBeInTheDocument();
    expect(row.queryByRole('button', { name: /^publish$/i })).not.toBeInTheDocument();
  });

  // Icon AND word. An icon alone would be quicker to scan and worse to be sure
  // about, for an action that changes what the public can see.
  it('keeps a readable word on both buttons, not an icon alone', async () => {
    listPrograms.mockResolvedValue([
      program({ id: 'a', title: 'Draft one', status: 'draft' }),
      program({ id: 'b', title: 'Live one', status: 'published' }),
    ]);
    render(<ScholarshipProgramsTab canManage />);

    expect((await actionsFor('Draft one')).getByText('Publish')).toBeVisible();
    expect((await actionsFor('Live one')).getByText('Close')).toBeVisible();
  });

  it('explains the consequence on hover', async () => {
    listPrograms.mockResolvedValue([program({ status: 'draft' })]);
    render(<ScholarshipProgramsTab canManage />);

    const row = await actionsFor('S4 bursary');
    expect(row.getByRole('button', { name: /publish/i })).toHaveAttribute(
      'title',
      expect.stringContaining('visible to applicants'),
    );
  });

  /**
   * Both actions were fire-and-forget: the row sat unchanged until the refetch
   * landed, so the natural response to a slow request was to click again — and
   * the second click sent a second request.
   */
  it('disables the button while the request is in flight, so it cannot fire twice', async () => {
    listPrograms.mockResolvedValue([program({ status: 'draft' })]);
    let release: () => void = () => {};
    publishProgram.mockReturnValue(new Promise<void>((r) => { release = r; }));

    render(<ScholarshipProgramsTab canManage />);
    const row = await actionsFor('S4 bursary');
    const button = row.getByRole('button', { name: /publish/i });

    fireEvent.click(button);
    await waitFor(() => expect(button).toBeDisabled());

    fireEvent.click(button);
    fireEvent.click(button);
    expect(publishProgram).toHaveBeenCalledTimes(1);

    release();
    await waitFor(() => expect(publishProgram).toHaveBeenCalledTimes(1));
  });

  it('shows nothing to edit for a viewer without manage rights', async () => {
    listPrograms.mockResolvedValue([program({ status: 'draft' })]);
    render(<ScholarshipProgramsTab canManage={false} />);

    const row = await actionsFor('S4 bursary');
    expect(row.queryByRole('button', { name: /publish/i })).not.toBeInTheDocument();
  });
});
