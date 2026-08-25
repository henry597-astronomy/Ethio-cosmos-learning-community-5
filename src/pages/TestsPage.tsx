import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';
import { useQuizzes } from '@/hooks/use-cms-data';
import { useQuizQuestions } from '@/hooks/use-cms-data';
import { useAppLanguage } from '@/context/AppLanguageContext';
import LocalizedOfficialText from '@/components/LocalizedOfficialText';

export default function TestsPage() {
  const { t } = useAppLanguage();
  const quizzesHook = useQuizzes();
  const { quizzes, loading: quizzesLoading, error: quizzesError } = quizzesHook;

  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);

  const {
    quizQuestions,
    loading: quizQuestionsLoading,
    error: quizQuestionsError,
  } = useQuizQuestions(selectedQuizId);

  const currentQuiz = quizzes.find(q => q.id === selectedQuizId);
  const currentQuestion = quizQuestions[currentQuestionIndex];

  useEffect(() => {
    // Reset quiz state when selectedQuizId changes
    setCurrentQuestionIndex(0);
    setSelectedAnswerIndex(null);
    setShowResult(false);
    setScore(0);
    setUserAnswers([]);
  }, [selectedQuizId]);

  const handleAnswer = (answerIndex: number) => {
    setSelectedAnswerIndex(answerIndex);
  };

  const handleNext = () => {
    if (selectedAnswerIndex !== null && currentQuestion) {
      const newAnswers = [...userAnswers, selectedAnswerIndex];
      setUserAnswers(newAnswers);
      
      if (selectedAnswerIndex === currentQuestion.correct_answer) {
        setScore(score + 1);
      }

      if (currentQuestionIndex < quizQuestions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswerIndex(null);
      } else {
        setShowResult(true);
      }
    }
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswerIndex(null);
    setShowResult(false);
    setScore(0);
    setUserAnswers([]);
  };

  if (quizzesLoading || quizQuestionsLoading) {
    return (
      <div className="min-h-screen pt-24 bg-[#0a0e1a] flex items-center justify-center text-white" style={{ paddingBottom: 'calc(3rem + max(0px, env(safe-area-inset-bottom)))' }}>
        {t('loading')}
      </div>
    );
  }

  if (quizzesError || quizQuestionsError) {
    return (
      <div className="min-h-screen pt-24 bg-[#0a0e1a] flex items-center justify-center text-red-400" style={{ paddingBottom: 'calc(3rem + max(0px, env(safe-area-inset-bottom)))' }}>
        {t('errorLoadingQuizzes')} {quizzesError || quizQuestionsError}
      </div>
    );
  }

  if (!quizQuestionsLoading && selectedQuizId && quizQuestions.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-white/10">
        <CardContent className="p-8 text-center">
          <p className="text-gray-400 mb-4">
            {t('quizNoQuestions')}
          </p>
          <Button
            onClick={() => setSelectedQuizId(null)}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {t('backToQuizzes')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen pt-24 bg-[#0a0e1a]" style={{ paddingBottom: 'calc(3rem + max(0px, env(safe-area-inset-bottom)))' }}>
      <div className="max-w-3xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{t('astronomyTests')}</h1>
          <p className="text-gray-400 text-sm">{t('testYourKnowledge')}</p>
        </div>

        {!selectedQuizId ? (
          <Card className="bg-slate-900/50 border-white/10 rounded-lg">
            <CardHeader className="py-4">
              <CardTitle className="text-lg text-white text-center">{t('selectQuiz')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-6">
              {quizzes.length === 0 ? (
                <p className="text-gray-400 text-center">{t('noQuizzes')}</p>
              ) : (
                quizzes.map(quiz => (
                  <Button 
                    key={quiz.id}
                    onClick={() => setSelectedQuizId(quiz.id)}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <LocalizedOfficialText sourceType="quiz" sourceId={quiz.id} field="title" sourceText={quiz.title} sourceUpdatedAt={quiz.updated_at} />
                  </Button>
                ))
              )}
            </CardContent>
          </Card>
        ) : (
          !showResult ? (
            <Card className="bg-slate-900/50 border-white/10 rounded-lg">
              <CardHeader className="py-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg text-white">
                    {currentQuiz ? (
                      <LocalizedOfficialText sourceType="quiz" sourceId={currentQuiz.id} field="title" sourceText={currentQuiz.title} sourceUpdatedAt={currentQuiz.updated_at} />
                    ) : null}
                  </CardTitle>
                  <span className="text-orange-500 font-medium">
                    {t('score')}: {score}
                  </span>
                </div>
                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-3">
                  <div 
                    className="bg-orange-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-500 text-center">
                  {t('question')} {currentQuestionIndex + 1} {t('of')} {quizQuestions.length}
                </div>
              </CardHeader>
              <CardContent className="pb-6">
                <h3 className="text-lg text-white mb-4">
                  {currentQuestion ? (
                    <LocalizedOfficialText sourceType="quiz_question" sourceId={currentQuestion.id} field="question_text" sourceText={currentQuestion.question_text} sourceUpdatedAt={currentQuestion.updated_at} />
                  ) : null}
                </h3>
                <div className="space-y-2">
                  {currentQuestion?.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswer(index)}
                      className={`w-full p-4 text-left rounded-lg border transition-all ${
                        selectedAnswerIndex === index
                          ? 'border-orange-500 bg-orange-500/20 text-white'
                          : 'border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/5'
                      }`}
                    >
                      <LocalizedOfficialText sourceType="quiz_question" sourceId={currentQuestion?.id || 'unknown'} field={`options.${index}`} sourceText={option} sourceUpdatedAt={currentQuestion?.updated_at} />
                    </button>
                  ))}
                </div>
                <Button
                  onClick={handleNext}
                  disabled={selectedAnswerIndex === null}
                  className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {currentQuestionIndex === quizQuestions.length - 1 ? t('finish') : t('nextQuestion')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-900/50 border-white/10 rounded-lg">
              <CardHeader className="py-4">
                <CardTitle className="text-lg text-white text-center">{t('testComplete')}</CardTitle>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="text-center mb-6">
                  <div className="text-6xl font-bold text-orange-500 mb-2">
                    {score} / {quizQuestions.length}
                  </div>
                  <p className="text-gray-400">
                    {score === quizQuestions.length 
                      ? t('perfectScore')
                      : score >= quizQuestions.length / 2
                        ? t('goodJob')
                        : t('keepStudying')}
                  </p>
                </div>

                <div className="space-y-2 mb-6">
                  {quizQuestions.map((q, index) => (
                    <div key={q.id} className="p-3 bg-slate-800/50 rounded-lg border border-white/5">
                      <div className="flex items-start gap-3">
                        {userAnswers[index] === q.correct_answer ? (
                          <CheckCircle className="text-green-500 mt-1" size={20} />
                        ) : (
                          <XCircle className="text-red-500 mt-1" size={20} />
                        )}
                        <div>
                          <p className="text-white font-medium">
                            <LocalizedOfficialText sourceType="quiz_question" sourceId={q.id} field="question_text" sourceText={q.question_text} sourceUpdatedAt={q.updated_at} />
                          </p>
                          <p className="text-gray-400 text-sm mt-1">
                            {t('yourAnswer')}: <LocalizedOfficialText sourceType="quiz_question" sourceId={q.id} field={`options.${userAnswers[index]}`} sourceText={q.options[userAnswers[index]] || ''} sourceUpdatedAt={q.updated_at} />
                          </p>
                          {userAnswers[index] !== q.correct_answer && (
                            <p className="text-green-400 text-sm">
                              {t('correctAnswer')}: <LocalizedOfficialText sourceType="quiz_question" sourceId={q.id} field={`options.${q.correct_answer}`} sourceText={q.options[q.correct_answer] || ''} sourceUpdatedAt={q.updated_at} />
                            </p>
                          )}
                          {q.explanation && (
                            <p className="text-gray-500 text-sm mt-1">
                              {t('explanation')}: <LocalizedOfficialText sourceType="quiz_question" sourceId={q.id} field="explanation" sourceText={q.explanation} sourceUpdatedAt={q.updated_at} />
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={resetQuiz}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {t('takeTestAgain')}
                </Button>
                <Button
                  onClick={() => setSelectedQuizId(null)}
                  variant="outline"
                  className="w-full mt-2 border-white/10 text-white hover:bg-white/5"
                >
                  {t('chooseAnotherQuiz')}
                </Button>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
