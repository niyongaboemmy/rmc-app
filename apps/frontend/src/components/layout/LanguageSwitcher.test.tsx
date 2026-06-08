import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LanguageSwitcher } from './LanguageSwitcher';

const mockPush = jest.fn();
const mockPathname = '/en/dashboard';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  useParams: () => ({ locale: 'en' }),
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders all 3 language options', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('RW')).toBeInTheDocument();
    expect(screen.getByText('AR')).toBeInTheDocument();
  });

  it('shows correct flag/label for each locale', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByLabelText('Switch to EN')).toBeInTheDocument();
    expect(screen.getByLabelText('Switch to RW')).toBeInTheDocument();
    expect(screen.getByLabelText('Switch to AR')).toBeInTheDocument();
  });

  it('navigates to correct locale URL on click', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByLabelText('Switch to RW'));
    expect(mockPush).toHaveBeenCalledWith('/rw/dashboard');
  });

  it('highlights the active locale', () => {
    render(<LanguageSwitcher />);
    const enButton = screen.getByLabelText('Switch to EN');
    expect(enButton).toHaveClass('bg-white');
  });
});
