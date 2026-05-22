import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../firebase";
import useClass from "../../../hooks/useClass";
import JoinClassPrompt from "../../../components/JoinClassPrompt";
import SubmitAssignmentModal from "../../../components/SubmitAssignmentModal";
import AssignmentDetailsModal from "../../../components/AssignmentDetailsModal";
import { useUser } from "../../../context/UserContext";

export default function Homework() {
  const { classId, loading, subjects } = useClass();
  const { userData } = useUser();
  const [assignments, setAssignments] = useState([]);
  const [filteredAssignments, setFilteredAssignments] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [submissions, setSubmissions] = useState({});
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Load assignments when class changes
  useEffect(() => {
    if (!classId) return;
    loadAssignments();
  }, [classId]);

  // Load submissions for assignments
  useEffect(() => {
    if (assignments.length === 0 || !userData?.uid) return;
    loadSubmissions();
  }, [assignments, userData?.uid]);

  const loadSubmissions = async () => {
    try {
      const submissionsRef = collection(db, "assignmentSubmissions");
      const q = query(
        submissionsRef,
        where("studentId", "==", userData?.uid),
        where("classCode", "==", classId)
      );
      const snapshot = await getDocs(q);

      const submissionMap = {};
      snapshot.docs.forEach((doc) => {
        submissionMap[doc.data().assignmentId] = doc.data();
      });

      setSubmissions(submissionMap);
    } catch (error) {
      console.error("Failed to load submissions:", error);
    }
  };

  const loadAssignments = async () => {
    try {
      setLoadingAssignments(true);
      const assignmentsRef = collection(db, "assignments");
      const q = query(assignmentsRef, where("classCode", "==", classId));
      const snapshot = await getDocs(q);
      const loadedAssignments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAssignments(loadedAssignments.sort((a, b) => new Date(a.due) - new Date(b.due)));
      setSelectedSubject("");
    } catch (err) {
      console.error("Failed to load assignments:", err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Filter assignments based on selected subject and status
  useEffect(() => {
    let filtered = assignments;

    if (selectedSubject) {
      filtered = filtered.filter((a) => a.subject === selectedSubject);
    }

    if (selectedStatus !== "all") {
      const now = new Date();
      filtered = filtered.filter((a) => {
        const dueDate = new Date(a.due);
        const submitted = submissions[a.id];
        if (selectedStatus === "pending") {
          return !submitted && dueDate > now;
        } else if (selectedStatus === "overdue") {
          return !submitted && dueDate < now;
        } else if (selectedStatus === "completed") {
          return !!submitted;
        }
        return true;
      });
    }

    setFilteredAssignments(filtered);
  }, [selectedSubject, selectedStatus, assignments]);

  const getAssignmentStatus = (assignment) => {
    const now = new Date();
    const due = new Date(assignment.due);
    const submitted = submissions[assignment.id];
    if (submitted) return "submitted";
    if (due < now) return "overdue";
    return "pending";
  };

  const getDaysUntilDue = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return "Due today";
    } else if (diffDays === 1) {
      return "Due tomorrow";
    } else {
      return `Due in ${diffDays} days`;
    }
  };

  const getAssignmentTypeIcon = (type) => {
    switch (type) {
      case "pdf":
        return "📄";
      case "docs":
        return "📋";
      case "question":
        return "📝";
      default:
        return "📚";
    }
  };

  const getAssignmentTypeLabel = (type) => {
    switch (type) {
      case "pdf":
        return "PDF";
      case "docs":
        return "Document";
      case "question":
        return "Question";
      default:
        return "Assignment";
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!classId) {
    return <JoinClassPrompt />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* Heading */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Assignments</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          View and manage your assignments
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-2xl">
          <h3 className="text-sm text-blue-600 dark:text-blue-300 uppercase tracking-wide">
            Total Assignments
          </h3>
          <p className="mt-2 text-2xl font-semibold text-blue-900 dark:text-blue-100">
            {assignments.length}
          </p>
        </div>

        <div className="bg-orange-50 dark:bg-orange-950/40 p-4 rounded-2xl">
          <h3 className="text-sm text-orange-600 dark:text-orange-300 uppercase tracking-wide">
            Pending
          </h3>
          <p className="mt-2 text-2xl font-semibold text-orange-900 dark:text-orange-100">
            {assignments.filter((a) => getAssignmentStatus(a) === "pending").length}
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-950/40 p-4 rounded-2xl">
          <h3 className="text-sm text-red-600 dark:text-red-300 uppercase tracking-wide">
            Overdue
          </h3>
          <p className="mt-2 text-2xl font-semibold text-red-900 dark:text-red-100">
            {assignments.filter((a) => getAssignmentStatus(a) === "overdue").length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Filter by Subject</h3>
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

        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Filter by Status</h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedStatus("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedStatus === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow hover:bg-blue-500 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedStatus("pending")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedStatus === "pending"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow hover:bg-blue-500 hover:text-white"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setSelectedStatus("overdue")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedStatus === "overdue"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow hover:bg-blue-500 hover:text-white"
              }`}
            >
              Overdue
            </button>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        <h2 className="font-semibold text-lg">
          {selectedSubject ? `${selectedSubject} Assignments` : "All Assignments"}
        </h2>

        {loadingAssignments ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            Loading assignments...
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm text-center border border-gray-100 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400">
              {selectedSubject ? `No assignments for ${selectedSubject}` : "No assignments yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAssignments.map((assignment) => {
              const status = getAssignmentStatus(assignment);
              const daysUntil = getDaysUntilDue(assignment.due);
              const submission = submissions[assignment.id];

              return (
                <div
                  key={assignment.id}
                  className={`bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border-l-4 transition hover:shadow-md ${
                    status === "overdue"
                      ? "border-l-red-500 border border-gray-100 dark:border-gray-800"
                      : "border-l-blue-500 border border-gray-100 dark:border-gray-800"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex-grow">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {assignment.title}
                      </h3>
                      <div className="flex gap-3 mt-2 flex-wrap">
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                          {assignment.subject}
                        </span>
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-200">
                          {getAssignmentTypeIcon(assignment.assignmentType)} {getAssignmentTypeLabel(assignment.assignmentType)}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            status === "overdue"
                              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200"
                              : status === "submitted"
                                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-200"
                                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-200"
                          }`}
                        >
                          {status === "overdue" ? "Overdue" : status === "submitted" ? "Submitted" : "Pending"}
                        </span>
                      </div>

                      {assignment.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                          {assignment.description}
                        </p>
                      )}

                      {(assignment.attachmentUrl || assignment.attachmentLink) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {assignment.attachmentUrl && (
                            <a
                              href={assignment.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center px-3 py-2 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                            >
                              Download {assignment.attachmentName || "file"}
                            </a>
                          )}
                          {assignment.attachmentLink && (
                            <a
                              href={assignment.attachmentLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center px-3 py-2 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition"
                            >
                              Open resource link
                            </a>
                          )}
                        </div>
                      )}

                      {submission && (
                        <div className="mt-3 rounded-2xl bg-green-50 dark:bg-green-950/50 p-3 text-sm text-green-800 dark:text-green-200">
                          <p className="font-semibold">Submission ready</p>
                          <p>Status: {submission.status || "submitted"}</p>
                          {submission.graded && (
                            <p>Grade: {submission.grade} / {submission.totalQuestions || "n/a"}</p>
                          )}
                          {submission.feedback && <p>Feedback: {submission.feedback}</p>}
                        </div>
                      )}

                      <p className={`text-sm font-medium mt-2 ${
                        status === "overdue"
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-600 dark:text-gray-400"
                      }`}>
                        {daysUntil}
                      </p>
                    </div>

                    <div className="flex gap-2 flex-col sm:flex-row">
                      <button
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setShowDetailsModal(true);
                        }}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setShowSubmitModal(true);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          submission
                            ? "bg-purple-600 hover:bg-purple-700 text-white"
                            : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                      >
                        {submission
                          ? "✓ Submitted"
                          : "Submit"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Empty state */}
      {assignments.length === 0 && !loadingAssignments && (
        <div className="text-center text-gray-500 mt-10">
          No assignments assigned yet 📭
        </div>
      )}

      {/* Submit Modal */}
      <SubmitAssignmentModal
        assignment={selectedAssignment}
        classId={classId}
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onSuccess={loadSubmissions}
      />

      {/* Details Modal */}
      <AssignmentDetailsModal
        assignment={selectedAssignment}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />
    </div>
  );
}