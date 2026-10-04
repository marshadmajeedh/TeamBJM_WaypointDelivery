import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserRole } from '@waypoint/shared';
import { AuthProvider, useAuth } from './AuthContext';
import { ProtectedRoute } from '../../routes/ProtectedRoute';
import { LoginPortal } from './LoginPortal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function renderWithAuth(initialPath: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPortal />} />
            <Route
              path="/store"
              element={
                <ProtectedRoute allowedRoles={[UserRole.STORE_MANAGER]}>
                  <div>Store Manager Content</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dispatcher"
              element={
                <ProtectedRoute allowedRoles={[UserRole.DISPATCHER]}>
                  <div>Dispatcher Content</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/loader"
              element={
                <ProtectedRoute allowedRoles={[UserRole.LOADER]}>
                  <div>Loader Content</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver"
              element={
                <ProtectedRoute allowedRoles={[UserRole.DRIVER]}>
                  <div>Driver Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Frontend Role-Based Authentication & Route Protection', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('redirects unauthenticated user accessing protected route to /login', async () => {
    renderWithAuth('/dispatcher');

    // Should be redirected to /login and display the Sign In heading
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeDefined();
    expect(screen.queryByText('Dispatcher Content')).toBeNull();
  });

  it('redirects unauthenticated user accessing /driver to /login', async () => {
    renderWithAuth('/driver');

    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeDefined();
    expect(screen.queryByText('Driver Content')).toBeNull();
  });

  it('allows access to authorized portal when user has matching role', async () => {
    sessionStorage.setItem('waypoint_token', 'valid-mock-jwt-token');
    sessionStorage.setItem(
      'waypoint_user',
      JSON.stringify({
        id: 'user-loader-1',
        email: 'loader@waypoint.local',
        role: UserRole.LOADER,
        name: 'Loader Test',
      })
    );

    renderWithAuth('/loader');

    expect(screen.getByText('Loader Content')).toBeDefined();
  });

  it('redirects user with wrong role to their own designated role portal (LOADER cannot access /dispatcher)', async () => {
    sessionStorage.setItem('waypoint_token', 'valid-mock-jwt-token');
    sessionStorage.setItem(
      'waypoint_user',
      JSON.stringify({
        id: 'user-loader-1',
        email: 'loader@waypoint.local',
        role: UserRole.LOADER,
        name: 'Loader Test',
      })
    );

    // Loader attempts to visit /dispatcher
    renderWithAuth('/dispatcher');

    // Should redirect to /loader and render Loader Content instead of Dispatcher Content
    await waitFor(() => {
      expect(screen.queryByText('Dispatcher Content')).toBeNull();
      expect(screen.getByText('Loader Content')).toBeDefined();
    });
  });

  it('redirects DRIVER attempting to access /store to /driver', async () => {
    sessionStorage.setItem('waypoint_token', 'valid-mock-jwt-token');
    sessionStorage.setItem(
      'waypoint_user',
      JSON.stringify({
        id: 'user-driver-1',
        email: 'driver@waypoint.local',
        role: UserRole.DRIVER,
        name: 'Driver Test',
      })
    );

    // Driver attempts to visit /store
    renderWithAuth('/store');

    await waitFor(() => {
      expect(screen.queryByText('Store Manager Content')).toBeNull();
      expect(screen.getByText('Driver Content')).toBeDefined();
    });
  });

  it('session storage is cleared on logout', async () => {
    sessionStorage.setItem('waypoint_token', 'token-to-be-cleared');
    sessionStorage.setItem(
      'waypoint_user',
      JSON.stringify({
        id: 'user-1',
        email: 'user@waypoint.local',
        role: UserRole.LOADER,
      })
    );

    const TestComponent = () => {
      const { logout, isAuthenticated } = useAuth();
      return (
        <div>
          <span>{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</span>
          <button onClick={logout}>Sign Out Button</button>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Authenticated')).toBeDefined();

    fireEvent.click(screen.getByText('Sign Out Button'));

    await waitFor(() => {
      expect(screen.getByText('Not Authenticated')).toBeDefined();
    });

    expect(sessionStorage.getItem('waypoint_token')).toBeNull();
    expect(sessionStorage.getItem('waypoint_user')).toBeNull();
  });
});
