import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { useUser } from "../../../context/UserContext";
import { analyzeStudentPerformance } from "../../../services/aiService";

export default function Analytics() {
  const { user } = useUser();

  const [teacherClasses, setTeacherClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [assignmentData, setAssignmentData] = useState([]);
  const [studentPerformance, setStudentPerformance] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadTeacherClasses();
  }, [user]);

  useEffect(() => {
    if (!selectedClass || selectedClass === "") return;
    loadAnalyticsData();
  }, [selectedClass]);

  const safeText = (value, depth = 0) => {
    // Prevent infinite recursion
    if (depth > 5) return "[Deep Object]";

    if (value === null || value === undefined) return "";

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => safeText(item, depth + 1)).join(", ");
    }

    if (typeof value === "object") {
      try {
        const text = (
          safeText(value.name, depth + 1) ||
          safeText(value.title, depth + 1) ||
          safeText(value.label, depth + 1) ||
          safeText(value.subjectName, depth + 1) ||
          safeText(value.subject, depth + 1) ||
          safeText(value.text, depth + 1) ||
          safeText(value.message, depth + 1) ||
          JSON.stringify(value)
        );
        return String(text || "[Object]");
      } catch (error) {
        return "[Object]";
      }
    }

    return String(value);
  };

  const safeArray = (value) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  const getNumber = (value) => {
    const num = Number(value);
    return Number.isNaN(num) ? 0 : num;
  };

  const loadTeacherClasses = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(collection(db, "classes"));

      const allClasses = snapshot.docs.map((document) => ({
        id: document.id,
        code: document.id,
        ...document.data(),
      }));

      const teacherClassList = allClasses.filter((cls) => {
        const isCreator = cls.teacherId === user.uid;

        const isJoinedTeacher = safeArray(cls.teachers).some(
          (teacher) => teacher?.uid === user.uid
        );

        return isCreator || isJoinedTeacher;
      });

      setTeacherClasses(teacherClassList);

      if (teacherClassList.length > 0) {
        setSelectedClass(String(teacherClassList[0].code || teacherClassList[0].id || ""));
      }
    } catch (error) {
      console.error("Failed to load classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyticsData = async () => {
    if (!selectedClass) return;

    try {
      let currentClassData = null;

      const classRef = doc(db, "classes", String(selectedClass));
      const classSnap = await getDoc(classRef);

      if (classSnap.exists()) {
        currentClassData = classSnap.data();

        setClassData(currentClassData);
        setStudentPerformance(safeArray(currentClassData.studentList));
      } else {
        setClassData(null);
        setStudentPerformance([]);
      }

      const attendanceQ = query(
        collection(db, "attendance"),
        where("classCode", "==", String(selectedClass))
      );

      const attendanceSnap = await getDocs(attendanceQ);

      const attendanceRecords = attendanceSnap.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

      setAttendanceData(attendanceRecords);

      const assignmentQ = query(
        collection(db, "assignments"),
        where("classCode", "==", String(selectedClass))
      );

      const assignmentSnap = await getDocs(assignmentQ);

      const assignments = assignmentSnap.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

      setAssignmentData(assignments);

      if (
        safeArray(currentClassData?.studentList).length > 0 &&
        assignments.length > 0
      ) {
        performAIAnalysis(safeArray(currentClassData.studentList), assignments);
      } else {
        setAiAnalysis(null);
      }
    } catch (error) {
      console.error("Failed to load analytics data:", error);
    }
  };

  const performAIAnalysis = async (students, assignments) => {
    setAnalyzing(true);

    try {
      const analysis = await analyzeStudentPerformance(students, assignments, []);
      setAiAnalysis(analysis);
    } catch (error) {
      console.error("AI analysis failed:", error);
      setAiAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const calculateMetrics = () => {
    const metrics = {
      totalStudents: studentPerformance.length,
      avgAttendance: 0,
      avgPerformance: 0,
      avgAssignments: 0,
      avgQuizzes: 0,
      totalAssignments: assignmentData.length,
    };

    if (studentPerformance.length > 0) {
      metrics.avgAttendance = Math.round(
        studentPerformance.reduce(
          (sum, student) => sum + getNumber(student.attendance),
          0
        ) / studentPerformance.length
      );

      metrics.avgAssignments = Math.round(
        studentPerformance.reduce(
          (sum, student) => sum + getNumber(student.assignmentsCompleted),
          0
        ) / studentPerformance.length
      );

      metrics.avgQuizzes = Math.round(
        studentPerformance.reduce(
          (sum, student) => sum + getNumber(student.quizzesWon),
          0
        ) / studentPerformance.length
      );

      const avgPerformance =
        studentPerformance.reduce((sum, student) => {
          const attendance = getNumber(student.attendance);
          const assignments = getNumber(student.assignmentsCompleted);
          const quizzes = getNumber(student.quizzesWon);

          return sum + (attendance + assignments + quizzes) / 3;
        }, 0) / studentPerformance.length;

      metrics.avgPerformance = Math.round(avgPerformance);
    }

    return metrics;
  };

  const calculateAttendanceStats = () => {
    if (attendanceData.length === 0) {
      return {
        avgPresent: 0,
        avgAbsent: 0,
        avgLate: 0,
      };
    }

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalRecords = 0;

    attendanceData.forEach((record) => {
      const records = record.records || {};

      Object.values(records).forEach((status) => {
        const statusText = safeText(status).toLowerCase();

        totalRecords++;

        if (statusText === "present") totalPresent++;
        else if (statusText === "absent") totalAbsent++;
        else if (statusText === "late") totalLate++;
      });
    });

    return {
      avgPresent:
        totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0,
      avgAbsent:
        totalRecords > 0 ? Math.round((totalAbsent / totalRecords) * 100) : 0,
      avgLate:
        totalRecords > 0 ? Math.round((totalLate / totalRecords) * 100) : 0,
    };
  };

  const getTopPerformers = () => {
    return studentPerformance
      .map((student) => ({
        name: safeText(student.name) || "Unknown",
        score:
          getNumber(student.attendance) +
          getNumber(student.assignmentsCompleted) +
          getNumber(student.quizzesWon),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  };

  const metrics = calculateMetrics();
  const attendanceStats = calculateAttendanceStats();
  const topPerformers = getTopPerformers();

  if (loading) {
    return <div className="p-6">Loading analytics...</div>;
  }

  if (teacherClasses.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">Analytics</h1>

        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-4 text-yellow-800 dark:text-yellow-200">
          You have no classes. Create or join a class first.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>

        <p className="mt-3 text-gray-600 dark:text-gray-300 max-w-2xl">
          Analyze classroom performance, engagement, and progress metrics for
          your teaching groups.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <label className="block text-sm font-medium mb-2">Select Class</label>

        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(String(e.target.value))}
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
        >
          {teacherClasses.map((cls, index) => (
            <option key={String(cls.code || index)} value={String(cls.code)}>
              {safeText(cls.name) || safeText(cls.code)} (
              {safeText(cls.students || 0)} students)
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: "Total Students",
            value: metrics.totalStudents,
            icon: "👥",
          },
          {
            label: "Avg Attendance",
            value: `${metrics.avgAttendance}%`,
            icon: "✅",
          },
          {
            label: "Avg Performance",
            value: `${metrics.avgPerformance}%`,
            icon: "📊",
          },
          {
            label: "Avg Assignments",
            value: metrics.avgAssignments,
            icon: "📝",
          },
          {
            label: "Total Assignments",
            value: metrics.totalAssignments,
            icon: "📋",
          },
        ].map((item, index) => (
          <div
            key={index}
            className="rounded-lg bg-white dark:bg-gray-800 shadow p-4 border border-gray-100 dark:border-gray-700"
          >
            <p className="text-2xl mb-2">{safeText(item.icon)}</p>

            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              {safeText(item.label)}
            </p>

            <p className="text-2xl font-bold">{safeText(item.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 p-6">
          <p className="text-sm text-green-600 dark:text-green-400 mb-2">
            Present
          </p>

          <p className="text-4xl font-bold text-green-700 dark:text-green-300">
            {attendanceStats.avgPresent}%
          </p>
        </div>

        <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 p-6">
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">Absent</p>

          <p className="text-4xl font-bold text-red-700 dark:text-red-300">
            {attendanceStats.avgAbsent}%
          </p>
        </div>

        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 p-6">
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-2">
            Late
          </p>

          <p className="text-4xl font-bold text-yellow-700 dark:text-yellow-300">
            {attendanceStats.avgLate}%
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h2 className="text-xl font-semibold mb-4">
          Student Performance Distribution
        </h2>

        {studentPerformance.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            No student performance data available.
          </p>
        ) : (
          <div className="space-y-3">
            {studentPerformance.map((student, index) => {
              const score =
                (getNumber(student.attendance) +
                  getNumber(student.assignmentsCompleted) +
                  getNumber(student.quizzesWon)) /
                3;

              const percentage = Math.min(Math.round(score), 100);

              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">
                      {safeText(student.name) || "Unknown"}
                    </span>

                    <span className="text-gray-600 dark:text-gray-400">
                      {percentage}%
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        percentage >= 80
                          ? "bg-green-500"
                          : percentage >= 60
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h2 className="text-xl font-semibold mb-4">Top 5 Performers</h2>

        {topPerformers.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            No student data available.
          </p>
        ) : (
          <div className="space-y-3">
            {topPerformers.map((performer, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>

                  <span className="font-medium">
                    {safeText(performer.name)}
                  </span>
                </div>

                <span className="font-semibold text-lg text-blue-600 dark:text-blue-400">
                  {safeText(performer.score)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {safeArray(classData?.subjects).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">Class Subjects</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {safeArray(classData?.subjects).map((subject, index) => {
              const subjectText = safeText(subject) || "Untitled Subject";

              return (
                <div
                  key={index}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <h3 className="font-semibold text-lg mb-2">
                    {subjectText}
                  </h3>

                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <p>
                      Assignments:{" "}
                      <span className="font-medium">
                        {
                          assignmentData.filter(
                            (assignment) =>
                              safeText(assignment.subject) === subjectText
                          ).length
                        }
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-2xl">🤖</div>

          <div>
            <h2 className="text-xl font-semibold">AI-Powered Insights</h2>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              Intelligent analysis of student performance and recommendations.
            </p>
          </div>
        </div>

        {analyzing ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>

            <span className="ml-3">Analyzing student performance...</span>
          </div>
        ) : aiAnalysis ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  Performance Level
                </h3>

                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {safeText(aiAnalysis.performanceLevel)}
                </p>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                  Predicted Trend
                </h3>

                <p className="text-lg text-green-600 dark:text-green-400">
                  {safeText(aiAnalysis.prediction)}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Strengths</h3>

              <div className="flex flex-wrap gap-2">
                {safeArray(aiAnalysis.strengths).map((strength, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 rounded-full text-sm"
                  >
                    {safeText(strength)}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Areas for Improvement</h3>

              <div className="flex flex-wrap gap-2">
                {safeArray(aiAnalysis.weaknesses).map((weakness, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 rounded-full text-sm"
                  >
                    {safeText(weakness)}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Focus Areas</h3>

              <div className="flex flex-wrap gap-2">
                {safeArray(aiAnalysis.focusAreas).map((area, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 rounded-full text-sm"
                  >
                    {safeText(area)}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Recommendations</h3>

              <ul className="space-y-2">
                {safeArray(aiAnalysis.recommendations).map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>

                    <span className="text-gray-700 dark:text-gray-300">
                      {safeText(rec)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            Select a class to view AI-powered performance insights.
          </p>
        )}
      </div>
    </div>
  );
}