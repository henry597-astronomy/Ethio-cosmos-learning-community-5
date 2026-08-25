import { createContext, useContext } from 'react';

export type ActiveLesson = {
  topicTitle: string;
  lessonTitle: string;
  lessonContent: string;
};

export type LessonTutorContextValue = {
  activeLesson: ActiveLesson | null;
  setActiveLesson: (lesson: ActiveLesson | null) => void;
};

export const LessonTutorContext = createContext<LessonTutorContextValue | undefined>(undefined);

export function useLessonTutorContext(): LessonTutorContextValue {
  const context = useContext(LessonTutorContext);
  if (!context) {
    throw new Error('useLessonTutorContext must be used inside LessonTutorProvider');
  }
  return context;
}
