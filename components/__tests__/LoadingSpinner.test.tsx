import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner component', () => {
  it('renders the spinner SVG', () => {
    const { container } = render(<LoadingSpinner />);
    const svgElement = container.querySelector('svg');
    expect(svgElement).toBeInTheDocument();
  });

  it('has the correct base classes for animation and color', () => {
    const { container } = render(<LoadingSpinner />);
    const svgElement = container.querySelector('svg');
    expect(svgElement).toHaveClass('animate-spin');
    expect(svgElement).toHaveClass('h-12');
    expect(svgElement).toHaveClass('w-12');
    expect(svgElement).toHaveClass('text-purple-400');
  });

  it('contains a circle element with opacity-25', () => {
    const { container } = render(<LoadingSpinner />);
    const svgElement = container.querySelector('svg');
    const circleElement = svgElement?.querySelector('circle');
    expect(circleElement).toBeInTheDocument();
    expect(circleElement).toHaveClass('opacity-25');
    expect(circleElement).toHaveAttribute('cx', '12');
    expect(circleElement).toHaveAttribute('cy', '12');
    expect(circleElement).toHaveAttribute('r', '10');
    expect(circleElement).toHaveAttribute('stroke', 'currentColor');
    expect(circleElement).toHaveAttribute('stroke-width', '4'); // Corrected attribute name
  });

  it('contains a path element with opacity-75', () => {
    const { container } = render(<LoadingSpinner />);
    const svgElement = container.querySelector('svg');
    const pathElement = svgElement?.querySelector('path');
    expect(pathElement).toBeInTheDocument();
    expect(pathElement).toHaveClass('opacity-75');
    expect(pathElement).toHaveAttribute('fill', 'currentColor');
  });
});
