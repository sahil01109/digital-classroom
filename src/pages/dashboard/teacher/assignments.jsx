import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, serverTimestamp, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db, storage } from "../../../firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useUser } from "../../../context/UserContext";
import { generateAIFeedback } from "../../../services/aiService";

export default function Assignments() {
  const { user } = useUser();
  const [assignments, setAssignments] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    due: "",
    classCode: "",
    subject: "",
    link: "",
    assignmentType: "question", // 'question', 'pdf', 'docs'
    questionContent: "",
  });
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedAssignmentForSubmissions, setSelectedAssignmentForSubmissions] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionGrades, setSubmissionGrades] = useState({});
  const [submissionFeedback, setSubmissionFeedback] = useState({});
  const [savingSubmissionId, setSavingSubmissionId] = useState(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  // Load teacher's classes on mount
  useEffect(() => {
    if (!user) return;
    loadTeacherClasses();
  }, [user]);

  // Load assignments when classes are loaded
  useEffect(() => {
    if (teacherClasses.length > 0) {
      loadAssignments();
    }
  }, [teacherClasses]);

  const loadTeacherClasses = async () => {
    try {
      setLoading(true);
      const classesRef = collection(db, "classes");
      const snapshot = await getDocs(classesRef);
      const allClasses = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter classes where the user is a teacher
      const myClasses = allClasses.filter((cls) =>
        cls.teachers?.some((teacher) => teacher.uid === user.uid)
      );

      setTeacherClasses(myClasses);
    } catch (err) {
      console.error("Failed to load classes:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const assignmentsRef = collection(db, "assignments");
      const q = query(
        assignmentsRef,
        where("teacherId", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const loadedAssignments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAssignments(loadedAssignments.sort((a, b) => new Date(a.due) - new Date(b.due)));
    } catch (err) {
      console.error("Failed to load assignments:", err);
    }
  };

  const uploadFile = async (file, path) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        },
        (error) => reject(error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();

    if (!newTask.title.trim()) {
      alert("Please enter an assignment title");
      return;
    }

    if (!newTask.classCode) {
      alert("Please select a class");
      return;
    }

    if (!newTask.subject) {
      alert("Please select a subject");
      return;
    }

    if (!newTask.due) {
      alert("Please select a due date");
      return;
    }

    // Validate based on assignment type
    if (newTask.assignmentType === "question" && !newTask.questionContent.trim()) {
      alert("Please enter a question for this assignment");
      return;
    }

    if ((newTask.assignmentType === "pdf" || newTask.assignmentType === "docs") && !attachmentFile) {
      alert(`Please upload a ${newTask.assignmentType === "pdf" ? "PDF" : "Word"} file for this assignment`);
      return;
    }

    setCreating(true);

    try {
      let attachmentUrl = "";
      let attachmentName = "";

      if (attachmentFile && (newTask.assignmentType === "pdf" || newTask.assignmentType === "docs")) {
        attachmentName = attachmentFile.name;
        attachmentUrl = await uploadFile(
          attachmentFile,
          `assignments/${user.uid}/${Date.now()}_${attachmentFile.name}`
        );
      }

      await addDoc(collection(db, "assignments"), {
        title: newTask.title,
        description: newTask.description,
        classCode: newTask.classCode,
        subject: newTask.subject,
        due: new Date(newTask.due).toISOString(),
        teacherId: user.uid,
        createdAt: serverTimestamp(),
        status: "Active",
        attachmentUrl,
        attachmentName,
        attachmentLink: newTask.link,
        assignmentType: newTask.assignmentType,
        questionContent: newTask.assignmentType === "question" ? newTask.questionContent : "",
      });

      await addDoc(collection(db, "notifications"), {
        classCode: newTask.classCode,
        title: "New Assignment Available",
        message: `${newTask.title} has been posted for ${newTask.subject}.`,
        type: "assignment",
        createdAt: serverTimestamp(),
      });

      setNewTask({
        title: "",
        description: "",
        due: "",
        classCode: "",
        subject: "",
        assignmentType: "question",
        questionContent: "",
      });
      setAttachmentFile(null);
      setUploadProgress(0);

      await loadAssignments();
      alert("Assignment created successfully!");
    } catch (err) {
      console.error("Failed to create assignment:", err);
      alert("Failed to create assignment");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;

    try {
      await deleteDoc(doc(db, "assignments", assignmentId));
      await loadAssignments();
      alert("Assignment deleted successfully!");
    } catch (err) {
      console.error("Failed to delete assignment:", err);
      alert("Failed to delete assignment");
    }
  };

  const handleGenerateAIFeedback = async (assignment) => {
    try {
      const feedback = await generateAIFeedback(assignment);
      alert(`AI Feedback for "${assignment.title}":\n\n${feedback}`);
    } catch (error) {
      console.error('AI feedback generation failed:', error);
      alert(error?.message || 'Failed to generate AI feedback. Please check your OpenAI API key.');
    }
  };

  const getClassDetails = (classCode) => {
    return teacherClasses.find((cls) => cls.id === classCode);
  };

  const getSubjectsForClass = (classCode) => {
    const classData = getClassDetails(classCode);
    if (!classData) return [];
    
    const currentTeacher = classData.teachers?.find((t) => t.uid === user.uid);
    return currentTeacher?.subjects || [];
  };

  const loadSubmissions = async (assignmentId) => {
    try {
      setLoadingSubmissions(true);
      const submissionsRef = collection(db, "assignmentSubmissions");
      const q = query(submissionsRef, where("assignmentId", "==", assignmentId));
      const snapshot = await getDocs(q);
      const loadedSubmissions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSubmissions(loadedSubmissions);

      const grades = {};
      const feedback = {};
      loadedSubmissions.forEach((submission) => {
        grades[submission.id] = submission.grade ?? "";
        feedback[submission.id] = submission.feedback ?? "";
      });
      setSubmissionGrades(grades);
      setSubmissionFeedback(feedback);
    } catch (err) {
      console.error("Failed to load submissions:", err);
      setSubmissions([]);
      setSubmissionGrades({});
      setSubmissionFeedback({});
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const saveSubmissionGrade = async (submission) => {
    try {
      setSavingSubmissionId(submission.id);
      const submissionRef = doc(db, "assignmentSubmissions", submission.id);
      await updateDoc(submissionRef, {
        graded: true,
        grade: submissionGrades[submission.id] || null,
        feedback: submissionFeedback[submission.id] || "",
      });
      await loadSubmissions(selectedAssignmentForSubmissions?.id);
      alert("Grade saved successfully.");
    } catch (err) {
      console.error("Failed to save grade:", err);
      alert("Failed to save grade. Try again.");
    } finally {
      setSavingSubmissionId(null);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading your classes...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Assignments</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Create and manage assignments for your classes
        </p>
      </div>

      {/* Create Assignment Form */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="text-xl font-semibold mb-4">Create New Assignment</h2>

        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Class
              </label>
              <select
                value={newTask.classCode}
                onChange={(e) => {
                  setNewTask({ ...newTask, classCode: e.target.value, subject: "" });
                  setSelectedClass(e.target.value);
                }}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Class --</option>
                {teacherClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Subject
              </label>
              <select
                value={newTask.subject}
                onChange={(e) => {
                  setNewTask({ ...newTask, subject: e.target.value });
                  setSelectedSubject(e.target.value);
                }}
                disabled={!selectedClass}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assignment Title
            </label>
            <input
              type="text"
              placeholder="e.g., Chapter 5 Homework"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assignment Type
            </label>
            <select
              value={newTask.assignmentType}
              onChange={(e) => setNewTask({ ...newTask, assignmentType: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="question">📝 Text Question</option>
              <option value="pdf">📄 PDF Document</option>
              <option value="docs">📋 Word Document</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              placeholder="Assignment details and instructions..."
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              rows="4"
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {newTask.assignmentType === "question" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Question Content (Required)
              </label>
              <textarea
                placeholder="Enter your question here..."
                value={newTask.questionContent}
                onChange={(e) => setNewTask({ ...newTask, questionContent: e.target.value })}
                rows="5"
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {(newTask.assignmentType === "pdf" || newTask.assignmentType === "docs") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload {newTask.assignmentType === "pdf" ? "PDF" : "Document"} File (Required)
              </label>
              <input
                type="file"
                accept={newTask.assignmentType === "pdf" ? ".pdf" : ".doc,.docx"}
                onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900 dark:file:text-blue-100"
              />
              {attachmentFile && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Selected: {attachmentFile.name} {uploadProgress > 0 && `(${uploadProgress}% uploaded)`}
                </p>
              )}
            </div>
          )}

          {newTask.assignmentType === "question" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Resources Link (Optional)
              </label>
              <input
                type="url"
                placeholder="https://example.com/study-guide"
                value={newTask.link}
                onChange={(e) => setNewTask({ ...newTask, link: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Due Date
            </label>
            <input
              type="datetime-local"
              value={newTask.due}
              onChange={(e) => setNewTask({ ...newTask, due: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-medium transition"
          >
            {creating ? "Creating..." : "Create Assignment"}
          </button>
        </form>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Assignments</h2>

        {assignments.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm text-center border border-gray-100 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400">No assignments created yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map((assignment) => {
              const classData = getClassDetails(assignment.classCode);
              const dueDate = new Date(assignment.due);
              const isOverdue = dueDate < new Date();

              const getTypeIcon = (type) => {
                switch (type) {
                  case "pdf": return "📄";
                  case "docs": return "📋";
                  case "question": return "📝";
                  default: return "📚";
                }
              };

              const getTypeLabel = (type) => {
                switch (type) {
                  case "pdf": return "PDF";
                  case "docs": return "Document";
                  case "question": return "Question";
                  default: return "Assignment";
                }
              };

              return (
                <div
                  key={assignment.id}
                  className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {assignment.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {classData?.name || assignment.classCode}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          isOverdue
                            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200"
                        }`}
                      >
                        {assignment.subject}
                      </span>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-200">
                        {getTypeIcon(assignment.assignmentType)} {getTypeLabel(assignment.assignmentType)}
                      </span>
                    </div>
                  </div>

                  {assignment.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                      {assignment.description}
                    </p>
                  )}

                  {assignment.assignmentType === "question" && assignment.questionContent && (
                    <div className="mb-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                      <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-3">
                        {assignment.questionContent}
                      </p>
                    </div>
                  )}

                  {(assignment.assignmentType === "pdf" || assignment.assignmentType === "docs") && assignment.attachmentUrl && (
                    <div className="mb-3 space-y-2 text-sm">
                      <a
                        href={assignment.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-blue-600 dark:text-blue-300 hover:underline"
                      >
                        📥 Download {assignment.attachmentName || "attachment"}
                      </a>
                    </div>
                  )}

                  {assignment.attachmentLink && (
                    <div className="mb-3 text-sm">
                      <a
                        href={assignment.attachmentLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-green-600 dark:text-green-300 hover:underline"
                      >
                        🔗 Open resource link
                      </a>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-gray-500 dark:text-gray-400">
                      Due: {dueDate.toLocaleDateString()} {dueDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleGenerateAIFeedback(assignment)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                    >
                      <span>🤖</span>
                      AI Feedback
                    </button>

                    <button
                      onClick={async () => {
                        setSelectedAssignmentForSubmissions(assignment);
                        setShowSubmissionModal(true);
                        await loadSubmissions(assignment.id);
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      View Submissions
                    </button>

                    <button
                      onClick={() => handleDelete(assignment.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showSubmissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-3xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Student Submissions
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedAssignmentForSubmissions?.title} • {selectedAssignmentForSubmissions?.subject}
                </p>
              </div>
              <button
                onClick={() => setShowSubmissionModal(false)}
                className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {loadingSubmissions ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading submissions...</div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">No submissions submitted yet.</div>
              ) : (
                <div className="space-y-4">
                  {submissions.map((submission) => (
                    <div key={submission.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{submission.studentName} • {submission.studentEmail}</p>
                          <p className="text-lg font-semibold text-slate-900 dark:text-white">{submission.status || "submitted"}</p>
                        </div>
                        <div className="space-y-1 text-right text-sm">
                          <p className="text-gray-600 dark:text-gray-300">Submitted: {new Date(submission.submittedAt).toLocaleString()}</p>
                          {submission.graded ? (
                            <p className="text-green-600 dark:text-green-400">Graded: {submission.grade}</p>
                          ) : (
                            <p className="text-yellow-700 dark:text-yellow-300">Not graded yet</p>
                          )}
                        </div>
                      </div>

                      {submission.type === "text" && submission.text && (
                        <div className="mt-3 p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200">
                          <p>{submission.text}</p>
                        </div>
                      )}

                      {submission.fileLink && (
                        <div className="mt-3 text-sm">
                          <a
                            href={submission.fileLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-300 hover:underline"
                          >
                            📎 {submission.fileName || "View attachment"}
                          </a>
                        </div>
                      )}

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Grade points
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={submissionGrades[submission.id] ?? ""}
                            onChange={(e) =>
                              setSubmissionGrades((prev) => ({
                                ...prev,
                                [submission.id]: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Optional feedback
                          </label>
                          <textarea
                            value={submissionFeedback[submission.id] ?? ""}
                            onChange={(e) =>
                              setSubmissionFeedback((prev) => ({
                                ...prev,
                                [submission.id]: e.target.value,
                              }))
                            }
                            rows="3"
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => saveSubmissionGrade(submission)}
                        disabled={savingSubmissionId === submission.id}
                        className="mt-3 inline-flex items-center justify-center rounded-xl bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium transition disabled:opacity-60"
                      >
                        {savingSubmissionId === submission.id ? "Saving..." : "Save Grade"}
                      </button>

                      {submission.feedback && (
                        <div className="mt-3 rounded-2xl bg-green-50 dark:bg-green-950/20 p-3 text-sm text-green-800 dark:text-green-200">
                          <p className="font-semibold">Feedback</p>
                          <p>{submission.feedback}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}