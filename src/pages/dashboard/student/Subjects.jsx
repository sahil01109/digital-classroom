import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useClass from "../../../hooks/useClass";
import EnrollmentConfirmation from "../../../components/EnrollmentConfirmation";

export default function Subjects() {
  const { subjects, classId, loading, joinClass, error, enrollmentConfirmed, clearEnrollmentConfirmed, classData } = useClass();
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const navigate = useNavigate();

  const handleJoinClass = async () => {
    if (!joinCode.trim()) return;

    setJoining(true);
    await joinClass(joinCode);
    setJoinCode("");
    setJoining(false);
  };

  const handleOpenSubject = (sub, index) => {
    navigate(`/student/subjects/${sub.id || index}`, {
      state: {
        subject: sub,
      },
    });
  };

  const handleNavigateToDashboard = () => {
    clearEnrollmentConfirmed();
    navigate("/student");
  };

  if (loading && !classId) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">My Subjects</h1>

      {error && (
        <div className="bg-red-100 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {!classId ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow text-center">
          <h2 className="text-xl font-semibold mb-2">
            You are not enrolled in any class
          </h2>

          <p className="text-gray-500 mb-6">
            Join a class using a code provided by your teacher
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <input
              type="text"
              placeholder="Enter class code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="p-3 border rounded-lg w-full sm:w-64 dark:bg-gray-700 dark:border-gray-600"
            />

            <button
              onClick={handleJoinClass}
              disabled={joining}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {joining ? "Joining..." : "Join Class"}
            </button>
          </div>
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center text-gray-500">
          No subjects available yet
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((sub, index) => {
            const subjectName = typeof sub === "string" ? sub : sub.name || "Untitled";
            const subjectTeacher =
              typeof sub === "object" && sub.teacher
                ? sub.teacher
                : classData?.teachers?.find((teacher) =>
                    teacher.subjects?.includes(subjectName)
                  )?.name;
            const progress = typeof sub === "object" ? sub.progress : 0;

            return (
              <div
                key={typeof sub === "object" ? sub.id || index : `${subjectName}-${index}`}
                className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow"
              >
                <h2 className="text-lg font-semibold">{subjectName}</h2>

                <p className="text-sm text-gray-500 mb-3">
                  Teacher: {subjectTeacher || "Not assigned"}
                </p>

                <div className="w-full bg-gray-200 h-2 rounded mb-3">
                  <div
                    className="bg-blue-500 h-2 rounded"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <button
                  onClick={() => handleOpenSubject(sub, index)}
                  className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm hover:bg-blue-600 transition"
                >
                  Open
                </button>
              </div>
            );
          })}
        </div>
      )}

      <EnrollmentConfirmation
        classData={classData}
        subjects={subjects}
        onClose={clearEnrollmentConfirmed}
        onNavigate={handleNavigateToDashboard}
        isOpen={enrollmentConfirmed}
      />
    </div>
  );
}