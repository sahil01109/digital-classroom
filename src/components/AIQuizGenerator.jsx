import React, { useState } from 'react';
import { generateQuizFromTopic } from '../services/aiService';

export default function AIQuizGenerator({ onQuizGenerated, selectedClass, selectedSubject }) {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    if (!selectedClass || !selectedSubject) {
      setError('Please select a class and subject first');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const questions = await generateQuizFromTopic(topic, selectedSubject, difficulty, numQuestions);

      // Convert AI-generated questions to the format expected by QuizBuilder
      const formattedQuestions = questions.map((q, index) => {
        const options = q.options.map(opt => opt.replace(/^[A-D]\)\s*/, ''));
        let correctAnswer = q.correctAnswer.replace(/^[A-D]\)\s*/, '');

        const letterMatch = correctAnswer.trim().toUpperCase().match(/^[A-D]$/);
        if (letterMatch) {
          const letterIndex = letterMatch[0].charCodeAt(0) - 65;
          correctAnswer = options[letterIndex] || correctAnswer;
        }

        return {
          id: Date.now() + index,
          prompt: q.prompt,
          options,
          correctAnswer,
          explanation: q.explanation
        };
      });

      onQuizGenerated({
        title: `${topic} Quiz`,
        description: `AI-generated quiz on ${topic} (${difficulty} difficulty)`,
        questions: formattedQuestions,
        topic,
        difficulty,
        generatedByAI: true
      });

      setTopic('');
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200 dark:border-purple-800 p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-2xl">🤖</div>
        <div>
          <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200">
            AI Quiz Generator
          </h3>
          <p className="text-sm text-purple-600 dark:text-purple-300">
            Generate quiz questions automatically from any topic
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Photosynthesis, World War II, Algebra Equations"
            className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Questions
            </label>
            <select
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value={3}>3 Questions</option>
              <option value={5}>5 Questions</option>
              <option value={10}>10 Questions</option>
              <option value={15}>15 Questions</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating || !topic.trim()}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Generating Quiz...
            </>
          ) : (
            <>
              <span>🚀</span>
              Generate AI Quiz
            </>
          )}
        </button>

        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Powered by GPT-3.5-turbo • Make sure to add your OpenAI API key to .env file
        </div>
      </div>
    </div>
  );
}