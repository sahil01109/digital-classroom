import React from "react";

export default function EnrollmentConfirmation({
  classData,
  subjects,
  onClose,
  onNavigate,
  isOpen = true,
}) {
  if (!classData || !isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold text-green-600">
            Successfully Enrolled!
          </h2>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-xl">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Class Name
          </p>
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            {classData.name}
          </h3>
        </div>

        {subjects && subjects.length > 0 && (
          <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-xl">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Enrolled Subjects
            </p>
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject, index) => {
                const subjectName = typeof subject === "string" ? subject : subject.name || "Subject";
                return (
                  <span
                    key={index}
                    className="bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {subjectName}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 py-2 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Stay
          </button>
          <button
            onClick={onNavigate}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
