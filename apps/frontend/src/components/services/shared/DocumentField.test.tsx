import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentField } from './DocumentField';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

beforeAll(() => {
  URL.createObjectURL = jest.fn(() => 'blob:mock/doc');
  URL.revokeObjectURL = jest.fn();
});

/** Drives the field the way a form does — it owns the File and re-renders. */
function Harness({ accept = 'image/png' }: { accept?: string }) {
  const [file, setFile] = useState<File | null>(null);
  return <DocumentField label="National ID" accept={accept} maxMb={5} file={file} onChange={setFile} />;
}

const pick = (container: HTMLElement, file: File) => {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
};

describe('DocumentField preview wiring', () => {
  it('offers no preview before a file is picked', () => {
    render(<Harness />);
    expect(screen.queryByRole('button', { name: 'preview' })).not.toBeInTheDocument();
  });

  it('exposes the picked file for preview and opens the overlay', () => {
    const { container } = render(<Harness />);
    pick(container, new File([new Uint8Array(8)], 'id-card.png', { type: 'image/png' }));

    // Both the thumbnail and the eye button open the same preview.
    const triggers = screen.getAllByRole('button', { name: 'preview' });
    expect(triggers.length).toBe(2);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(triggers[1]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByAltText('id-card.png')).toBeInTheDocument();
  });

  it('rejects a file the slot does not accept, so nothing becomes previewable', () => {
    const { container } = render(<Harness accept="application/pdf" />);
    pick(container, new File([new Uint8Array(8)], 'photo.png', { type: 'image/png' }));

    expect(screen.getByText('Unsupported file type')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'preview' })).not.toBeInTheDocument();
  });
});
