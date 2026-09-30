import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('Web App Routing Foundation', () => {
  it('renders Waypoint brand and Team BJM markers in layout', () => {
    render(<App />);
    expect(screen.getByText('Waypoint')).toBeDefined();
    const teamBadges = screen.getAllByText('Team BJM');
    expect(teamBadges.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Store Manager Portal')).toBeDefined();
    expect(screen.getByText('Dispatcher Portal')).toBeDefined();
  });
});
