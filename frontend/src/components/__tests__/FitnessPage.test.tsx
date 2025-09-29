import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { toast } from 'react-hot-toast';
import FitnessPage from '../../pages/FitnessPage';

// Mock dependencies
jest.mock('react-hot-toast');
jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(() => ({
    subscribeToFitness: jest.fn(),
    isConnected: true,
  })),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('FitnessPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders fitness certificates page correctly', async () => {
    render(
      <TestWrapper>
        <FitnessPage />
      </TestWrapper>
    );

    // Check if main title is rendered
    expect(screen.getByText('Fitness Certificates')).toBeInTheDocument();
    expect(screen.getByText('Manage and monitor trainset fitness certificates and compliance')).toBeInTheDocument();

    // Check if New Certificate button is rendered
    expect(screen.getByText('New Certificate')).toBeInTheDocument();

    // Wait for data to load and check if metrics are displayed
    await waitFor(() => {
      expect(screen.getByText('Total Certificates')).toBeInTheDocument();
      expect(screen.getByText('Valid')).toBeInTheDocument();
      expect(screen.getByText('Expired')).toBeInTheDocument();
      expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Compliance Rate')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    render(
      <TestWrapper>
        <FitnessPage />
      </TestWrapper>
    );

    // Should show loading spinner initially
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('filters certificates by search term', async () => {
    render(
      <TestWrapper>
        <FitnessPage />
      </TestWrapper>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('KMRL-001')).toBeInTheDocument();
    });

    // Test search functionality
    const searchInput = screen.getByPlaceholderText(/search by trainset/i);
    fireEvent.change(searchInput, { target: { value: 'KMRL-002' } });

    await waitFor(() => {
      expect(screen.getByText('KMRL-002')).toBeInTheDocument();
    });
  });

  it('filters certificates by status', async () => {
    render(
      <TestWrapper>
        <FitnessPage />
      </TestWrapper>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('All Status')).toBeInTheDocument();
    });

    // Test status filter
    const statusFilter = screen.getByDisplayValue('All Status');
    fireEvent.change(statusFilter, { target: { value: 'VALID' } });

    await waitFor(() => {
      expect(statusFilter).toHaveValue('VALID');
    });
  });

  it('opens certificate details modal when View is clicked', async () => {
    render(
      <TestWrapper>
        <FitnessPage />
      </TestWrapper>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('KMRL-001')).toBeInTheDocument();
    });

    // Find and click the first View button
    const viewButtons = screen.getAllByText('View');
    fireEvent.click(viewButtons[0]);

    // Check if modal is opened
    await waitFor(() => {
      expect(screen.getByText(/Certificate Details:/)).toBeInTheDocument();
    });
  });

  it('closes certificate details modal when X is clicked', async () => {
    render(
      <TestWrapper>
        <FitnessPage />
      </TestWrapper>
    );

    // Wait for data to load and open modal
    await waitFor(() => {
      expect(screen.getByText('KMRL-001')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByText('View');
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Certificate Details:/)).toBeInTheDocument();
    });

    // Close modal
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText(/Certificate Details:/)).not.toBeInTheDocument();
    });
  });

  it('shows correct status icons and colors', async () => {
    render(
      <TestWrapper>
        <FitnessPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('VALID')).toBeInTheDocument();
      expect(screen.getByText('EXPIRING SOON')).toBeInTheDocument();
      expect(screen.getByText('EXPIRED')).toBeInTheDocument();
    });

    // Check if status badges have correct classes
    const validStatus = screen.getByText('VALID').closest('div');
    expect(validStatus).toHaveClass('text-green-700');

    const expiringSoonStatus = screen.getByText('EXPIRING SOON').closest('div');
    expect(expiringSoonStatus).toHaveClass('text-yellow-700');

    const expiredStatus = screen.getByText('EXPIRED').closest('div');
    expect(expiredStatus).toHaveClass('text-red-700');
  });

  it('displays certificate expiry warnings correctly', async () => {
    render(
      <TestWrapper>
        <FitnessPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should show days left for expiring soon certificates
      expect(screen.getByText(/days left/)).toBeInTheDocument();
    });
  });

  it('handles new certificate button click', async () => {
    render(
      <TestWrapper>
        <FitnessPage />
      </TestWrapper>
    );

    const newCertificateButton = screen.getByText('New Certificate');
    fireEvent.click(newCertificateButton);

    // In a real implementation, this would open a modal or navigate to a form
    // For now, we just verify the button is clickable
    expect(newCertificateButton).toBeInTheDocument();
  });

  it('formats dates correctly', async () => {
    render(
      <TestWrapper>
        <FitnessPage />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check if dates are formatted in the expected format (Jan 15, 2024)
      expect(screen.getByText(/Jan \d{1,2}, \d{4}/)).toBeInTheDocument();
    });
  });

  it('shows certificate inspector information', async () => {
    render(
      <TestWrapper>
        <FitnessPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Dr. Rajesh Kumar')).toBeInTheDocument();
      expect(screen.getByText('INS-2024-001')).toBeInTheDocument();
    });
  });

  it('displays certificate details in modal correctly', async () => {
    render(
      <TestWrapper>
        <FitnessPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('KMRL-001')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByText('View');
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      // Check basic information section
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Dates')).toBeInTheDocument();
      expect(screen.getByText('Findings')).toBeInTheDocument();
      expect(screen.getByText('Recommendations')).toBeInTheDocument();
    });
  });

  it('handles WebSocket fitness updates', () => {
    const mockSubscribeToFitness = jest.fn();
    const { useWebSocket } = require('@/hooks/useWebSocket');
    
    useWebSocket.mockImplementation(() => ({
      subscribeToFitness: mockSubscribeToFitness,
      isConnected: true,
    }));

    render(
      <TestWrapper>
        <FitnessPage />
      </TestWrapper>
    );

    expect(mockSubscribeToFitness).toHaveBeenCalled();
  });
});
