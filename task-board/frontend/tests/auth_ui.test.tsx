import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { RegisterPage } from '../src/features/auth/RegisterPage';
import { LoginPage } from '../src/features/auth/LoginPage';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../src/features/auth/authStore';
import { api } from '../src/api/client';

// Mock the api client
vi.mock('../src/api/client', () => {
  return {
    api: {
      post: vi.fn(),
    },
  };
});

// Mock react-router-dom useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Authentication UI & Functional Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isLoading: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('RegisterPage', () => {
    it('renders all form fields and submits successfully', async () => {
      // Mock API response
      const mockUser = { id: 'user-1', name: 'Abhishek Sharma', email: 'abhishek@example.com', createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            user: mockUser,
            accessToken: 'mock-access-token',
          },
        },
      });

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      );

      // Verify fields exist using the new ForgeBoard labels
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Work email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();

      // Fill form
      fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Abhishek Sharma' } });
      fireEvent.change(screen.getByLabelText(/Work email/i), { target: { value: 'abhishek@example.com' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });

      // Click register
      fireEvent.click(screen.getByRole('button', { name: /Sign up/i }));

      // Wait for store to update and navigate
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          name: 'Abhishek Sharma',
          email: 'abhishek@example.com',
          password: 'password123',
        });
        expect(useAuthStore.getState().user).toEqual(mockUser);
        expect(useAuthStore.getState().accessToken).toBe('mock-access-token');
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('shows error if registration fails (e.g. Email in use)', async () => {
      // Mock API rejection (409 conflict)
      const axiosError = {
        isAxiosError: true,
        response: { status: 409 },
      };
      vi.mocked(api.post).mockRejectedValueOnce(axiosError);

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      );

      // Fill form and submit
      fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Abhishek Sharma' } });
      fireEvent.change(screen.getByLabelText(/Work email/i), { target: { value: 'abhishek@example.com' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
      fireEvent.click(screen.getByRole('button', { name: /Sign up/i }));

      // Expect email validation/error message
      await waitFor(() => {
        expect(screen.getByText(/Email already in use/i)).toBeInTheDocument();
      });
    });
  });

  describe('LoginPage', () => {
    it('renders login fields and logins successfully', async () => {
      const mockUser = { id: 'user-1', name: 'Abhishek Sharma', email: 'abhishek@example.com', createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(api.post).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            user: mockUser,
            accessToken: 'mock-access-token',
          },
        },
      });

      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      expect(screen.getByLabelText(/Work email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/Work email/i), { target: { value: 'abhishek@example.com' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });

      fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/login', {
          email: 'abhishek@example.com',
          password: 'password123',
        });
        expect(useAuthStore.getState().user).toEqual(mockUser);
        expect(useAuthStore.getState().accessToken).toBe('mock-access-token');
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('shows message on invalid credentials', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Invalid credentials'));

      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/Work email/i), { target: { value: 'wrong@example.com' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrong' } });

      fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument();
      });
    });
  });
});
