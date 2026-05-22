import React, { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { useUser } from "../../../context/UserContext";
import AIQuizGenerator from "../../../components/AIQuizGenerator";

function createEmptyQuestion(id) {
  return {
    id,
    prompt: "",
    options: ["", "", "", ""],
    correctAnswer: "",
  };
}

export default function QuizBuilder() {
  const { user } = useUser();

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceLink, setResourceLink] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [duration, setDuration] = useState(30);

  const [manualQuestions, setManualQuestions] = useState([
    createEmptyQuestion(Date.now()),
  ]);

  const [aiQuestions, setAiQuestions] = useState([]);

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [aiGeneratedQuiz, setAiGeneratedQuiz] = useState(null);
  const [showManualBuilder, setShowManualBuilder] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadClasses();
    loadQuizzes();
  }, [user]);

  const loadClasses = async () => {
    try {
      const snapshot = await getDocs(collection(db, "classes"));
      const allClasses = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const myClasses = allClasses.filter((cls) =>
        cls.teachers?.some((teacher) => teacher.uid === user.uid)
      );

      setClasses(myClasses);

      if (myClasses.length > 0) {
        const firstClass = myClasses[0];
        setSelectedClass(firstClass.id);

        const currentTeacher = firstClass.teachers?.find(
          (teacher) => teacher.uid === user.uid
        );

        if (currentTeacher?.subjects?.length > 0) {
          setSelectedSubject(currentTeacher.subjects[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load classes:", error);
    }
  };

  const loadQuizzes = async () => {
    try {
      setLoading(true);

      const quizzesRef = collection(db, "quizzes");
      const q = query(quizzesRef, where("teacherId", "==", user.uid));
      const snapshot = await getDocs(q);

      setQuizzes(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    } catch (error) {
      console.error("Failed to load quizzes:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSubjectsForClass = (classId) => {
    const classData = classes.find((cls) => cls.id === classId);
    if (!classData) return [];

    const currentTeacher = classData.teachers?.find(
      (teacher) => teacher.uid === user.uid
    );

    return currentTeacher?.subjects || [];
  };

  const handleClassChange = (classId) => {
    setSelectedClass(classId);

    const classData = classes.find((cls) => cls.id === classId);
    const currentTeacher = classData?.teachers?.find(
      (teacher) => teacher.uid === user.uid
    );

    const subjects = currentTeacher?.subjects || [];
    setSelectedSubject(subjects.length > 0 ? subjects[0] : "");
  };

  const getAnswerLetter = (question) => {
    const answer = question.correctAnswer?.trim();

    if (/^[A-D]$/i.test(answer)) {
      return answer.toUpperCase();
    }

    const index = question.options.findIndex(
      (option) => option.trim().toLowerCase() === answer?.toLowerCase()
    );

    return index !== -1 ? String.fromCharCode(65 + index) : "";
  };

  const handleQuizGenerated = (aiQuiz) => {
    const formattedQuestions = (aiQuiz.questions || []).map((question, index) => ({
      ...question,
      id: question.id || Date.now() + index,
      correctAnswer: getAnswerLetter(question),
    }));

    setAiGeneratedQuiz({
      ...aiQuiz,
      questions: formattedQuestions,
    });

    setAiQuestions(formattedQuestions);

    setTitle(aiQuiz.title || "");
    setDescription(aiQuiz.description || "");

    setShowManualBuilder(false);
  };

  const validateQuestions = (questions) => {
    return questions.every((question) => {
      const filledPrompt = question.prompt.trim();
      const filledOptions = question.options.every((option) => option.trim());
      const answer = question.correctAnswer.trim().toUpperCase();

      return filledPrompt && filledOptions && /^[A-D]$/.test(answer);
    });
  };

  const saveQuiz = async (questions, isAiGenerated) => {
    if (!selectedClass) {
      alert("Select a class first.");
      return;
    }

    if (!selectedSubject) {
      alert("Select a subject.");
      return;
    }

    if (!title.trim()) {
      alert("Enter a quiz title.");
      return;
    }

    if (!scheduledFor) {
      alert("Choose a schedule date and time.");
      return;
    }

    if (questions.length === 0) {
      alert("Add at least one question.");
      return;
    }

    if (!validateQuestions(questions)) {
      alert("Fill all questions, options, and correct answer must be A, B, C, or D.");
      return;
    }

    setSaving(true);

    try {
      const normalizedQuestions = questions.map((question) => ({
        ...question,
        correctAnswer: question.correctAnswer.trim().toUpperCase(),
      }));

      const quizData = {
        classCode: selectedClass,
        subject: selectedSubject,
        title: title.trim(),
        description: description.trim(),
        resourceLink: resourceLink.trim(),
        scheduledFor: new Date(scheduledFor).toISOString(),
        duration: Number(duration),
        totalQuestions: normalizedQuestions.length,
        questions: normalizedQuestions,
        teacherId: user.uid,
        aiGenerated: isAiGenerated,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "quizzes"), quizData);

      setTitle("");
      setDescription("");
      setResourceLink("");
      setScheduledFor("");
      setDuration(30);

      setAiGeneratedQuiz(null);
      setAiQuestions([]);
      setManualQuestions([createEmptyQuestion(Date.now())]);
      setShowManualBuilder(false);

      alert("Quiz created successfully!");
      loadQuizzes();
    } catch (error) {
      console.error("Failed to create quiz:", error);
      alert("Unable to create quiz.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAIQuiz = (e) => {
    e.preventDefault();
    saveQuiz(aiQuestions, true);
  };

  const handleCreateManualQuiz = (e) => {
    e.preventDefault();
    saveQuiz(manualQuestions, false);
  };

  const handleManualQuestionChange = (index, field, value) => {
    setManualQuestions((prev) =>
      prev.map((question, i) =>
        i === index
          ? {
              ...question,
              [field]: value,
            }
          : question
      )
    );
  };

  const handleManualOptionChange = (questionIndex, optionIndex, value) => {
    setManualQuestions((prev) =>
      prev.map((question, i) =>
        i === questionIndex
          ? {
              ...question,
              options: question.options.map((opt, j) =>
                j === optionIndex ? value : opt
              ),
            }
          : question
      )
    );
  };

  const addManualQuestion = () => {
    setManualQuestions((prev) => [...prev, createEmptyQuestion(Date.now())]);
  };

  const removeManualQuestion = (index) => {
    setManualQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm("Delete this quiz?")) return;

    try {
      await deleteDoc(doc(db, "quizzes", quizId));
      setQuizzes((prev) => prev.filter((quiz) => quiz.id !== quizId));
      alert("Quiz deleted.");
    } catch (error) {
      console.error("Failed to delete quiz:", error);
      alert("Unable to delete quiz.");
    }
  };

  return (
    <div className="min-h-screen  dark:bg-gray-800 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white shadow-lg">
          <h1 className="text-2xl md:text-3xl font-bold">Teacher Quiz Builder</h1>
          <p className="mt-2 max-w-2xl text-sm md:text-base text-blue-50">
            Select class and subject once, then create quiz using AI or manual builder.
          </p>
        </div>

        <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Select Class</label>
              <select
                value={selectedClass}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="">-- Select Class --</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Select Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                disabled={!selectedClass}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="">-- Select Subject --</option>
                {getSubjectsForClass(selectedClass).map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <AIQuizGenerator
          onQuizGenerated={handleQuizGenerated}
          selectedClass={selectedClass}
          selectedSubject={selectedSubject}
        />

        {aiGeneratedQuiz && (
          <form
            onSubmit={handleCreateAIQuiz}
            className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
              <div>
                <h2 className="text-xl font-semibold">AI Generated Quiz Preview</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Review generated questions before creating quiz.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mb-5">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:bg-gray-800 dark:border-gray-700"
                placeholder="Quiz title"
              />

              <input
                type="number"
                min="5"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:bg-gray-800 dark:border-gray-700"
              />

              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:bg-gray-800 dark:border-gray-700"
              />

              <input
                type="url"
                value={resourceLink}
                onChange={(e) => setResourceLink(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:bg-gray-800 dark:border-gray-700"
                placeholder="Resource link optional"
              />
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 mb-5 dark:bg-gray-800 dark:border-gray-700"
              rows="3"
              placeholder="Description"
            />

            <div className="space-y-4">
              {aiQuestions.map((question, index) => (
                <div
                  key={question.id}
                  className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-950"
                >
                  <h3 className="font-semibold mb-3">Question {index + 1}</h3>
                  <p className="mb-3 text-sm">{question.prompt}</p>

                  <div className="grid gap-2 md:grid-cols-2">
                    {question.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className={`rounded-xl border px-4 py-2 text-sm ${
                          question.correctAnswer === String.fromCharCode(65 + optionIndex)
                            ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <span className="font-semibold mr-2">
                          {String.fromCharCode(65 + optionIndex)}.
                        </span>
                        {option}
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-sm text-green-600 dark:text-green-400 font-medium">
                    Correct Answer: {question.correctAnswer}
                  </p>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 rounded-2xl bg-green-600 text-white px-6 py-3 font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Saving Quiz..." : "Create AI Quiz"}
            </button>
          </form>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {!showManualBuilder ? (
              <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-sm text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 dark:bg-blue-950 text-3xl">
                  📝
                </div>

                <h2 className="text-xl font-semibold">Manual Builder</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Manual builder is separate from AI quiz. It will stay empty for manual quiz creation.
                </p>

                <button
                  type="button"
                  onClick={() => setShowManualBuilder(true)}
                  className="mt-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-medium"
                >
                  Open Manual Builder
                </button>
              </div>
            ) : (
              <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-xl font-semibold">Create Manual Quiz</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      For {selectedSubject || "selected subject"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowManualBuilder(false)}
                    className="text-sm rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Hide
                  </button>
                </div>

                <form onSubmit={handleCreateManualQuiz} className="space-y-4">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:bg-gray-800 dark:border-gray-700"
                    placeholder="Manual quiz title"
                  />

                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:bg-gray-800 dark:border-gray-700"
                    rows="3"
                    placeholder="Description"
                  />

                  <input
                    type="url"
                    value={resourceLink}
                    onChange={(e) => setResourceLink(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:bg-gray-800 dark:border-gray-700"
                    placeholder="Resource link optional"
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:bg-gray-800 dark:border-gray-700"
                    />

                    <input
                      type="number"
                      min="5"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>

                  {manualQuestions.map((question, index) => (
                    <div
                      key={question.id}
                      className="rounded-3xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-950"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Question {index + 1}</h3>

                        {manualQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeManualQuestion(index)}
                            className="text-sm text-red-600"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <input
                        placeholder="Question prompt"
                        value={question.prompt}
                        onChange={(e) =>
                          handleManualQuestionChange(index, "prompt", e.target.value)
                        }
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 mb-3 dark:bg-gray-800 dark:border-gray-700"
                      />

                      <div className="grid gap-3 md:grid-cols-2 mb-3">
                        {question.options.map((option, optionIndex) => (
                          <input
                            key={optionIndex}
                            placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                            value={option}
                            onChange={(e) =>
                              handleManualOptionChange(
                                index,
                                optionIndex,
                                e.target.value
                              )
                            }
                            className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:bg-gray-800 dark:border-gray-700"
                          />
                        ))}
                      </div>

                      <select
                        value={question.correctAnswer}
                        onChange={(e) =>
                          handleManualQuestionChange(
                            index,
                            "correctAnswer",
                            e.target.value
                          )
                        }
                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 dark:bg-gray-800 dark:border-gray-700"
                      >
                        <option value="">Select Correct Answer</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={addManualQuestion}
                      className="rounded-2xl bg-blue-600 text-white px-5 py-3 font-medium"
                    >
                      + Add Question
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-2xl bg-green-600 text-white px-5 py-3 font-medium disabled:opacity-50"
                    >
                      {saving ? "Saving Quiz..." : "Create Manual Quiz"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Your Quizzes</h2>

            {loading ? (
              <div className="text-gray-500">Loading quizzes...</div>
            ) : quizzes.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-gray-500">
                No quizzes created yet.
              </div>
            ) : (
              <div className="space-y-4">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="rounded-3xl border border-gray-200 dark:border-gray-700 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{quiz.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {quiz.subject} • {quiz.totalQuestions} questions
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="text-sm text-red-600"
                      >
                        Delete
                      </button>
                    </div>

                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Scheduled: {new Date(quiz.scheduledFor).toLocaleString()}
                    </p>

                    {quiz.aiGenerated && (
                      <p className="mt-2 inline-flex rounded-full bg-purple-50 dark:bg-purple-950 px-3 py-1 text-xs text-purple-700 dark:text-purple-300">
                        AI Generated
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}