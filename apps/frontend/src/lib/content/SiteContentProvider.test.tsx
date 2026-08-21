import React from 'react';
import { render } from '@testing-library/react';
import { SiteContentProvider, useServerSiteContent } from './SiteContentProvider';

/**
 * The nesting contract. The locale layout provides the shared chrome's keys and a
 * page provides its own sections inside that, so an inner provider must merge over
 * the outer map. If it replaced it, the footer rendered inside a page would lose the
 * layout's keys and fall back to fetching on mount — silently undoing the fix.
 */

function Probe({ contentKey }: { contentKey: string }) {
  const { value, provided } = useServerSiteContent<{ title: string }>(contentKey);
  return (
    <span data-testid={contentKey}>
      {provided ? `provided:${value ? value.title : 'null'}` : 'absent'}
    </span>
  );
}

describe('SiteContentProvider', () => {
  it('reports absent outside any provider, so consumers keep fetching', () => {
    const { getByTestId } = render(<Probe contentKey="social-media" />);

    expect(getByTestId('social-media').textContent).toBe('absent');
  });

  it('serves the keys it was given', () => {
    const { getByTestId } = render(
      <SiteContentProvider content={{ 'social-media': { title: 'Social' } }}>
        <Probe contentKey="social-media" />
      </SiteContentProvider>,
    );

    expect(getByTestId('social-media').textContent).toBe('provided:Social');
  });

  it('distinguishes a section that is unset from one nobody looked up', () => {
    // provided:null means the server looked and the section has never been saved —
    // there is nothing to fetch, unlike `absent`.
    const { getByTestId } = render(
      <SiteContentProvider content={{}}>
        <Probe contentKey="library" />
      </SiteContentProvider>,
    );

    expect(getByTestId('library').textContent).toBe('provided:null');
  });

  it('merges a nested provider over the outer one instead of shadowing it', () => {
    const { getByTestId } = render(
      <SiteContentProvider content={{ 'social-media': { title: 'Shared' } }}>
        <SiteContentProvider content={{ library: { title: 'Library' } }}>
          <Probe contentKey="social-media" />
          <Probe contentKey="library" />
        </SiteContentProvider>
      </SiteContentProvider>,
    );

    // The layout's key is still reachable from inside the page's provider.
    expect(getByTestId('social-media').textContent).toBe('provided:Shared');
    expect(getByTestId('library').textContent).toBe('provided:Library');
  });

  it('lets the inner provider win on a colliding key', () => {
    const { getByTestId } = render(
      <SiteContentProvider content={{ contact: { title: 'Shared' } }}>
        <SiteContentProvider content={{ contact: { title: 'Page' } }}>
          <Probe contentKey="contact" />
        </SiteContentProvider>
      </SiteContentProvider>,
    );

    expect(getByTestId('contact').textContent).toBe('provided:Page');
  });
});
