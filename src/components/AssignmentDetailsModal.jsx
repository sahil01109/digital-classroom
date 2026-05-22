import React from "react";

export default function AssignmentDetailsModal({ assignment, isOpen, onClose }) {
  if (!isOpen || !assignment) return null;

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
        return "PDF Document";
      case "docs":
        return "Word Document";
      case "question":
        return "Text Question";
      default:
        return "Assignment";
    }
  };

  const isDuesSoon = () => {
    const now = new Date();
    const due = new Date(assignment.due);
    const hoursUntilDue = (due - now) / (1000 * 60 * 60);
    return hoursUntilDue < 24 && hoursUntilDue > 0;
  };

  const isOverdue = () => {
    return new Date(assignment.due) < new Date();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-grow">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{getAssignmentTypeIcon(assignment.assignmentType)}</span>
                <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                  {getAssignmentTypeLabel(assignment.assignmentType)}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{assignment.title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                {assignment.subject} • {new Date(assignment.due).toLocaleDateString()} at {new Date(assignment.due).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              {isOverdue() && (
                <p className="text-sm text-red-600 dark:text-red-400 font-semibold mt-1">⚠️ Overdue</p>
              )}
              {isDuesSoon() && !isOverdue() && (
                <p className="text-sm text-orange-600 dark:text-orange-400 font-semibold mt-1">⏰ Due soon!</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-900 dark:hover:text-white text-2xl flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          {assignment.description && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Instructions</h3>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{assignment.description}</p>
              </div>
            </div>
          )}

          {/* Assignment Type Specific Content */}
          {assignment.assignmentType === "question" && assignment.questionContent && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">📝 Your Question</h3>
              <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-2 border-purple-200 dark:border-purple-800">
                <p className="text-base text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed font-medium">
                  {assignment.questionContent}
                </p>
              </div>
            </div>
          )}

          {/* PDF/Docs Documents */}
          {(assignment.assignmentType === "pdf" || assignment.assignmentType === "docs") && assignment.attachmentUrl && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {assignment.assignmentType === "pdf" ? "📄 PDF Document" : "📋 Document"}
              </h3>
              <div className="flex items-center gap-4 p-5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800">
                <div className="text-5xl flex-shrink-0">
                  {assignment.assignmentType === "pdf" ? "📄" : "📋"}
                </div>
                <div className="flex-grow">
                  <p className="font-semibold text-gray-900 dark:text-white">{assignment.attachmentName || "Assignment Document"}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {assignment.assignmentType === "pdf" ? "Click download to view the PDF" : "Click download to view the document"}
                  </p>
                </div>
                <a
                  href={assignment.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-shrink-0 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-200"
                >
                  Download
                </a>
              </div>
            </div>
          )}

          {/* Additional Resources */}
          {assignment.attachmentLink && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">🔗 Additional Resources</h3>
              <div className="flex items-center gap-4 p-5 rounded-xl bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800">
                <div className="text-3xl flex-shrink-0">🔗</div>
                <div className="flex-grow min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">Reference Material</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 truncate mt-1">{assignment.attachmentLink}</p>
                </div>
                <a
                  href={assignment.attachmentLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-shrink-0 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition duration-200"
                >
                  Open
                </a>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end pt-4">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}