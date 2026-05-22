import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion } from "firebase/firestore";
import { db } from "../../../firebase";
import { useUser } from "../../../context/UserContext";

export default function TeacherClassDetails() {
  const { classId: classCode } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");

  useEffect(() => {
    if (!classCode) return;
    loadClassDetails();
  }, [classCode]);

  const loadClassDetails = async () => {
    try {
      setLoading(true);
      const classRef = doc(db, "classes", classCode);
      const classSnap = await getDoc(classRef);

      if (classSnap.exists()) {
        const data = classSnap.data();
        // Check if teacher has access to this class
        const isOwner = data.teacherId === user.uid;
        const isJoinedTeacher = data.teachers?.some((teacher) => teacher.uid === user.uid);

        if (!isOwner && !isJoinedTeacher) {
          alert("You don't have access to this class");
          navigate(-1);
          return;
        }

        setClassData(data);
        setStudents(data.studentList || []);
      } else {
        alert("Class not found");
        navigate(-1);
      }
    } catch (error) {
      console.error("Failed to load class details:", error);
      alert("Failed to load class details");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const calculatePerformanceScore = (student) => {
    // Calculate overall performance based on available metrics
    const attendance = student.attendance || 0;
    const assignmentScore = student.assignmentsCompleted || 0;
    const quizScore = student.quizzesWon || 0;
    const performanceMetric = student.performance || 0;

    // Simple average of available metrics
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

  const getPerformanceColor = (score) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getPerformanceBadge = (score) => {
    if (score >= 80) return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
    if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
    if (score >= 40) return "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200";
    return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
  };

  if (loading) {
    return <div className="p-6 text-center">Loading class details...</div>;
  }

  if (!classData) {
    return <div className="p-6 text-center text-red-500">Class not found</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        <div className="text-right">
          <div className="text-4xl font-bold text-blue-600">
            {students.length}
          </div>
          <p className="text-gray-600 dark:text-gray-400">Students Enrolled</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          {
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
            className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow flex items-center gap-3"
          >
            <span className="text-3xl">{stat.icon}</span>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stat.label}
              </p>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-700"
        />
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Email
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold">
                  Joined
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold">
                  Performance
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold">
                  Attendance
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold">
                  Assignments
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold">
                  Quizzes Won
                </th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    {students.length === 0
                      ? "No students enrolled yet"
                      : "No students match your search"}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const performanceScore = calculatePerformanceScore(student);
                  return (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4">
                        <p className="font-medium">{getValueText(student.name) || "Unknown"}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {student.email || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        {formatDate(student.joinedAt)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${getPerformanceBadge(
                            performanceScore
                          )}`}
                        >
                          {performanceScore}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium">
                          {student.attendance || 0}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium">
                          {student.assignmentsCompleted || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium">
                          {student.quizzesWon || 0}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subjects Section */}
      {classData.subjects && classData.subjects.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Class Subjects</h2>
          <div className="flex flex-wrap gap-3">
            {classData.subjects.map((subject, idx) => (
              <span
                key={idx}
                className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-full"
              >
                {getValueText(subject) || "Untitled Subject"}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}