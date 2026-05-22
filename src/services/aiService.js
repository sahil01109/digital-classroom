// AI service using OpenAI
import { OpenAI } from 'openai';

// WARNING: Exposing OpenAI API keys in browser code is insecure for production applications.
// If you deploy this app publicly, move OpenAI requests to a secure backend or proxy.
let openai = null;

const initializeOpenAI = () => {
  if (openai) return openai;

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OpenAI API key not configured. AI features will use fallback mode.');
    return null;
  }

  openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });
  return openai;
};

const getOpenAIClient = () => {
  return openai || initializeOpenAI();
};

const createFallbackQuiz = (topic, subject, difficulty, numQuestions) => {
  return Array.from({ length: numQuestions }, (_, index) => {
    const questionNumber = index + 1;
    return {
      prompt: `Question ${questionNumber}: What is a key idea related to "${topic}" in ${subject}?`,
      options: [
        `A) The main idea or concept behind ${topic}`,
        `B) A partially related idea that is not the best answer`,
        `C) An unrelated statement in ${subject}`,
        `D) A distractor answer that sounds plausible`
      ],
      correctAnswer: 'A',
      explanation: `The best answer highlights the central idea of ${topic} within the subject of ${subject}.`
    };
  });
};

export const generateQuizFromTopic = async (topic, subject, difficulty = 'medium', numQuestions = 5) => {
  try {
    const client = getOpenAIClient();
    if (!client) {
      console.warn('OpenAI not configured. Using fallback quiz generator.');
      return createFallbackQuiz(topic, subject, difficulty, numQuestions);
    }

    const prompt = `Generate ${numQuestions} multiple-choice questions on the topic "${topic}" in the subject "${subject}". Difficulty level: ${difficulty}.

For each question, provide:
1. The question prompt
2. Four answer options labeled A), B), C), D)
3. The correct answer (just the letter, e.g., "A")
4. A brief explanation of why the answer is correct

Format the response as a JSON array of objects with keys: prompt, options (array of strings), correctAnswer (string), explanation (string).

Make sure the questions are educational, accurate, and appropriate for students.`;

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educator creating high-quality quiz questions. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    let questions;

    try {
      questions = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', content);
      throw new Error('OpenAI returned invalid JSON. Please try again.');
    }

    return questions;
  } catch (error) {
    console.error('Failed to generate quiz:', error);
    const statusCode = error?.response?.status || error?.status || error?.code;
    const message = error?.message?.toLowerCase() || '';

    if (statusCode === 401 || message.includes('invalid api key')) {
      console.warn('Invalid API key. Using fallback quiz generator.');
      return createFallbackQuiz(topic, subject, difficulty, numQuestions);
    }

    if (statusCode === 429 || message.includes('rate limit')) {
      console.warn('OpenAI rate limit exceeded. Falling back to local quiz generator.');
      return createFallbackQuiz(topic, subject, difficulty, numQuestions);
    }

    if (message.includes('insufficient_quota') || message.includes('quota')) {
      console.warn('OpenAI API quota exceeded. Using fallback generator.');
      return createFallbackQuiz(topic, subject, difficulty, numQuestions);
    }

    throw new Error(`Failed to generate quiz: ${error?.message || 'Unknown error.'}`);
  }
};

export const generateAIFeedback = async (assignment) => {
  try {
    const client = getOpenAIClient();
    if (!client) {
      throw new Error('OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your .env file to use AI feedback.');
    }

    const prompt = `As an experienced educator, provide constructive feedback for this assignment:\n\nAssignment Title: ${assignment.title}\nSubject: ${assignment.subject}\nAssignment Type: ${assignment.assignmentType}\n\n${assignment.assignmentType === 'question' ? `Question: ${assignment.questionContent}` : `Description: ${assignment.description}`}\n\nPlease provide:\n1. Strengths of this assignment\n2. Areas for improvement\n3. Suggestions for student engagement\n4. Recommended grade criteria (if applicable)\n\nKeep the feedback professional, actionable, and encouraging.`;

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational consultant providing feedback on assignments.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0]?.message?.content || 'No feedback generated.';
  } catch (error) {
    console.error('Failed to generate AI feedback:', error);

    const message = error?.message?.toLowerCase() || '';
    if (message.includes('invalid api key') || message.includes('not configured')) {
      throw new Error('Invalid or missing OpenAI API key. Please check your .env file.');
    }

    if (message.includes('rate limit') || message.includes('insufficient_quota') || message.includes('quota')) {
      throw new Error('OpenAI API rate limit or quota issue occurred. Please try again later.');
    }

    throw new Error('Failed to generate AI feedback.');
  }
};

export const generateLessonPlan = async (topic, subject, gradeLevel, duration, objectives) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  return {
    title: `Lesson Plan: ${topic} in ${subject}`,
    duration: duration,
    objectives: objectives.split(',').map(obj => obj.trim()),
    materials: ["Whiteboard", "Projector", "Handouts", "Digital resources"],
    introduction: `Begin with a discussion on what students already know about ${topic}. Show a relevant video or demonstration to engage interest.`,
    mainActivities: [
      `Direct instruction: Explain key concepts of ${topic}`,
      `Guided practice: Work through examples together`,
      `Independent practice: Students apply concepts individually`
    ],
    practice: "Provide worksheets and group activities for reinforcement",
    assessment: "Exit ticket quiz and observation of participation",
    differentiation: "Offer graphic organizers for visual learners, pair advanced students as peer tutors"
  };
};

export const analyzeStudentPerformance = async (studentData, assignments, quizzes) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1200));

  return {
    performanceLevel: "Good",
    strengths: ["Consistent attendance", "Good participation in class activities"],
    weaknesses: ["Needs improvement in written assignments", "Struggles with timed quizzes"],
    prediction: "Expected to improve with additional support and practice",
    recommendations: [
      "Provide extra help sessions after class",
      "Offer extended time for quizzes",
      "Encourage use of study guides for assignments"
    ],
    focusAreas: ["Written communication", "Time management", "Practice with quiz formats"]
  };
};