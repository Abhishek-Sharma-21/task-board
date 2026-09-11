import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';

describe('App', () => {
  it('renders title', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.queryAllByText(/ForgeBoard/i).length).toBeGreaterThan(0);
    });
  });
});