import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../firebase";
import useClass from "../../../hooks/useClass";
import JoinClassPrompt from "../../../components/JoinClassPrompt";
import QuizAttemptModal from "../../../components/QuizAttemptModal";
import { useUser } from "../../../context/UserContext";

export default function Quizzes() {
  const { classId, loading, subjects } = useClass();
  const { user, userData } = useUser();
  const [quizzes, setQuizzes] = useState([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [quizSubmissions, setQuizSubmissions] = useState({});
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showQuizModal, setShowQuizModal] = useState(false);

  const loadQuizzes = async () => {
    try {
      setLoadingQuizzes(true);
      const quizzesRef = collection(db, "quizzes");
      const q = query(quizzesRef, where("classCode", "==", classId));
      const snapshot = await getDocs(q);
      const loadedQuizzes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setQuizzes(loadedQuizzes.sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor)));
      setSelectedSubject("");
    } catch (err) {
      console.error("Failed to load quizzes:", err);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const loadQuizSubmissions = async () => {
    try {
      const submissionsRef = collection(db, "quizSubmissions");
      const studentId = userData?.uid || user?.uid;
      if (!studentId) {
        console.warn("Cannot load quiz submissions: missing student ID");
        return;
      }

      const q = query(
        submissionsRef,
        where("studentId", "==", studentId),
        where("classCode", "==", classId)
      );
      const snapshot = await getDocs(q);
      const submissionMap = {};
      snapshot.docs.forEach((doc) => {
        submissionMap[doc.data().quizId] = { id: doc.id, ...doc.data() };
      });
      setQuizSubmissions(submissionMap);
    } catch (error) {
      console.error("Failed to load quiz submissions:", error);
    }
  };

  // Load quizzes when class changes
  useEffect(() => {
    if (!classId) return;
    loadQuizzes();
  }, [classId]);

  useEffect(() => {
    const studentId = userData?.uid || user?.uid;
    if (!classId || !studentId) return;
    loadQuizSubmissions();
  }, [classId, userData?.uid, user?.uid]);

  // Filter quizzes based on selected subject
  useEffect(() => {
    if (selectedSubject) {
      setFilteredQuizzes(quizzes.filter((q) => q.subject === selectedSubject));
    } else {
      setFilteredQuizzes(quizzes);
    }
  }, [selectedSubject, quizzes]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!classId) {
    return <JoinClassPrompt />;
  }

  const getQuizStatus = (scheduledFor, submittedAt) => {
    const now = new Date();
    const scheduled = new Date(scheduledFor);

    if (submittedAt) return "completed";
    if (scheduled > now) return "upcoming";
    return "active";
  };

  const getDaysUntilQuiz = (scheduledFor) => {
    const now = new Date();
    const scheduled = new Date(scheduledFor);
    const diffTime = scheduled - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return "Available now";
    } else if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Tomorrow";
    } else {
      return `In ${diffDays} days`;
    }
  };

  // 📊 stats
  const stats = [
    {
      title: "Total Quizzes",
      value: quizzes.length,
      color: "bg-blue-500",
    },
    {
      title: "Completed",
      value: quizzes.filter((q) => getQuizStatus(q.scheduledFor, quizSubmissions[q.id]?.submittedAt) === "completed").length,
      color: "bg-green-500",
    },
    {
      title: "Upcoming",
      value: quizzes.filter((q) => getQuizStatus(q.scheduledFor, quizSubmissions[q.id]?.submittedAt) === "upcoming").length,
      color: "bg-yellow-500",
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* Heading */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Quizzes</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Attempt and track your quizzes
        </p>
      </div>

      {/* 🔥 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((item, i) => (
          <div
            key={i}
            className={`p-4 rounded-2xl text-white shadow ${item.color}`}
          >
            <h2 className="text-xl font-bold">{item.value}</h2>
            <p className="text-sm">{item.title}</p>
          </div>
        ))}
      </div>

      {/* 🎯 Subject Filter */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">Filter by Subject</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedSubject("")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedSubject === ""
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow hover:bg-blue-500 hover:text-white"
            }`}
          >
            All Subjects
          </button>
          {subjects.map((sub) => (
            <button
              key={sub.name || sub}
              onClick={() => setSelectedSubject(sub.name || sub)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedSubject === (sub.name || sub)
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow hover:bg-blue-500 hover:text-white"
              }`}
            >
              {sub.name || sub}
            </button>
          ))}
        </div>
      </div>

      {/* 📋 Quiz List */}
      <div className="space-y-4">
        <h2 className="font-semibold text-lg">
          {selectedSubject ? `${selectedSubject} Quizzes` : "All Quizzes"}
        </h2>

        {loadingQuizzes ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            Loading quizzes...
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm text-center border border-gray-100 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400">
              {selectedSubject ? `No quizzes for ${selectedSubject}` : "No quizzes available yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQuizzes.map((quiz) => {
              const submission = quizSubmissions[quiz.id];
              const status = getQuizStatus(quiz.scheduledFor, submission?.submittedAt);
              const timeInfo = getDaysUntilQuiz(quiz.scheduledFor);

              return (
                <div
                  key={quiz.id}
                  className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex-grow">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {quiz.title}
                      </h3>
                      <div className="flex gap-3 mt-2 flex-wrap">
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                          {quiz.subject}
                        </span>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-200">
                          {quiz.totalQuestions || 0} Questions
                        </span>
                      </div>

                      {quiz.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                          {quiz.description}
                        </p>
                      )}

                      {quiz.resourceLink && (
                        <div className="mt-3">
                          <a
                            href={quiz.resourceLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex px-3 py-2 rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-200 hover:bg-green-200 transition text-sm"
                          >
                            Open quiz resource
                          </a>
                        </div>
                      )}

                      <div className="mt-3 flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Duration: {quiz.duration || 60} mins</span>
                        <span>Due: {timeInfo}</span>
                        {status === "completed" && submission && (
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            Score: {submission.score}/{submission.totalQuestions || quiz.totalQuestions || 0}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full text-center ${
                          status === "completed"
                            ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-200"
                            : status === "upcoming"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-200"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200"
                        }`}
                      >
                        {status === "completed"
                          ? "Completed"
                          : status === "upcoming"
                          ? "Upcoming"
                          : "Available"}
                      </span>

                      <button
                        onClick={() => {
                          if (status !== "active") return;
                          setSelectedQuiz(quiz);
                          setShowQuizModal(true);
                        }}
                        disabled={status !== "active"}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          status === "active"
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-gray-400 text-white cursor-not-allowed"
                        }`}
                      >
                        {status === "completed"
                          ? "Completed"
                          : status === "upcoming"
                          ? "Upcoming"
                          : status === "active"
                          ? "Start Quiz"
                          : "Unavailable"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <QuizAttemptModal
        quiz={selectedQuiz}
        classId={classId}
        isOpen={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        onSuccess={() => {
          loadQuizSubmissions();
        }}
      />

      {/* ❌ Empty State */}
      {quizzes.length === 0 && !loadingQuizzes && (
        <div className="text-center text-gray-500 mt-10">
          No quizzes assigned yet 📝
        </div>
      )}
    </div>
  );
}
         
     
      
  
