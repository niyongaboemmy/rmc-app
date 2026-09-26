import React from 'react';
import { render, screen } from '@testing-library/react';
import { PARTNERS_DEFAULT } from '@/lib/content-api';
import { PartnersSection } from './PartnersSection';

/**
 * The public site loops each partner row several times over so it can scroll
 * endlessly; Edit Mode must show every partner exactly once, as an editable card.
 */

let mockEditing = false;

jest.mock('next/navigation', () => ({ useParams: () => ({ locale: 'en' }) }));
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: ({ fill: _fill, ...props }: Record<string, unknown>) => <img {...props} />,
}));
jest.mock('@/lib/edit-mode/useEditableContent', () => ({
  useEditableContent: (_key: string, defaults: unknown) => ({
    content: defaults,
    editing: mockEditing,
    setField: jest.fn(),
  }),
}));
jest.mock('@/lib/edit-mode/EditModeProvider', () => ({
  useEditMode: () => ({ bumpSeed: jest.fn() }),
}));
// The edit-mode field widgets need the upload/auth plumbing; stand-ins that render
// the value are all these tests look at.
jest.mock('@/components/edit-mode/InlineText', () => ({
  InlineText: ({ value, as: Tag = 'span' }: { value: string; as?: React.ElementType }) => <Tag>{value}</Tag>,
}));
jest.mock('@/components/edit-mode/InlineImage', () => ({ InlineImage: () => <div /> }));
jest.mock('@/components/edit-mode/InlineLink', () => ({ InlineLink: () => <div /> }));
jest.mock('@/components/edit-mode/CardEditToolbar', () => ({ CardEditToolbar: () => <div /> }));

beforeAll(() => {
  // jsdom has no IntersectionObserver.
  global.IntersectionObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
    takeRecords() { return []; }
  } as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  mockEditing = false;
});

const names = PARTNERS_DEFAULT.items.map((p) => p.name);

describe('PartnersSection', () => {
  it('shows each partner once in Edit Mode, with no moving rows', () => {
    mockEditing = true;
    const { container } = render(<PartnersSection />);

    for (const name of names) {
      expect(screen.getAllByText(name)).toHaveLength(1);
    }
    expect(container.querySelector('.animate-marquee, .animate-marquee-reverse')).toBeNull();
    expect(screen.getByText('Add partner')).toBeInTheDocument();
  });

  it('loops the rows on the public site but exposes each partner only once', () => {
    const { container } = render(<PartnersSection />);

    expect(container.querySelectorAll('.animate-marquee, .animate-marquee-reverse')).toHaveLength(2);
    for (const name of names) {
      // Loop copies are aria-hidden, so only the real tile is reachable.
      expect(screen.getAllByRole('button', { name: `About ${name}` })).toHaveLength(1);
    }
    expect(screen.queryByText('Add partner')).toBeNull();
  });
});
