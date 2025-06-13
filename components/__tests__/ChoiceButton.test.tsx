import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChoiceButton from '../ChoiceButton'; // Path relative to __tests__
import { Choice } from '../../types'; // Path relative to __tests__

describe('ChoiceButton component', () => {
  const mockChoice: Choice = {
    text: 'Go through the ancient door',
    outcomePrompt: 'Player chose the ancient door.',
  };

  const mockExamineChoice: Choice = {
    text: 'Examine the area',
    outcomePrompt: 'Player chose to examine.',
    isExamineAction: true,
  };

  const mockOnSelect = jest.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it('renders the choice text correctly', () => {
    render(<ChoiceButton choice={mockChoice} onSelect={mockOnSelect} disabled={false} />);
    expect(screen.getByText(mockChoice.text)).toBeInTheDocument();
  });

  it('calls onSelect with the choice when clicked', () => {
    render(<ChoiceButton choice={mockChoice} onSelect={mockOnSelect} disabled={false} />);
    const button = screen.getByRole('button', { name: mockChoice.text });
    fireEvent.click(button);
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith(mockChoice);
  });

  it('is disabled when the disabled prop is true', () => {
    render(<ChoiceButton choice={mockChoice} onSelect={mockOnSelect} disabled={true} />);
    const button = screen.getByRole('button', { name: mockChoice.text });
    expect(button).toBeDisabled();
  });

  it('does not call onSelect when clicked if disabled', () => {
    render(<ChoiceButton choice={mockChoice} onSelect={mockOnSelect} disabled={true} />);
    const button = screen.getByRole('button', { name: mockChoice.text });
    fireEvent.click(button);
    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  it('applies primary button styles by default', () => {
    render(<ChoiceButton choice={mockChoice} onSelect={mockOnSelect} disabled={false} />);
    const button = screen.getByRole('button', { name: mockChoice.text });
    expect(button).toHaveClass('bg-purple-600'); // Check for a class specific to primary
    expect(button).not.toHaveClass('bg-teal-600'); // Ensure examine class is not present
  });

  it('applies examine button styles when isExamineButton is true', () => {
    render(
      <ChoiceButton
        choice={mockExamineChoice}
        onSelect={mockOnSelect}
        disabled={false}
        isExamineButton={true}
      />
    );
    const button = screen.getByRole('button', { name: mockExamineChoice.text });
    expect(button).toHaveClass('bg-teal-600'); // Check for a class specific to examine
    expect(button).not.toHaveClass('bg-purple-600');
  });

  it('displays additional text for examine button', () => {
    render(
      <ChoiceButton
        choice={mockExamineChoice}
        onSelect={mockOnSelect}
        disabled={false}
        isExamineButton={true}
      />
    );
    expect(screen.getByText('(Observe more closely)')).toBeInTheDocument();
  });

  it('does not display additional text for normal button', () => {
    render(<ChoiceButton choice={mockChoice} onSelect={mockOnSelect} disabled={false} />);
    expect(screen.queryByText('(Observe more closely)')).not.toBeInTheDocument();
  });
});
