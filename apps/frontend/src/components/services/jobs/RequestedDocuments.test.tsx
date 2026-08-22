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

  it('offers no sign-in link by default — the member portal has the form below it', () => {
    render(<RequestedDocuments documents={['cv']} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('offers a sign-in link where replying is not possible', () => {
    // Track-by-number can show the request but not answer it: uploading needs a signed-in
    // applicant. A checklist headed "documents to upload" with no way to upload is a dead
    // end, so that path passes a destination.
    render(<RequestedDocuments documents={['cv']} signInHref="/en/login?redirect=/services/jobs/status" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/en/login?redirect=/services/jobs/status');
    expect(screen.getByText(`${STATUS}.requestedDocsSignIn`)).toBeInTheDocument();
  });

  it('lists every requested document, in the order given', () => {
    render(<RequestedDocuments documents={['nationalId', 'cv', 'academicPapers']} />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual([`${APPLY}.nationalId`, `${APPLY}.cv`, `${APPLY}.academicPapers`]);
  });
});
