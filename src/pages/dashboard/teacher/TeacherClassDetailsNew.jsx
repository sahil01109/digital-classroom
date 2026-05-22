import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  collection,
  collectionGroup,
  query,
  where,
  onSnapshot,
  writeBatch,
  deleteDoc,
  arrayUnion,
  increment,
  Timestamp
} from "firebase/firestore";
import { db } from "../../../firebase";
import { useUser } from "../../../context/UserContext";
import { showSuccess, showError, showInfo } from "../../../utils/toastHelpers";

export default function TeacherClassDetails() {
  const { classId: classCode } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [isJoinedTeacher, setIsJoinedTeacher] = useState(false);
  const [requestLoadingId, setRequestLoadingId] = useState(null);

  useEffect(() => {
    if (!classCode || !user) return;

    const classRef = doc(db, "classes", classCode);
    const subscriptions = [];

    const unsubscribeClass = onSnapshot(
      classRef,
      (classSnap) => {
        if (!classSnap.exists()) {
          showError("Class not found");
          navigate(-1);
          return;
        }

        const data = classSnap.data();
        const owner = data.teacherId === user.uid;
        const joinedTeacher = data.teachers?.some((teacher) => teacher.uid === user.uid);

        if (!owner && !joinedTeacher) {
          showError("You don't have access to this class");
          navigate(-1);
          return;
        }

        setIsOwner(owner);
        setIsJoinedTeacher(joinedTeacher);
        setClassData(data);
        setStudents(data.studentList || []);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load class details:", error);
        showError("Failed to load class details");
        setLoading(false);
      }
    );

    subscriptions.push(unsubscribeClass);

    const reqsQuery = query(
      collection(db, "classes", classCode, "joinRequests"),
      where("status", "==", "pending")
    );

    const unsubscribeReqs = onSnapshot(
      reqsQuery,
      (snapshot) => {
        const reqs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setPendingRequests(reqs);
      },
      (error) => {
        console.error("Failed to load join requests:", error);
        showError("Failed to load join requests");
      }
    );

    subscriptions.push(unsubscribeReqs);

    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, [classCode, user, navigate]);

  const calculatePerformanceScore = (student) => {
    const attendance = student.attendance || 0;
    const assignmentScore = student.assignmentsCompleted || 0;
    const quizScore = student.quizzesWon || 0;
    const performanceMetric = student.performance || 0;

    const scores = [attendance, assignmentScore, quizScore, performanceMetric];
    const validScores = scores.filter((s) => s > 0);

    if (validScores.length === 0) return 0;
    return Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";

    try {
      const date =
        timestamp instanceof Date
          ? timestamp
          : new Date(timestamp.toDate?.() || timestamp);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const getValueText = (value) => {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value === "object") {
      if (typeof value.name === "string") return value.name;
      if (typeof value.label === "string") return value.label;
      return JSON.stringify(value);
    }
    return String(value);
  };

  const filteredStudents = students.filter((student) => {
    const studentName = getValueText(student.name).toLowerCase();
    const studentEmail = getValueText(student.email).toLowerCase();
    const search = searchTerm.toLowerCase();

    return studentName.includes(search) || studentEmail.includes(search);
  });

  const getPerformanceBadge = (score) => {
    if (score >= 80) return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
    if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
    if (score >= 40) return "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200";
    return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
  };

  const approveRequest = async (req) => {
    if (!isOwner && !isJoinedTeacher) {
      showError("Only class teachers can approve requests.");
      return;
    }

    setRequestLoadingId(req.studentId);
    setLoading(true);

    try {
      const batch = writeBatch(db);
      const classRef = doc(db, "classes", classCode);
      const userRef = doc(db, "users", req.studentId);
      const reqRef = doc(db, "classes", classCode, "joinRequests", req.studentId);

      // Use a concrete client timestamp for the array element instead of
      // a sentinel `serverTimestamp()` which isn't supported inside `arrayUnion`.
      batch.update(classRef, {
        studentList: arrayUnion({
          uid: req.studentId,
          name: req.studentName,
          email: req.studentEmail,
          joinedAt: Timestamp.now(),
        }),
        studentsCount: increment(1),
      });

      batch.update(userRef, {
        classIds: arrayUnion(classCode),
      });

      batch.delete(reqRef);
      await batch.commit();

      showSuccess("🎉 Student approved and enrolled in the class.");
    } catch (err) {
      console.error("Approve failed:", err);
      showError(`Failed to approve request. ${err?.message || "Try again."}`);
    } finally {
      setRequestLoadingId(null);
      setLoading(false);
    }
  };

  const rejectRequest = async (req) => {
    if (!isOwner && !isJoinedTeacher) {
      showError("Only class teachers can reject requests.");
      return;
    }

    setRequestLoadingId(req.studentId);
    setLoading(true);

    try {
      const reqRef = doc(db, "classes", classCode, "joinRequests", req.studentId);
      await deleteDoc(reqRef);
      showInfo("❌ Request rejected.");
    } catch (err) {
      console.error("Reject failed:", err);
      showError(`Failed to reject request. ${err?.message || "Try again."}`);
    } finally {
      setRequestLoadingId(null);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading class details...</div>;
  }

  if (!classData) {
    return <div className="p-6 text-center text-red-500">Class not found</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 dark:text-blue-400 hover:underline mb-2 flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold">{classData.name}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Code: <span className="font-mono font-semibold">{classData.code}</span>
          </p>
        </div>

        <div className="rounded-3xl bg-slate-100 dark:bg-slate-900 p-4 text-right shadow-sm">
          <div className="text-4xl font-bold text-blue-600">{students.length}</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Students Enrolled</p>
        </div>
      </div>

      {pendingRequests.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold">Pending Join Requests</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Review and approve student requests for this class.
              </p>
            </div>
            <span className="rounded-full bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100 px-3 py-1 text-sm font-medium">
              {pendingRequests.length} pending
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {pendingRequests.map((req) => (
              <div key={req.id} className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-5 shadow-sm transition hover:-translate-y-0.5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-white text-lg font-bold">
                    {req.studentName?.charAt(0) || "S"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold truncate">{req.studentName}</h3>
                      <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-1 text-xs font-semibold dark:bg-blue-900 dark:text-blue-100">
                        {req.status || "pending"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{req.studentEmail}</p>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      Requested for <span className="font-medium">{req.className || classData.name}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{formatDate(req.requestedAt)}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={() => approveRequest(req)}
                    disabled={requestLoadingId === req.studentId}
                    className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {requestLoadingId === req.studentId ? "Approving..." : "Accept"}
                  </button>
                  <button
                    onClick={() => rejectRequest(req)}
                    disabled={requestLoadingId === req.studentId}
                    className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {requestLoadingId === req.studentId ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[{
            label: "Total Students",
            value: students.length,
            icon: "👥",
          },
          {
            label: "Avg Performance",
            value: students.length > 0
              ? Math.round(
                  students.reduce((sum, s) => sum + calculatePerformanceScore(s), 0) /
                    students.length
                ) + "%"
              : "N/A",
            icon: "📊",
          },
          {
            label: "Avg Attendance",
            value: students.length > 0
              ? Math.round(
                  students.reduce((sum, s) => sum + (s.attendance || 0), 0) /
                    students.length
                ) + "%"
              : "N/A",
            icon: "✅",
          },
          {
            label: "Subjects",
            value: classData.subjects?.length || 0,
            icon: "📚",
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="rounded-3xl bg-slate-50 dark:bg-slate-950 p-5 shadow-sm"
          >
            <div className="text-3xl">{stat.icon}</div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Joined</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Performance</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Attendance</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Assignments</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Quizzes Won</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    {students.length === 0 ? "No students enrolled yet" : "No students match your search"}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const performanceScore = calculatePerformanceScore(student);
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{getValueText(student.name) || "Unknown"}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{student.email || "N/A"}</td>
                      <td className="px-6 py-4 text-center text-sm">{formatDate(student.joinedAt)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getPerformanceBadge(performanceScore)}`}>{performanceScore}%</span>
                      </td>
                      <td className="px-6 py-4 text-center"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">{student.attendance || 0}%</span></td>
                      <td className="px-6 py-4 text-center"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">{student.assignmentsCompleted || 0}</span></td>
                      <td className="px-6 py-4 text-center"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">{student.quizzesWon || 0}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {classData.subjects && classData.subjects.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Class Subjects</h2>
          <div className="flex flex-wrap gap-3">
            {classData.subjects.map((subject, idx) => (
              <span key={idx} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-full">
                {getValueText(subject) || "Untitled Subject"}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
