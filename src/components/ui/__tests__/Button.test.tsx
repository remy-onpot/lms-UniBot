import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';
import { describe, it, expect, vi } from 'vitest';

describe('Button Component', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    
    expect(button).toBeDefined();
    expect(button?.className).toContain('bg-blue-600'); // Default primary variant
  });

  it('applies the correct variant classes', () => {
    const { rerender } = render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button').className).toContain('bg-red-50');

    rerender(<Button variant="outline">Cancel</Button>);
    expect(screen.getByRole('button').className).toContain('border-slate-100');
  });

  it('applies the correct size classes', () => {
    render(<Button size="xl">Big Button</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('w-full');
    expect(button.className).toContain('py-4');
    expect(button.className).toContain('text-lg');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is passed', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button') as HTMLButtonElement;
    
    expect(button.disabled).toBe(true);
    expect(button.className).toContain('disabled:opacity-50');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<Button ref={ref}>Ref Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});