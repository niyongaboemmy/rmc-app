import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnswerContents } from './AnswerContents';

const toc = (...levels: number[]) =>
  levels.map((level, i) => ({ id: `answer-h${i}`, text: `Heading ${i}`, level }));

/**
 * When the contents list appears, and when it stays out of the way.
 *
 * The threshold was 2 and is now 1. That difference was reported as the feature
 * being broken, which is the point: a reader cannot tell "one heading is not worth
 * listing" from "the contents list does not work", so the silence cost more than
 * a one-item box ever would.
 */
describe('AnswerContents', () => {
  it('shows a single heading rather than nothing', () => {
    render(<AnswerContents toc={toc(2)} label="In this answer" dir="ltr" />);

    expect(screen.getByRole('navigation', { name: 'In this answer' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Heading 0' })).toHaveAttribute('href', '#answer-h0');
  });

  // Nothing to list is the one case where silence is right.
  it('renders nothing when the answer has no headings', () => {
    const { container } = render(<AnswerContents toc={[]} label="In this answer" dir="ltr" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('links every heading to its anchor', () => {
    render(<AnswerContents toc={toc(2, 3, 3, 2)} label="In this answer" dir="ltr" />);

    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  // An answer written entirely in h3 should not look as though something above it
  // is missing, so the indent is relative to the shallowest heading present.
  it('indents relative to the shallowest level present', () => {
    render(<AnswerContents toc={toc(3, 4)} label="In this answer" dir="ltr" />);

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveStyle({ marginInlineStart: '0rem' });
    expect(items[1]).toHaveStyle({ marginInlineStart: '0.875rem' });
  });

  // Paper already shows every heading; a list of links that cannot be followed is
  // furniture.
  it('is hidden in print', () => {
    render(<AnswerContents toc={toc(2, 3)} label="In this answer" dir="ltr" />);

    expect(screen.getByRole('navigation')).toHaveAttribute('data-print-hide');
  });
});
