import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useUser } from "../context/UserContext";

export default function QuizAttemptModal({ quiz, classId, isOpen, onClose, onSuccess }) {
  const { user, userData } = useUser();
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && quiz && userData?.uid) {
      loadExistingSubmission();
    }
  }, [isOpen, quiz?.id, userData?.uid]);

  const loadExistingSubmission = async () => {
    try {
      const userId = userData?.uid || user?.uid;
      if (!userId) {
        return;
      }

      const submissionsRef = collection(db, "quizSubmissions");
      const q = query(
        submissionsRef,
        where("quizId", "==", quiz.id),
        where("studentId", "==", userId)
      );
      const snapshot = await getDocs(q);

      if (snapshot.docs.length > 0) {
        const docSnap = snapshot.docs[0];
        setExistingSubmission({ id: docSnap.id, ...docSnap.data() });
        setAnswers(docSnap.data().studentAnswers || {});
      } else {
        setExistingSubmission(null);
        setAnswers({});
      }
    } catch (error) {
      console.error("Failed to load quiz submission:", error);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const calculateScore = () => {
    if (!quiz?.questions?.length) return 0;

    return quiz.questions.reduce((score, question) => {
      const selected = answers[question.id];
      return selected === question.correctAnswer ? score + 1 : score;
    }, 0);
  };

  const handleSubmit = async (event) => {
    if (event?.preventDefault) {
      event.preventDefault();
    }

    setError("");

    const userId = userData?.uid || user?.uid;
    if (!quiz || !userId) {
      setError("Cannot submit quiz yet. Please try again.");
      return;
    }
    if (!quiz.questions?.length) {
      setError("No questions found on this quiz.");
      return;
    }

    const answeredQuestions = quiz.questions.filter(
      (question) => answers[question.id] !== undefined && answers[question.id] !== ""
    );

    if (answeredQuestions.length !== quiz.questions.length) {
      setError("Please answer all questions before submitting.");
      return;
    }

    setLoading(true);

    try {
      const userId = userData?.uid || user?.uid;
      const submissionId = existingSubmission?.id || `${quiz.id}_${userId}_${Date.now()}`;
      const score = calculateScore();

      await setDoc(doc(db, "quizSubmissions", submissionId), {
        quizId: quiz.id,
        classCode: classId,
        studentId: userId,
        studentName: userData.name || "Student",
        studentEmail: userData.email || "",
        studentAnswers: answers,
        score,
        totalQuestions: quiz.questions.length,
        submittedAt: new Date().toISOString(),
        status: "completed",
        createdAt: serverTimestamp(),
      });

      alert("Quiz submitted successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to submit quiz:", error);
      setError("Failed to submit quiz. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !quiz) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-4xl w-full max-h-[calc(100vh-2rem)] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{existingSubmission ? "Review Quiz" : "Take Quiz"}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{quiz.title}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:hover:text-white text-xl">✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          {error && (
            <div className="mx-6 mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
              {error}
            </div>
          )}
          <div className="space-y-6 overflow-y-auto px-6 py-6 max-h-[calc(100vh-22rem)]">
            {quiz.questions?.map((question, index) => (
              <div key={question.id || index} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-950">
                <div className="flex items-center justify-between mb-3 gap-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Question {index + 1}</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{question.points ?? 1} pt</span>
                </div>
                <p className="text-gray-700 dark:text-gray-200 mb-4">{question.prompt}</p>

                <div className="space-y-2">
                  {question.options?.map((option) => (
                    <label key={option} className="flex items-center gap-3 cursor-pointer rounded-xl border border-gray-200 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <input
                        type="radio"
                        name={`question-${index}`}
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={() => handleAnswerChange(question.id, option)}
                        className="form-radio h-4 w-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-200">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {existingSubmission && (
              <div className="rounded-2xl bg-blue-50 dark:bg-blue-950 p-4 text-sm text-blue-800 dark:text-blue-200">
                You already completed this quiz on {new Date(existingSubmission.submittedAt).toLocaleDateString()} with a score of {existingSubmission.score}/{existingSubmission.totalQuestions}.
              </div>
            )}
          </div>

          <div className="sticky bottom-0 left-0 z-10 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4 flex flex-col sm:flex-row gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !!existingSubmission}
              className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Submitting..." : existingSubmission ? "Already Submitted" : "Submit Quiz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
