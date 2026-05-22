import React, { useState } from 'react';
import { generateLessonPlan } from '../services/aiService';

export default function AILessonPlanner({ selectedClass, selectedSubject }) {
  const [topic, setTopic] = useState('');
  const [gradeLevel, setGradeLevel] = useState('High School');
  const [duration, setDuration] = useState(60);
  const [objectives, setObjectives] = useState('');
  const [generating, setGenerating] = useState(false);
  const [lessonPlan, setLessonPlan] = useState(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    if (!objectives.trim()) {
      setError('Please enter learning objectives');
      return;
    }

    if (!selectedClass || !selectedSubject) {
      setError('Please select a class and subject first');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const plan = await generateLessonPlan(topic, selectedSubject, gradeLevel, duration, objectives);
      setLessonPlan(plan);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAsNote = () => {
    if (!lessonPlan) return;

    // Create a note from the lesson plan
    const noteContent = `
# ${lessonPlan.title}

**Duration:** ${lessonPlan.duration} minutes
**Grade Level:** ${gradeLevel}
**Subject:** ${selectedSubject}

## Learning Objectives
${lessonPlan.objectives.map(obj => `- ${obj}`).join('\n')}

## Materials Needed
${lessonPlan.materials.map(mat => `- ${mat}`).join('\n')}

## Introduction
${lessonPlan.introduction}

## Main Activities
${lessonPlan.mainActivities.map(act => `- ${act}`).join('\n')}

## Practice
${lessonPlan.practice}

## Assessment
${lessonPlan.assessment}

## Differentiation
${lessonPlan.differentiation}
    `;

    // You could emit an event or use a callback to save this as a note
    alert('Lesson plan copied to clipboard! You can now create a note with this content.');
    navigator.clipboard.writeText(noteContent);
  };

  return (
    <div className="rounded-2xl bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 border border-green-200 dark:border-green-800 p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-2xl">📚</div>
        <div>
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
            AI Lesson Planner
          </h3>
          <p className="text-sm text-green-600 dark:text-green-300">
            Generate comprehensive lesson plans automatically
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Photosynthesis, Quadratic Equations"
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Grade Level
            </label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Elementary">Elementary</option>
              <option value="Middle School">Middle School</option>
              <option value="High School">High School</option>
              <option value="College">College</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Duration (minutes)
          </label>
          <input
            type="number"
            min="15"
            max="180"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Learning Objectives
          </label>
          <textarea
            value={objectives}
            onChange={(e) => setObjectives(e.target.value)}
            placeholder="e.g., Students will be able to explain the process of photosynthesis and identify its key components..."
            rows="3"
            className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating || !topic.trim() || !objectives.trim()}
          className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Generating Lesson Plan...
            </>
          ) : (
            <>
              <span>📝</span>
              Generate Lesson Plan
            </>
          )}
        </button>

        {lessonPlan && (
          <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">{lessonPlan.title}</h4>
              <button
                onClick={handleSaveAsNote}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Save as Note
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div><strong>Duration:</strong> {lessonPlan.duration} minutes</div>
              <div><strong>Objectives:</strong> {lessonPlan.objectives.join(', ')}</div>
              <div><strong>Materials:</strong> {lessonPlan.materials.join(', ')}</div>

              <div>
                <strong>Introduction:</strong>
                <p className="mt-1 text-gray-600 dark:text-gray-300">{lessonPlan.introduction}</p>
              </div>

              <div>
                <strong>Main Activities:</strong>
                <ul className="mt-1 list-disc list-inside text-gray-600 dark:text-gray-300">
                  {lessonPlan.mainActivities.map((activity, idx) => (
                    <li key={idx}>{activity}</li>
                  ))}
                </ul>
              </div>

              <div>
                <strong>Practice:</strong>
                <p className="mt-1 text-gray-600 dark:text-gray-300">{lessonPlan.practice}</p>
              </div>

              <div>
                <strong>Assessment:</strong>
                <p className="mt-1 text-gray-600 dark:text-gray-300">{lessonPlan.assessment}</p>
              </div>

              <div>
                <strong>Differentiation:</strong>
                <p className="mt-1 text-gray-600 dark:text-gray-300">{lessonPlan.differentiation}</p>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Powered by GPT-4 • Comprehensive, standards-aligned lesson plans
        </div>
      </div>
    </div>
  );
}