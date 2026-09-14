import { render, screen, act } from '@testing-library/react';
import { useImageLoaded } from './useImageLoaded';

/**
 * The placeholder is only as good as the signal that removes it, and both ways
 * this can fail are silent: a placeholder that never goes leaves a photo the
 * reader can never see, and one that goes too early defeats the point.
 *
 * jsdom never loads images, so `load` and `complete` are driven by hand here —
 * which is exactly the control needed to reproduce the cached case, the one that
 * cannot be reproduced by waiting.
 */
function Probe({ src }: { src: string | null }) {
  const { loaded, imageProps } = useImageLoaded(src);
  return (
    <>
      <span data-testid="state">{loaded ? 'loaded' : 'pending'}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img {...imageProps} src={src ?? undefined} alt="" data-testid="img" />
    </>
  );
}

const state = () => screen.getByTestId('state').textContent;
const img = () => screen.getByTestId('img') as HTMLImageElement;

/** jsdom leaves `complete` false forever; this is the cached-image case. */
function pretendAlreadyComplete(value: boolean) {
  Object.defineProperty(HTMLImageElement.prototype, 'complete', {
    configurable: true,
    get: () => value,
  });
}

afterEach(() => {
  // Back to jsdom's own definition, so one test's stub cannot decide another's.
  Reflect.deleteProperty(HTMLImageElement.prototype, 'complete');
});

describe('useImageLoaded', () => {
  it('starts pending, so the placeholder is what shows first', () => {
    pretendAlreadyComplete(false);
    render(<Probe src="/a.jpg" />);

    expect(state()).toBe('pending');
  });

  it('settles when the photo loads', () => {
    pretendAlreadyComplete(false);
    render(<Probe src="/a.jpg" />);

    act(() => {
      img().dispatchEvent(new Event('load'));
    });

    expect(state()).toBe('loaded');
  });

  /**
   * The failure this hook exists for. A photo the browser already holds fires
   * `load` before React attaches a handler, so `onLoad` never runs — and without
   * the `complete` check in the ref, the placeholder pulses over a photo that
   * has been ready the whole time.
   */
  it('settles an image the browser had already finished, with no event at all', () => {
    pretendAlreadyComplete(true);
    render(<Probe src="/cached.jpg" />);

    expect(state()).toBe('loaded');
  });

  /**
   * The lightbox pages through photos on one element. A boolean would stay true
   * from the first photo and every later one would arrive with no placeholder.
   */
  it('goes back to pending when asked for a different photo', () => {
    pretendAlreadyComplete(false);
    const { rerender } = render(<Probe src="/first.jpg" />);
    act(() => {
      img().dispatchEvent(new Event('load'));
    });
    expect(state()).toBe('loaded');

    rerender(<Probe src="/second.jpg" />);

    expect(state()).toBe('pending');
  });

  it('settles again once that different photo arrives', () => {
    pretendAlreadyComplete(false);
    const { rerender } = render(<Probe src="/first.jpg" />);
    act(() => {
      img().dispatchEvent(new Event('load'));
    });
    rerender(<Probe src="/second.jpg" />);

    act(() => {
      img().dispatchEvent(new Event('load'));
    });

    expect(state()).toBe('loaded');
  });

  /**
   * Paging back to the photo that most recently settled shows it at once, with
   * no placeholder in between: it loaded seconds ago, so the browser still has
   * it, and a placeholder over a photo already in hand is the flicker this whole
   * thing is meant to remove.
   *
   * The trade-off, written down because it is a deliberate choice and not an
   * oversight: if that photo HAD been evicted from cache, this reports ready a
   * moment early — the wrong direction to fail. It is accepted because eviction
   * within one lightbox session is not a real case, while paging back and forth
   * is what the arrows are for.
   *
   * Only the most recent one, though — one src is remembered, not a set. Three
   * photos back is pending again, and then the `complete` check settles it.
   */
  it('shows the previous photo again without a placeholder', () => {
    pretendAlreadyComplete(false);
    const { rerender } = render(<Probe src="/first.jpg" />);
    act(() => {
      img().dispatchEvent(new Event('load'));
    });

    rerender(<Probe src="/second.jpg" />);
    expect(state()).toBe('pending');

    rerender(<Probe src="/first.jpg" />);

    expect(state()).toBe('loaded');
  });

  /**
   * A 404 would otherwise pulse for as long as the page is open. Whatever is
   * underneath is more honest than a placeholder promising a photo that is not
   * coming.
   */
  it('settles on error rather than pulsing forever', () => {
    pretendAlreadyComplete(false);
    render(<Probe src="/missing.jpg" />);

    act(() => {
      img().dispatchEvent(new Event('error'));
    });

    expect(state()).toBe('loaded');
  });

  it('stays pending for no src, rather than reporting a photo it was never given', () => {
    pretendAlreadyComplete(true);
    render(<Probe src={null} />);

    expect(state()).toBe('pending');
  });
});
