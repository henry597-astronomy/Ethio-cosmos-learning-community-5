import { useMemo, useState, type ReactNode } from 'react';
import { LessonTutorContext, type ActiveLesson } from '@/context/LessonTutorContext';

export function LessonTutorProvider({ children }: { children: ReactNode }) {
  const [activeLesson, setActiveLesson] = useState<ActiveLesson | null>(null);
  const value = useMemo(() => ({ activeLesson, setActiveLesson }), [activeLesson]);

  return (
    <LessonTutorContext.Provider value={value}>
      {children}
    </LessonTutorContext.Provider>
  );
}
