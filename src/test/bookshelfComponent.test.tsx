import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../services/authContext';
import { BookshelfHome } from '../components/lessonPlan/BookshelfHome';
import { SubjectDetailView } from '../components/lessonPlan/SubjectDetailView';
import { resetToDemoData } from '../services/storage';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </AuthProvider>
  );
};

describe('Bookshelf React Component Rendering & Navigation', () => {
  beforeEach(() => {
    resetToDemoData();
  });

  it('renders "Your Learning Library" welcoming heading and search bar', () => {
    const handleSelectSubject = vi.fn();
    renderWithProviders(<BookshelfHome onSelectSubject={handleSelectSubject} />);

    expect(screen.getByText('Your Learning Library')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/search by subject name, code/i)
    ).toBeInTheDocument();
  });

  it('renders filter chips for All Subjects, Mirai Track, and University Track', () => {
    const handleSelectSubject = vi.fn();
    renderWithProviders(<BookshelfHome onSelectSubject={handleSelectSubject} />);

    expect(screen.getByRole('button', { name: /All Subjects/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mirai Track/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /University Track/i })).toBeInTheDocument();
  });

  it('filters books when Mirai Track and University Track chips are clicked', () => {
    const handleSelectSubject = vi.fn();
    renderWithProviders(<BookshelfHome onSelectSubject={handleSelectSubject} />);

    // Click University Track chip
    const univChip = screen.getByRole('button', { name: /University Track/i });
    fireEvent.click(univChip);

    // KCS301 (AKTU) should be in the document
    expect(screen.getAllByText('KCS301').length).toBeGreaterThan(0);

    // Click Mirai Track chip
    const miraiChip = screen.getByRole('button', { name: /Mirai Track/i });
    fireEvent.click(miraiChip);

    expect(screen.getAllByText('CS302').length).toBeGreaterThan(0);
  });

  it('filters books dynamically when typing in search input', () => {
    const handleSelectSubject = vi.fn();
    renderWithProviders(<BookshelfHome onSelectSubject={handleSelectSubject} />);

    const searchInput = screen.getByPlaceholderText(/search by subject name, code/i);
    fireEvent.change(searchInput, { target: { value: 'CS302' } });

    expect(screen.getByText('CS302')).toBeInTheDocument();
    // Non-matching code should not be shown
    expect(screen.queryByText('BCS301')).not.toBeInTheDocument();
  });

  it('calls onSelectSubject when a book is clicked', () => {
    const handleSelectSubject = vi.fn();
    renderWithProviders(<BookshelfHome onSelectSubject={handleSelectSubject} />);

    // Click on the first book
    const bookButtons = screen.getAllByRole('button', { name: /open syllabus for/i });
    expect(bookButtons.length).toBeGreaterThan(0);

    fireEvent.click(bookButtons[0]);
    expect(handleSelectSubject).toHaveBeenCalled();
  });

  it('opens Subject 1 (CS301 Data Structures & Algorithms) detail view with real syllabus and "Back to Library" action', () => {
    const handleBack = vi.fn();
    renderWithProviders(
      <SubjectDetailView subjectId="subj-gzb-cs301" onBack={handleBack} />
    );

    // Header and Back button
    const backBtn = screen.getByRole('button', { name: /back to library/i });
    expect(backBtn).toBeInTheDocument();

    // Subject title and metrics
    expect(screen.getAllByText(/Data Structures & Algorithms/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('CS301').length).toBeGreaterThan(0);
    expect(screen.getByText('Hours in Scope')).toBeInTheDocument();
    expect(screen.getByText('Covered Hours')).toBeInTheDocument();
    expect(screen.getByText('Remaining Hours')).toBeInTheDocument();
    expect(screen.getByText('Syllabus Structure')).toBeInTheDocument();

    // Clicking back button invokes handleBack
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('opens Subject 2 (KCS301 AKTU Board) detail view with AKTU units and topics', () => {
    const handleBack = vi.fn();
    renderWithProviders(
      <SubjectDetailView subjectId="subj-gzb-kcs301" onBack={handleBack} />
    );

    expect(screen.getAllByText('KCS301').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Data Structures \(AKTU Board\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/AKTU Unit I/i).length).toBeGreaterThan(0);
  });

  it('opens Subject 3 (BCS301 VTU Scheme) detail view with VTU units and topics', () => {
    const handleBack = vi.fn();
    renderWithProviders(
      <SubjectDetailView subjectId="subj-blr-bcs301" onBack={handleBack} />
    );

    expect(screen.getAllByText('BCS301').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Data Structures & Applications \(VTU Scheme\)/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/VTU Module 1/i)).toBeInTheDocument();
  });
});
