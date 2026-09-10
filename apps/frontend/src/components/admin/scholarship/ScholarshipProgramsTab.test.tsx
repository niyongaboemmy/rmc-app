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
const deleteProgram = jest.fn();
jest.mock('@/lib/scholarshipAdminApi', () => ({
  scholarshipAdminApi: {
    listPrograms: () => listPrograms(),
    publishProgram: (id: string) => publishProgram(id),
    closeProgram: (id: string) => closeProgram(id),
    deleteProgram: (id: string) => deleteProgram(id),
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
  deleteProgram.mockResolvedValue(undefined);
});

afterEach(() => jest.restoreAllMocks());

/**
 * The two state changes are the consequential actions on this screen: one puts a
 * scholarship in front of the public, the other stops it taking applications.
 * They were bare text among four icon buttons — the least visible thing in the
 * row, and the label lied on a closed scholarship.
 */
describe('ScholarshipProgramsTab — publish and close', () => {
  /**
   * Both buttons are always present. Rendering only the applicable one meant a
   * screen where every scholarship happened to be published showed no Publish
   * button anywhere, so nothing said the action existed — and the controls moved
   * between rows, so the column could not be scanned.
   */
  it.each([
    ['draft', 'Publish', true, false],
    ['published', 'Publish', false, true],
    ['closed', 'Reopen', true, false],
  ] as const)(
    'a %s row offers both, with %s enabled=%s and Close enabled=%s',
    async (status, publishLabel, publishEnabled, closeEnabled) => {
      listPrograms.mockResolvedValue([program({ status })]);
      render(<ScholarshipProgramsTab canManage />);

      const row = await actionsFor('S4 bursary');
      const publish = row.getByRole('button', { name: new RegExp(publishLabel, 'i') });
      const close = row.getByRole('button', { name: /close/i });

      expect(publish).toBeInTheDocument();
      expect(close).toBeInTheDocument();
      expect(publish.hasAttribute('disabled')).toBe(!publishEnabled);
      expect(close.hasAttribute('disabled')).toBe(!closeEnabled);
    },
  );

  // The disabled one has to say WHY, or it is just a control that does nothing.
  it.each([
    ['published', /close/i, /already published/i],
    ['draft', /close/i, /publish it before/i],
    ['closed', /close/i, /already closed/i],
  ] as const)('a %s row explains why the unavailable action is unavailable', async (status, _n, reason) => {
    listPrograms.mockResolvedValue([program({ status })]);
    render(<ScholarshipProgramsTab canManage />);

    const row = await actionsFor('S4 bursary');
    const disabled = row
      .getAllByRole('button')
      .filter((b) => b.hasAttribute('disabled'))
      .map((b) => b.getAttribute('title') ?? '');

    expect(disabled.some((t) => reason.test(t))).toBe(true);
  });

  /**
   * The disabled button has to stay READABLE.
   *
   * It was dimmed with `opacity-40`, which took the coloured pill's label to
   * 1.79:1 against the page — rendered in the DOM, and invisible on screen. The
   * word was there in every test; none of them could see it was not.
   *
   * This asserts the mechanism rather than the contrast, because jsdom resolves
   * no CSS and cannot measure a rendered colour. Opacity dims the TEXT along
   * with everything else; an explicit grey palette changes what the control
   * looks like without making it unreadable, and that is the rule worth pinning.
   */
  it.each(['draft', 'published', 'closed'] as const)(
    'dims a %s row\u2019s unavailable action with colour, never with opacity',
    async (status) => {
      listPrograms.mockResolvedValue([program({ status })]);
      render(<ScholarshipProgramsTab canManage />);

      const row = await actionsFor('S4 bursary');
      const disabled = row
        .getAllByRole('button')
        .filter((b) => b.hasAttribute('disabled') && b.textContent?.trim());

      expect(disabled.length).toBeGreaterThan(0);
      for (const b of disabled) {
        const cls = b.getAttribute('class') ?? '';
        expect(cls).not.toMatch(/disabled:opacity-/);
        expect(cls).toMatch(/disabled:text-/);
      }
    },
  );

  it('never lets a disabled action be fired', async () => {
    listPrograms.mockResolvedValue([program({ status: 'published' })]);
    render(<ScholarshipProgramsTab canManage />);

    const row = await actionsFor('S4 bursary');
    fireEvent.click(row.getByRole('button', { name: /publish/i }));

    expect(publishProgram).not.toHaveBeenCalled();
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
   * Every one of these actions used to go through the browser's own confirm() —
   * the "localhost:3001 says" box, which cannot be styled, cannot name what it
   * is about to do in the app's own voice, and cannot show the server's answer.
   */
  describe('the confirmation dialog', () => {
    const openDialog = async (status: string, buttonName: RegExp) => {
      listPrograms.mockResolvedValue([program({ status })]);
      render(<ScholarshipProgramsTab canManage />);
      const row = await actionsFor('S4 bursary');
      fireEvent.click(row.getByRole('button', { name: buttonName }));
      return screen.findByRole('dialog');
    };

    it('asks before publishing, and calls nothing until it is answered', async () => {
      const dialog = await openDialog('draft', /publish/i);

      expect(within(dialog).getByText(/publish this scholarship\?/i)).toBeInTheDocument();
      expect(publishProgram).not.toHaveBeenCalled();
    });

    // The old alert said "Delete this scholarship?" about no scholarship in
    // particular. On a list of three, that is a question you cannot safely answer.
    it.each([
      ['draft', /publish/i],
      ['published', /close/i],
    ] as const)('names the scholarship it is asking about (%s)', async (status, button) => {
      const dialog = await openDialog(status, button);

      expect(within(dialog).getByText(/S4 bursary/)).toBeInTheDocument();
    });

    it('says Reopen when the scholarship is closed', async () => {
      const dialog = await openDialog('closed', /reopen/i);

      expect(within(dialog).getByText(/reopen this scholarship\?/i)).toBeInTheDocument();
    });

    it('does nothing when dismissed', async () => {
      const dialog = await openDialog('draft', /publish/i);
      fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(publishProgram).not.toHaveBeenCalled();
    });

    it('runs the action once confirmed', async () => {
      const dialog = await openDialog('draft', /publish/i);
      fireEvent.click(within(dialog).getByRole('button', { name: /^publish$/i }));

      await waitFor(() => expect(publishProgram).toHaveBeenCalledWith('p-1'));
    });

    it('closes an action a published scholarship offers', async () => {
      const dialog = await openDialog('published', /close/i);
      fireEvent.click(within(dialog).getByRole('button', { name: /close it/i }));

      await waitFor(() => expect(closeProgram).toHaveBeenCalledWith('p-1'));
    });

    /**
     * The reason this is worth more than confirm(): the server refuses to publish
     * a scholarship with no deadline, and that refusal has to reach the person who
     * asked. A native alert closes the moment it is answered, so the message
     * landed behind it.
     */
    it('keeps the dialog open and surfaces the server’s refusal', async () => {
      publishProgram.mockRejectedValue({
        response: { data: { error: { message: 'Cannot publish without: deadline' } } },
      });
      const dialog = await openDialog('draft', /publish/i);
      fireEvent.click(within(dialog).getByRole('button', { name: /^publish$/i }));

      expect(await screen.findByText(/cannot publish without: deadline/i)).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    /**
     * The double-submit guard moved here with the confirmation. A slow request
     * used to leave the row unchanged, so the natural response was to click again.
     */
    it('cannot be confirmed twice while the request is in flight', async () => {
      let release: () => void = () => {};
      publishProgram.mockReturnValue(new Promise<void>((r) => { release = r; }));

      const dialog = await openDialog('draft', /publish/i);
      const confirm = within(dialog).getByRole('button', { name: /^publish$/i });

      fireEvent.click(confirm);
      await waitFor(() => expect(confirm).toBeDisabled());
      fireEvent.click(confirm);
      fireEvent.click(confirm);

      expect(publishProgram).toHaveBeenCalledTimes(1);
      release();
    });

    it('asks before deleting, and warns that it cannot be undone', async () => {
      const dialog = await openDialog('draft', /delete/i);

      expect(within(dialog).getByText(/cannot be undone/i)).toBeInTheDocument();
      expect(deleteProgram).not.toHaveBeenCalled();
    });
  });

  it('shows nothing to edit for a viewer without manage rights', async () => {
    listPrograms.mockResolvedValue([program({ status: 'draft' })]);
    render(<ScholarshipProgramsTab canManage={false} />);

    const row = await actionsFor('S4 bursary');
    expect(row.queryByRole('button', { name: /publish/i })).not.toBeInTheDocument();
  });
});
