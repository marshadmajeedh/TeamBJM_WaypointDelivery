import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('Web App Routing Foundation', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.pushState(null, '', '/');
  });

  it('renders Waypoint brand and Team BJM markers in layout', () => {
    render(<App />);
    expect(screen.getByText('Waypoint')).toBeDefined();
    const teamBadges = screen.getAllByText('Team BJM');
    expect(teamBadges.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Store Manager Portal')).toBeDefined();
    expect(screen.getByText('Dispatcher Portal')).toBeDefined();
  });

  it('uses the standard full-layout login after an unauthenticated driver redirect', async () => {
    window.history.pushState(null, '', '/driver');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeDefined();
    expect(screen.getByText('Waypoint Delivery Planning System')).toBeDefined();
    expect(screen.getByText('Seeded Foundation Accounts:')).toBeDefined();
    expect(screen.getByText('Waypoint')).toBeDefined();
    expect(screen.queryByText('Driver Safety Notice')).toBeNull();
  });
});
