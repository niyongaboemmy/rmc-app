import { render, screen, fireEvent, act } from '@testing-library/react';
import { FilePreviewTrigger, ImagePreviewTrigger } from './FilePreviewOverlay';

// next-intl needs a provider we do not want to stand up here; the component only
// uses the hook for button labels, so map every key to itself.
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// jsdom implements neither of these.
const created: string[] = [];
const revoked: string[] = [];
beforeAll(() => {
  let n = 0;
  URL.createObjectURL = jest.fn(() => {
    const url = `blob:mock/${n++}`;
    created.push(url);
    return url;
  });
  URL.revokeObjectURL = jest.fn((url: string) => { revoked.push(url); });
});

beforeEach(() => {
  created.length = 0;
  revoked.length = 0;
  jest.clearAllMocks();
});

const file = (name: string, type: string, bytes = 1024) =>
  new File([new Uint8Array(bytes)], name, { type });

const openPreview = () => {
  // The trigger is the only button until the overlay mounts.
  fireEvent.click(screen.getAllByRole('button')[0]);
};

describe('FilePreviewTrigger', () => {
  it('renders nothing when no file has been picked yet', () => {
    const { container } = render(<FilePreviewTrigger file={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows no overlay until the trigger is clicked', () => {
    render(<FilePreviewTrigger file={file('receipt.png', 'image/png')} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    openPreview();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders an image file as an <img> pointing at the object URL', () => {
    render(<FilePreviewTrigger file={file('receipt.png', 'image/png')} />);
    openPreview();

    const img = screen.getByAltText('receipt.png') as HTMLImageElement;
    expect(img.tagName).toBe('IMG');
    expect(img.getAttribute('src')).toBe(created[0]);
  });

  it('renders a PDF in an iframe rather than as an image', () => {
    const { container } = render(<FilePreviewTrigger file={file('proof.pdf', 'application/pdf')} />);
    openPreview();

    const frame = container.ownerDocument.querySelector('iframe');
    expect(frame).not.toBeNull();
    expect(frame!.getAttribute('src')).toBe(created[0]);
    expect(document.querySelector('.fixed img')).toBeNull();
  });

  it('tells the user plainly when a .docx cannot be shown inline', () => {
    render(
      <FilePreviewTrigger
        file={file('letter.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
      />,
    );
    openPreview();

    expect(screen.getByText('unsupported')).toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeNull();
    // The name is still shown (header + body), and a download is offered
    // instead of a fake preview.
    expect(screen.getAllByText('letter.docx').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /download/i }).length).toBeGreaterThan(0);
  });

  it('falls back to the extension when the browser reports no MIME type', () => {
    render(<FilePreviewTrigger file={file('scan-no-mime.JPG', '')} />);
    openPreview();
    expect(screen.getByAltText('scan-no-mime.JPG').tagName).toBe('IMG');
  });

  it('closes on Escape and revokes the object URL it created', () => {
    render(<FilePreviewTrigger file={file('receipt.png', 'image/png')} />);
    openPreview();
    expect(created).toHaveLength(1);

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(revoked).toEqual([created[0]]);
  });

  it('does not leak an object URL when unmounted while open', () => {
    const { unmount } = render(<FilePreviewTrigger file={file('receipt.png', 'image/png')} />);
    openPreview();
    unmount();
    expect(revoked).toEqual(created);
  });
});

describe('ImagePreviewTrigger', () => {
  it('previews an already-stored image straight from its URL', () => {
    render(<ImagePreviewTrigger src="https://files.example/rmc/hero.jpg" name="Hero" />);
    openPreview();

    const img = screen.getByAltText('Hero') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://files.example/rmc/hero.jpg');
    // Nothing local was allocated, so nothing needs revoking.
    expect(created).toHaveLength(0);
  });

  it('renders nothing when there is no image yet', () => {
    const { container } = render(<ImagePreviewTrigger src="" name="Hero" />);
    expect(container).toBeEmptyDOMElement();
  });
});
