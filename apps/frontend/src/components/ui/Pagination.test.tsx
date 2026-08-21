import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Pagination, pageWindow } from './Pagination';

/**
 * The elision rule, pinned. The window has to keep first, last and the current page's
 * neighbours visible at a fixed width — and never hide a single page behind an ellipsis,
 * which costs the same space as showing it.
 */
describe('pageWindow', () => {
  it('lists every page when the set is small', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('always keeps the first and last page reachable', () => {
    for (const page of [1, 5, 50, 99, 100]) {
      const w = pageWindow(page, 100);
      expect(w[0]).toBe(1);
      expect(w[w.length - 1]).toBe(100);
    }
  });

  it('keeps the current page and its neighbours', () => {
    expect(pageWindow(50, 100)).toEqual([1, null, 49, 50, 51, null, 100]);
  });

  it('elides only on the side that needs it', () => {
    expect(pageWindow(2, 100)).toEqual([1, 2, 3, null, 100]);
    expect(pageWindow(99, 100)).toEqual([1, null, 98, 99, 100]);
  });

  it('spells out a gap of exactly one page rather than eliding it', () => {
    // "1 2 3 4 5 … 100", never "1 … 3 4 5 … 100" — an ellipsis hiding a single page
    // spends the same width as the page it hides.
    expect(pageWindow(4, 100)).toEqual([1, 2, 3, 4, 5, null, 100]);
    expect(pageWindow(97, 100)).toEqual([1, null, 96, 97, 98, 99, 100]);
  });

  it('never repeats a page', () => {
    for (let page = 1; page <= 40; page++) {
      const nums = pageWindow(page, 40).filter((p): p is number => p !== null);
      expect(new Set(nums).size).toBe(nums.length);
    }
  });

  it('keeps the pages in ascending order', () => {
    for (let page = 1; page <= 40; page++) {
      const nums = pageWindow(page, 40).filter((p): p is number => p !== null);
      expect([...nums].sort((a, b) => a - b)).toEqual(nums);
    }
  });
});

const LABELS = { previous: 'Previous', next: 'Next', nav: 'Pagination' };

describe('Pagination', () => {
  const nav = () => screen.getByRole('navigation', { name: 'Pagination' });

  it('renders nothing when there is only one page', () => {
    const { container } = render(
      <Pagination page={1} pages={1} onChange={() => {}} labels={LABELS} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a numbered button per page', () => {
    render(<Pagination page={1} pages={5} onChange={() => {}} labels={LABELS} />);
    for (const n of ['1', '2', '3', '4', '5']) {
      expect(within(nav()).getByRole('button', { name: n })).toBeInTheDocument();
    }
  });

  it('marks the current page for screen readers, not just visually', () => {
    render(<Pagination page={3} pages={5} onChange={() => {}} labels={LABELS} />);
    const current = within(nav()).getByRole('button', { name: '3' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(within(nav()).getByRole('button', { name: '2' })).not.toHaveAttribute('aria-current');
  });

  it('reports the page that was clicked', () => {
    const onChange = jest.fn();
    render(<Pagination page={1} pages={5} onChange={onChange} labels={LABELS} />);
    fireEvent.click(within(nav()).getByRole('button', { name: '4' }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('steps with the arrows', () => {
    const onChange = jest.fn();
    render(<Pagination page={3} pages={5} onChange={onChange} labels={LABELS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onChange).toHaveBeenCalledWith(4);
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('disables the arrow that would leave the range', () => {
    const { unmount } = render(
      <Pagination page={1} pages={5} onChange={() => {}} labels={LABELS} />,
    );
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    unmount();

    render(<Pagination page={5} pages={5} onChange={() => {}} labels={LABELS} />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('hides the elision from screen readers', () => {
    render(<Pagination page={50} pages={100} onChange={() => {}} labels={LABELS} />);
    // The gaps are decorative; a reader tabbing through should meet only real pages.
    expect(within(nav()).queryByRole('button', { name: '…' })).not.toBeInTheDocument();
    expect(within(nav()).getByRole('button', { name: '100' })).toBeInTheDocument();
  });
});
