import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../../context/UserContext";
import useClass from "../../../hooks/useClass";
import JoinClassPrompt from "../../../components/JoinClassPrompt";

export default function DashboardHome() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { classId, subjects, classData, loading } = useClass();
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);

  const myStudentRecord = classData?.studentList?.find((student) => student.uid === user?.uid);
  const myAttendance = myStudentRecord?.attendance ?? 0;
  const hasAttendancePenalty = myAttendance > 0 && myAttendance < 75;
  const announcements = Array.isArray(classData?.announcements) ? classData.announcements : [];

  const formatAnnouncementDate = (rawDate) => {
    if (!rawDate) return "";
    const dateObj = rawDate?.toDate ? rawDate.toDate() : new Date(rawDate);
    return isNaN(dateObj.getTime()) ? "" : dateObj.toLocaleDateString();
  };

  // 🔥 Loading state
  if (loading) {
    return <p className="p-6">Loading...</p>;
  }

  // 🔥 If no class joined
  if (!classId) {
    return <JoinClassPrompt />;
  }

  // 🔥 Dynamic Stats (from Firebase)
  const stats = [
    {
      title: "Subjects",
      value: subjects.length,
      color: "bg-blue-500",
    },
    {
      title: "Pending Homework",
      value: classData?.Homework?.length || 0,
      color: "bg-red-500",
    },
    {
      title: "Notes",
      value: classData?.Notes?.length || 0,
      color: "bg-green-500",
    },
    {
      title: "Quizzes",
      value: classData?.Quizzes?.length || 0,
      color: "bg-purple-500",
    },
  ];

  // 🔥 Dynamic Recent Activity (fallback safe)
  const recentActivities = [
    ...(classData?.Homework || []).slice(0, 2).map((item) => ({
      text: `Homework: ${item.title}`,
      time: item.createdAt || "Recently",
    })),
    ...(classData?.Notes || []).slice(0, 1).map((item) => ({
      text: `Notes: ${item.title}`,
      time: item.createdAt || "Recently",
    })),
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* Heading */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          Student Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Overview of your academic activities
        </p>
      </div>



      {/* 🔥 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((item, index) => (
          <div
            key={index}
            className={`p-4 rounded-2xl text-white shadow ${item.color}`}
          >
            <h2 className="text-xl font-bold">{item.value}</h2>
            <p className="text-sm">{item.title}</p>
          </div>
        ))}
      </div>

  
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-3xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Announcements</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">{announcements.length} recent</span>
          </div>

          {announcements.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No announcements from your teacher yet.
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {announcements.slice(-3).reverse().map((announcement, index) => (
                  <div key={index} className="rounded-2xl bg-gray-50 dark:bg-gray-950 p-4">
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {announcement.text}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {announcement.teacher ? `${announcement.teacher} • ` : ""}
                      {formatAnnouncementDate(announcement.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
              {announcements.length > 3 && (
                <button
                  onClick={() => setShowAnnouncementsModal(true)}
                  className="mt-4 w-full py-2 px-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-950 rounded-lg transition"
                >
                  View All Announcements
                </button>
              )}
            </>
          )}
        </div>

        <div className="rounded-3xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Attendance Status</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">{myAttendance}%</span>
          </div>

          <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${Math.min(myAttendance, 100)}%` }}
            />
          </div>

          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            {myAttendance === 0
              ? "Attendance will appear once your teacher marks attendance."
              : hasAttendancePenalty
                ? "Your attendance is below 75%. A penalty may apply. Attend more classes to improve your score."
                : "Good attendance. Keep it above 75% to avoid penalties."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Subjects", to: "/student/subjects", icon: "📚" },
          { label: "Homework", to: "/student/homework", icon: "📝" },
          { label: "Quizzes", to: "/student/quizzes", icon: "🧠" },
          { label: "Notes", to: "/student/notes", icon: "🗒️" },
        ].map((action) => (
          <button
            key={action.to}
            type="button"
            onClick={() => navigate(action.to)}
            className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm text-left hover:shadow-md transition"
          >
            <div className="text-2xl mb-2">{action.icon}</div>
            <div className="font-semibold">{action.label}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Open {action.label}
            </div>
          </button>
        ))}
      </div>
      {/* 🔥 Progress (based on subjects) */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow">
        <h2 className="font-semibold mb-4">Progress Overview</h2>

        {subjects.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No subjects available
          </p>
        ) : (
          <div className="space-y-4">
            {subjects.map((subject, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{subject.name}</span>
                  <span>{subject.progress || 0}%</span>
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded">
                  <div
                    className="bg-blue-500 h-2 rounded"
                    style={{ width: `${subject.progress || 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Announcements Modal */}
      {showAnnouncementsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">All Announcements</h2>
              <button
                onClick={() => setShowAnnouncementsModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {announcements.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No announcements yet.</p>
              ) : (
                announcements.slice().reverse().map((announcement, index) => (
                  <div key={index} className="rounded-2xl bg-gray-50 dark:bg-gray-950 p-4 border border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {announcement.text}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {announcement.teacher ? `${announcement.teacher} • ` : ""}
                      {formatAnnouncementDate(announcement.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}