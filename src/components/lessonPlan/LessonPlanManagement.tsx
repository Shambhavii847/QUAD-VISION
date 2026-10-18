import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../services/authContext';
import { BookshelfHome } from './BookshelfHome';
import { SubjectDetailView } from './SubjectDetailView';
import { subscribeToDataChanges } from '../../services/storage';

export const LessonPlanManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSubjectId = searchParams.get('subject');

  // Reactive listener to refresh state whenever storage changes (e.g. topic update, unit add, recalculate)
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  const handleSelectSubject = (subjectId: string) => {
    setSearchParams({ subject: subjectId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToLibrary = () => {
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full">
      {selectedSubjectId ? (
        <SubjectDetailView
          subjectId={selectedSubjectId}
          onBack={handleBackToLibrary}
        />
      ) : (
        <BookshelfHome onSelectSubject={handleSelectSubject} />
      )}
    </div>
  );
};

export default LessonPlanManagement;
