import { render, screen, fireEvent } from '@testing-library/react';
import CreateClassModal from '../CreateClassModal';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// ✅ FIX: Mock both 'default' and named export to handle import resolution correctly
vi.mock('focus-trap-react', () => {
  const MockFocusTrap = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    __esModule: true,
    default: MockFocusTrap,
    FocusTrap: MockFocusTrap, // Adds the missing named export
  };
});

describe('CreateClassModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn((e) => e.preventDefault());
  const mockOnChange = vi.fn();
  
  const defaultProps = {
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
    loading: false,
    data: { name: '', description: '' },
    onChange: mockOnChange,
  };

  it('renders the modal content correctly', () => {
    render(<CreateClassModal {...defaultProps} />);
    
    expect(screen.getByRole('dialog', { name: /create class/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/class name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/description/i)).toBeInTheDocument();
  });

  it('calls onChange when inputs are typed into', () => {
    render(<CreateClassModal {...defaultProps} />);
    
    const nameInput = screen.getByPlaceholderText(/class name/i);
    fireEvent.change(nameInput, { target: { value: 'Physics 101' } });
    
    expect(mockOnChange).toHaveBeenCalledWith({
      name: 'Physics 101',
      description: ''
    });
  });

  it('submits the form when "Create Class" is clicked', () => {
    render(<CreateClassModal {...defaultProps} data={{ name: 'Math', description: '' }} />);
    
    const submitBtn = screen.getByRole('button', { name: /create class/i });
    fireEvent.click(submitBtn);
    
    expect(mockOnSubmit).toHaveBeenCalled();
  });

  it('disables the submit button when loading', () => {
    render(<CreateClassModal {...defaultProps} loading={true} />);
    
    const submitBtn = screen.getByRole('button', { name: /creating/i });
    expect(submitBtn).toBeDisabled();
  });

  it('closes the modal when Cancel is clicked', () => {
    render(<CreateClassModal {...defaultProps} />);
    
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);
    
    expect(mockOnClose).toHaveBeenCalled();
  });
});