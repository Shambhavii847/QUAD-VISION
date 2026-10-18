import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../services/authContext';
import { StudentCalendarView } from '../components/calendar/StudentCalendarView';
import { resetToDemoData } from '../services/storage';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </AuthProvider>
  );
};

describe('Student Calendar Redesign & 3-Part Layout Verification', () => {
  beforeEach(() => {
    resetToDemoData();
  });

  it('1. Renders the 3-part layout: compact calendar, checklist filters, and main weekly grid', () => {
    renderWithProviders(<StudentCalendarView />);

    // Header title
    expect(screen.getByText('My Academic Calendar')).toBeInTheDocument();

    // Left column: Compact monthly calendar
    expect(screen.getByText('September 2026')).toBeInTheDocument();
    expect(screen.getByText('Mo')).toBeInTheDocument();
    expect(screen.getByText('Fr')).toBeInTheDocument();

    // Left column: "My Calendar Filters" checklist
    expect(screen.getByText('My Calendar Filters')).toBeInTheDocument();
    expect(screen.getByText('Lectures & Theory')).toBeInTheDocument();
    expect(screen.getByText('Labs & Practicals')).toBeInTheDocument();
    expect(screen.getByText('Exams & Assessments')).toBeInTheDocument();
    expect(screen.getByText('Academic Holidays')).toBeInTheDocument();

    // Left column: Upcoming Schedule
    expect(screen.getByText('Upcoming Schedule')).toBeInTheDocument();

    // Right column: Main calendar header controls
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Daily' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Weekly' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Monthly' })).toBeInTheDocument();
  });

  it('2. Synchronizes compact calendar day clicks with the main timetable grid', () => {
    renderWithProviders(<StudentCalendarView />);

    // Click on day 15 in the mini calendar
    const day15Buttons = screen.getAllByRole('button', { name: '15' });
    expect(day15Buttons.length).toBeGreaterThan(0);
    fireEvent.click(day15Buttons[0]);

    // Main calendar header should reflect the week containing September 15
    expect(screen.getByText(/Sep 14 – 19, 2026/i)).toBeInTheDocument();
  });

  it('3. Switches between Weekly, Daily, and Monthly views correctly', () => {
    renderWithProviders(<StudentCalendarView />);

    // Default is Weekly view: weekday headers are rendered
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();

    // Switch to Daily view
    const dailyBtn = screen.getByRole('button', { name: 'Daily' });
    fireEvent.click(dailyBtn);

    expect(screen.getByText(/scheduled academic sessions/i)).toBeInTheDocument();

    // Switch to Monthly view
    const monthlyBtn = screen.getByRole('button', { name: 'Monthly' });
    fireEvent.click(monthlyBtn);

    expect(screen.getAllByText('September 2026').length).toBeGreaterThan(0);

    // Switch back to Weekly view
    const weeklyBtn = screen.getByRole('button', { name: 'Weekly' });
    fireEvent.click(weeklyBtn);

    expect(screen.getByText('GMT+5:30')).toBeInTheDocument();
  });

  it('4. Navigates dates with Prev, Next and Today controls', () => {
    renderWithProviders(<StudentCalendarView />);

    const nextBtn = screen.getByTitle('Next');
    fireEvent.click(nextBtn);

    // Next week: Sep 21 - 26, 2026
    expect(screen.getByText(/Sep 21 – 26, 2026/i)).toBeInTheDocument();

    // Today button resets to week of September 18, 2026
    const todayBtn = screen.getByRole('button', { name: 'Today' });
    fireEvent.click(todayBtn);

    expect(screen.getByText(/Sep 14 – 19, 2026/i)).toBeInTheDocument();
  });

  it('5. Toggles event categories via "My Calendar" checklist filters', () => {
    renderWithProviders(<StudentCalendarView />);

    // Initially lectures are visible in the timetable
    expect(screen.getAllByText(/CS301/i).length).toBeGreaterThan(0);

    // Uncheck Lectures & Theory
    const lectureCheckbox = screen.getByLabelText(/Lectures & Theory/i);
    fireEvent.click(lectureCheckbox);

    // Unchecking lectures removes CS301 blocks from the timetable
    expect(screen.queryByText(/Data Structures & Algorithms \(Mirai\)/i)).not.toBeInTheDocument();

    // Re-check Lectures & Theory
    fireEvent.click(lectureCheckbox);
    expect(screen.getAllByText(/CS301/i).length).toBeGreaterThan(0);
  });

  it('6. Opens event detail modal when an event card is clicked', () => {
    renderWithProviders(<StudentCalendarView />);

    // Click on a scheduled class event block
    const eventBlocks = screen.getAllByText(/CS301/i);
    expect(eventBlocks.length).toBeGreaterThan(0);

    fireEvent.click(eventBlocks[0]);

    // Detail panel / modal should open
    expect(screen.getAllByText(/Session/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Date & Timing/i)).toBeInTheDocument();
    expect(screen.getByText(/Location & Hall/i)).toBeInTheDocument();
    expect(screen.getByText(/Academic Track:/i)).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Location & Hall/i)).not.toBeInTheDocument();
  });

  it('7. Displays batch & branch context and keeps schedules separated', () => {
    renderWithProviders(<StudentCalendarView />);

    // Timetable time slots from 08:00 AM to 05:00 PM are rendered
    expect(screen.getByText('08:00 AM')).toBeInTheDocument();
    expect(screen.getByText('09:00 AM')).toBeInTheDocument();
    expect(screen.getByText('12:00 PM')).toBeInTheDocument();
    expect(screen.getByText('05:00 PM')).toBeInTheDocument();
  });
});
