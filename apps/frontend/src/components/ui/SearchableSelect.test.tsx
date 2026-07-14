import { render, screen, fireEvent } from '@testing-library/react';
import { SearchableSelect } from './SearchableSelect';

const OPTIONS = [
  { value: 'kg', label: 'Kigali Grand Mosque' },
  { value: 'nb', label: 'Nyamirambo Mosque' },
];

function trigger() {
  return screen.getAllByRole('button')[0];
}

describe('SearchableSelect', () => {
  it('keeps the compact trigger by default (mosques admin baseline)', () => {
    render(<SearchableSelect value="" onChange={() => {}} options={OPTIONS} />);
    expect(trigger().className).toContain('rounded-lg');
    expect(trigger().className).toContain('py-1.5');
  });

  it('size="md" matches the standard rounded-xl / py-2.5 form inputs', () => {
    render(<SearchableSelect value="" onChange={() => {}} options={OPTIONS} size="md" />);
    expect(trigger().className).toContain('rounded-xl');
    expect(trigger().className).toContain('py-2.5');
    expect(trigger().className).toContain('text-sm');
  });

  // The bug: styling passed for the control used to land on the wrapper div,
  // so pill triggers stayed square and error borders never rendered.
  it('applies triggerClassName to the button, not the wrapper', () => {
    const { container } = render(
      <SearchableSelect
        value=""
        onChange={() => {}}
        options={OPTIONS}
        size="md"
        triggerClassName="rounded-full px-4 !border-red-300"
      />,
    );
    expect(trigger().className).toContain('rounded-full');
    expect(trigger().className).toContain('!border-red-300');
    // tailwind-merge must drop the size default that rounded-full overrides
    expect(trigger().className).not.toContain('rounded-xl');
    expect((container.firstChild as HTMLElement).className).not.toContain('rounded-full');
  });

  // The search input must be able to shrink. Without min-w-0 it keeps its default
  // intrinsic width, overflows the row, and focusing it on open scrolls the
  // overflow-hidden menu sideways — which clipped every option label.
  it('keeps the search input shrinkable so the menu cannot scroll sideways', () => {
    render(<SearchableSelect value="" onChange={() => {}} options={OPTIONS} />);
    fireEvent.click(trigger());
    const input = screen.getByPlaceholderText('Search…');
    expect(input.className).toContain('min-w-0');
  });

  it('filters options by the search query and reports the picked value', () => {
    const onChange = jest.fn();
    render(<SearchableSelect value="" onChange={onChange} options={OPTIONS} />);

    fireEvent.click(trigger());
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'nyami' } });

    expect(screen.queryByText('Kigali Grand Mosque')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Nyamirambo Mosque'));
    expect(onChange).toHaveBeenCalledWith('nb');
  });
});
