import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { InlineText } from './InlineText';

/**
 * jsdom implements no `innerText`, so assigning it just sets a readable property.
 * That is faithful enough here: `InlineText` reads and writes the DOM text ONLY
 * through `innerText`, so setting it is exactly what a browser does when the admin
 * types into the contentEditable.
 */

let mockEditMode = true;
jest.mock('@/lib/edit-mode/EditModeProvider', () => ({
  useEditMode: () => ({ editMode: mockEditMode, hasPermission: () => true, seedVersion: 0 }),
}));

function setup(value: string, editValue?: string) {
  const onCommit = jest.fn();
  const { container } = render(
    <InlineText value={value} editValue={editValue} onCommit={onCommit} lang="rw" />,
  );
  return { el: container.querySelector('.ie-editable') as HTMLElement, onCommit, container };
}

afterEach(() => {
  mockEditMode = true;
});

describe('InlineText', () => {
  it('seeds the editable with the text the section renders', () => {
    const { el } = setup('Saba serivisi');

    expect(el.innerText).toBe('Saba serivisi');
  });

  it('does not commit when focus and blur leave the text untouched', () => {
    // The value a section passes is locale-RESOLVED, so on /rw an untranslated field
    // shows the English fallback. Committing on an untouched blur wrote that English
    // into the Kinyarwanda slot and marked the section dirty, so publishing froze it
    // in as a translation.
    const { el, onCommit } = setup('Request a Service');

    fireEvent.focus(el);
    fireEvent.blur(el);

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('commits a real edit', () => {
    const { el, onCommit } = setup('Saba serivisi');

    el.innerText = 'Saba serivisi nshya';
    fireEvent.input(el);

    expect(onCommit).toHaveBeenCalledWith('Saba serivisi nshya');
  });

  it('commits a cleared field, so a translation can be removed', () => {
    const { el, onCommit } = setup('Saba serivisi');

    el.innerText = '';
    fireEvent.blur(el);

    expect(onCommit).toHaveBeenCalledWith('');
  });

  it('renders plain text with no editing affordance outside edit mode', () => {
    mockEditMode = false;

    const { container } = render(<InlineText value="Saba serivisi" onCommit={jest.fn()} />);

    expect(container.querySelector('.ie-editable')).toBeNull();
    expect(container.textContent).toBe('Saba serivisi');
  });

  describe('with editValue (a field untranslated in the active locale)', () => {
    // `value` is the English fallback the public site shows; `editValue` is the
    // empty Kinyarwanda text the box should actually edit.
    const FALLBACK = 'Request a Service';

    it('opens empty rather than presenting the fallback as a translation', () => {
      const { el } = setup(FALLBACK, '');

      expect(el.innerText).toBe('');
    });

    it('does not commit the fallback when the field is focused and blurred', () => {
      const { el, onCommit } = setup(FALLBACK, '');

      fireEvent.focus(el);
      fireEvent.blur(el);

      expect(onCommit).not.toHaveBeenCalled();
    });

    it('commits a translation typed into the empty box', () => {
      const { el, onCommit } = setup(FALLBACK, '');

      el.innerText = 'Saba serivisi';
      fireEvent.input(el);

      expect(onCommit).toHaveBeenCalledWith('Saba serivisi');
    });

    it('still shows the resolved fallback on the public site', () => {
      mockEditMode = false;

      const { container } = render(
        <InlineText value={FALLBACK} editValue="" onCommit={jest.fn()} />,
      );

      // The visitor must never see the blank: `editValue` is an editor-only concern.
      expect(container.textContent).toBe(FALLBACK);
    });
  });
});
