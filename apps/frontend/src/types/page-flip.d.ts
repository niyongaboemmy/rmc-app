/**
 * `page-flip` (MIT) ships JavaScript only — no `types` field, no bundled .d.ts —
 * so without this the import is an implicit `any` and every call into it is
 * unchecked. Declared here rather than sprinkling `any` at the call sites.
 *
 * Only the surface BookFlipReader actually uses is declared. Add to it rather
 * than widening to `any` if more of the library is needed later.
 * API reference: https://nodlik.github.io/StPageFlip/
 */
declare module 'page-flip' {
  export interface PageFlipSettings {
    width: number;
    height: number;
    /** 'fixed' keeps the given width/height; 'stretch' fills the parent. */
    size?: 'fixed' | 'stretch';
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    /** Render page 1 alone, as a real book's cover sits alone. */
    showCover?: boolean;
    /** Allow falling back to a single page when the stage is too narrow. */
    usePortrait?: boolean;
    maxShadowOpacity?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    mobileScrollSupport?: boolean;
    swipeDistance?: number;
    clickEventForward?: boolean;
    useMouseEvents?: boolean;
    disableFlipByClick?: boolean;
  }

  /** `flip` carries the new page index; orientation/state carry a string. */
  export interface PageFlipEvent {
    data: number | string;
    object: PageFlip;
  }

  export type PageFlipEventName =
    | 'flip'
    | 'changeOrientation'
    | 'changeState'
    | 'init'
    | 'update';

  export class PageFlip {
    constructor(element: HTMLElement, settings: PageFlipSettings);
    loadFromHTML(items: HTMLElement[] | NodeListOf<HTMLElement>): void;
    updateFromHtml(items: HTMLElement[] | NodeListOf<HTMLElement>): void;
    loadFromImages(images: string[]): void;
    on(event: PageFlipEventName, callback: (e: PageFlipEvent) => void): void;
    off(event: PageFlipEventName): void;
    flip(page: number, corner?: 'top' | 'bottom'): void;
    flipNext(corner?: 'top' | 'bottom'): void;
    flipPrev(corner?: 'top' | 'bottom'): void;
    /**
     * Jump straight to a page with no flip animation. What search results use:
     * `flip()` animates every intervening turn, so jumping from page 3 to 180
     * would run an absurd sequence before arriving.
     */
    turnToPage(page: number): void;
    turnToNextPage(): void;
    turnToPrevPage(): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    getOrientation(): 'portrait' | 'landscape';
    destroy(): void;
  }
}
