import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';
import { useQuizzes } from '@/hooks/use-cms-data';
import { useQuizQuestions } from '@/hooks/use-cms-data';

export default function TestsPage() {
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
      <div className="min-h-screen pt-24 pb-12 bg-[#0a0e1a] flex items-center justify-center text-white">
        Loading quizzes...
      </div>
    );
  }

  if (quizzesError || quizQuestionsError) {
    return (
      <div className="min-h-screen pt-24 pb-12 bg-[#0a0e1a] flex items-center justify-center text-red-400">
        Error loading quizzes: {quizzesError || quizQuestionsError}
      </div>
    );
  }

  if (!quizQuestionsLoading && selectedQuizId && quizQuestions.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-white/10">
        <CardContent className="p-8 text-center">
          <p className="text-gray-400 mb-4">
            This quiz has no questions yet. Check back soon!
          </p>
          <Button
            onClick={() => setSelectedQuizId(null)}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            Back to Quizzes
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-[#0a0e1a]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Astronomy Tests</h1>
          <p className="text-gray-400">Test your knowledge of the cosmos</p>
        </div>

        {!selectedQuizId ? (
          <Card className="bg-slate-900/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-center">Select a Quiz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quizzes.length === 0 ? (
                <p className="text-gray-400 text-center">No quizzes available yet. Check back soon!</p>
              ) : (
                quizzes.map(quiz => (
                  <Button 
                    key={quiz.id}
                    onClick={() => setSelectedQuizId(quiz.id)}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {quiz.title}
                  </Button>
                ))
              )}
            </CardContent>
          </Card>
        ) : (
          !showResult ? (
            <Card className="bg-slate-900/50 border-white/10">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">
                    {currentQuiz?.title} - Question {currentQuestionIndex + 1} of {quizQuestions.length}
                  </CardTitle>
                  <span className="text-orange-500 font-medium">
                    Score: {score}
                  </span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full mt-4">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all"
                    style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="text-xl text-white mb-6">
                  {currentQuestion?.question_text}
                </h3>
                <div className="space-y-3">
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
                      {option}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={handleNext}
                  disabled={selectedAnswerIndex === null}
                  className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {currentQuestionIndex === quizQuestions.length - 1 ? 'Finish' : 'Next Question'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-900/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-center">Test Complete!</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-8">
                  <div className="text-6xl font-bold text-orange-500 mb-2">
                    {score} / {quizQuestions.length}
                  </div>
                  <p className="text-gray-400">
                    {score === quizQuestions.length 
                      ? 'Perfect score! You are a true astronomer!' 
                      : score >= quizQuestions.length / 2 
                        ? 'Good job! Keep learning!' 
                        : 'Keep studying the cosmos!'}
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  {quizQuestions.map((q, index) => (
                    <div key={q.id} className="p-4 bg-slate-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        {userAnswers[index] === q.correct_answer ? (
                          <CheckCircle className="text-green-500 mt-1" size={20} />
                        ) : (
                          <XCircle className="text-red-500 mt-1" size={20} />
                        )}
                        <div>
                          <p className="text-white font-medium">{q.question_text}</p>
                          <p className="text-gray-400 text-sm mt-1">
                            Your answer: {q.options[userAnswers[index]]}
                          </p>
                          {userAnswers[index] !== q.correct_answer && (
                            <p className="text-green-400 text-sm">
                              Correct answer: {q.options[q.correct_answer]}
                            </p>
                          )}
                          {q.explanation && (
                            <p className="text-gray-500 text-sm mt-1">
                              Explanation: {q.explanation}
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
                  Take Test Again
                </Button>
                <Button
                  onClick={() => setSelectedQuizId(null)}
                  variant="outline"
                  className="w-full mt-2 border-white/10 text-white hover:bg-white/5"
                >
                  Choose Another Quiz
                </Button>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
