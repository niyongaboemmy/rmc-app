import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RequestedDocuments } from './RequestedDocuments';

// Two namespaces, kept distinct so the test can prove WHICH one a label came from.
// The point of this component is that applicant-facing labels come from the apply form
// (translated) rather than the admin catalogue (English-only).
jest.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

const APPLY = 'services.jobs.apply';
const STATUS = 'services.jobs.status';

describe('RequestedDocuments', () => {
  it('renders nothing when the reviewer asked only for information', () => {
    const { container: a } = render(<RequestedDocuments documents={null} />);
    expect(a).toBeEmptyDOMElement();
    const { container: b } = render(<RequestedDocuments documents={[]} />);
    expect(b).toBeEmptyDOMElement();
    const { container: c } = render(<RequestedDocuments />);
    expect(c).toBeEmptyDOMElement();
  });

  it('labels each document from the apply form, not the admin catalogue', () => {
    render(<RequestedDocuments documents={['cv', 'criminalRecord']} />);
    expect(screen.getByText(`${APPLY}.cv`)).toBeInTheDocument();
    expect(screen.getByText(`${APPLY}.criminalRecord`)).toBeInTheDocument();
  });

  /**
   * The apply form calls this slot `goodConductFile` — the upload option, as against
   * `goodConductNumber`, which verifies an existing certificate. The request key is
   * `goodConductCertificate`, so the two names have to be mapped rather than assumed
   * equal. Nothing in the type system catches it if this drifts.
   */
  it('maps goodConductCertificate onto the apply form key that actually exists', () => {
    render(<RequestedDocuments documents={['goodConductCertificate']} />);
    expect(screen.getByText(`${APPLY}.goodConductFile`)).toBeInTheDocument();
  });

  it('points "other" back at the reviewer message instead of naming a document', () => {
    render(<RequestedDocuments documents={['other']} />);
    expect(screen.getByText(`${STATUS}.requestedDocsOther`)).toBeInTheDocument();
  });

  it('falls through the same way for a key it does not know', () => {
    // A key added on the backend before this map catches up must not render as a raw
    // identifier to an applicant.
    render(<RequestedDocuments documents={['somethingNew']} />);
    expect(screen.getByText(`${STATUS}.requestedDocsOther`)).toBeInTheDocument();
    expect(screen.queryByText('somethingNew')).not.toBeInTheDocument();
  });

  it('lists every requested document, in the order given', () => {
    render(<RequestedDocuments documents={['nationalId', 'cv', 'academicPapers']} />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual([`${APPLY}.nationalId`, `${APPLY}.cv`, `${APPLY}.academicPapers`]);
  });
});
