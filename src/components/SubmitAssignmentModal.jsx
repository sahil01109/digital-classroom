import React, { useState, useEffect } from "react";
import { doc, setDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db, storage } from "../firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useUser } from "../context/UserContext";

export default function SubmitAssignmentModal({
  assignment,
  classId,
  isOpen,
  onClose,
  onSuccess,
}) {
  const { userData } = useUser();
  const [submissionType, setSubmissionType] = useState("text");
  const [textAnswer, setTextAnswer] = useState("");
  const [fileLink, setFileLink] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState(null);

  useEffect(() => {
    if (isOpen) {
      checkExistingSubmission();
    }
  }, [isOpen, assignment?.id]);

  const checkExistingSubmission = async () => {
    try {
      const submissionsRef = collection(db, "assignmentSubmissions");
      const q = query(
        submissionsRef,
        where("assignmentId", "==", assignment?.id),
        where("studentId", "==", userData?.uid)
      );
      const snapshot = await getDocs(q);

      if (snapshot.docs.length > 0) {
        setExistingSubmission(snapshot.docs[0].data());
        setTextAnswer(snapshot.docs[0].data().text || "");
        setFileLink(snapshot.docs[0].data().fileLink || "");
        setSubmissionType(snapshot.docs[0].data().type || "text");
      }
    } catch (error) {
      console.error("Error checking submission:", error);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!textAnswer.trim() && !fileLink.trim() && !attachmentFile) {
      alert("Please provide either a text answer, a file upload, or a file link.");
      return;
    }

    setLoading(true);

    try {
      const submissionId =
        existingSubmission?.id ||
        `${assignment.id}_${userData?.uid}_${Date.now()}`;

      let finalFileLink = fileLink;
      let fileName = existingSubmission?.fileName || "";

      if (attachmentFile) {
        fileName = attachmentFile.name;
        finalFileLink = await uploadFile(
          attachmentFile,
          `assignmentSubmissions/${userData.uid}/${Date.now()}_${attachmentFile.name}`
        );
      }

      const submissionData = {
        assignmentId: assignment.id,
        classCode: classId,
        studentId: userData?.uid,
        studentName: userData?.name || "Student",
        studentEmail: userData?.email,
        text: submissionType === "text" ? textAnswer : "",
        fileLink: submissionType === "file" ? finalFileLink : finalFileLink,
        fileName,
        type: submissionType,
        submittedAt: new Date().toISOString(),
        status: "submitted",
        graded: existingSubmission?.graded || false,
        grade: existingSubmission?.grade || null,
        feedback: existingSubmission?.feedback || "",
      };

      await setDoc(doc(db, "assignmentSubmissions", submissionId), submissionData);

      alert(
        existingSubmission
          ? "Submission updated successfully!"
          : "Assignment submitted successfully!"
      );
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error submitting assignment:", error);
      alert("Failed to submit assignment");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 max-h-96 overflow-y-auto">
        <div>
          <h2 className="text-2xl font-bold">
            {existingSubmission ? "Update Submission" : "Submit Assignment"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            {assignment?.title}
          </p>
        </div>

        {existingSubmission && (
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm text-blue-800 dark:text-blue-200">
            Already submitted on{" "}
            {new Date(existingSubmission.submittedAt).toLocaleDateString()}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Submission Type
            </label>
            <select
              value={submissionType}
              onChange={(e) => setSubmissionType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="text">Text Answer</option>
              <option value="file">File Link</option>
            </select>
          </div>

          {submissionType === "text" ? (
            <div>
              <label className="block text-sm font-medium mb-2">
                Your Answer
              </label>
              <textarea
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 h-32 resize-none"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  File Upload
                </label>
                <input
                  type="file"
                  onChange={(e) => {
                    setAttachmentFile(e.target.files?.[0] || null);
                    setFileLink("");
                  }}
                  className="w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900 dark:file:text-blue-100"
                />
                {attachmentFile && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Selected: {attachmentFile.name} {uploadProgress > 0 && `(${uploadProgress}% uploaded)`}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Or File Link
                </label>
                <input
                  type="url"
                  value={fileLink}
                  onChange={(e) => setFileLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste Google Drive, OneDrive, or Dropbox link if you prefer.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-100 py-2 rounded-lg font-medium hover:bg-gray-400 dark:hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition"
            >
              {loading
                ? "Submitting..."
                : existingSubmission
                ? "Update"
                : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
