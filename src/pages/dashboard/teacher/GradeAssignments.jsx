import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { useUser } from "../../../context/UserContext";

export default function GradeAssignments() {
  const { user } = useUser();
  const navigate = useNavigate();

  const [teacherClasses, setTeacherClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gradingData, setGradingData] = useState({});
  const [savingGrade, setSavingGrade] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadTeacherClasses();
  }, [user]);

  useEffect(() => {
    if (!selectedClass) return;
    loadAssignments();
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedAssignment) return;
    loadSubmissions();
  }, [selectedAssignment]);

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
        const isJoinedTeacher = cls.teachers?.some(
          (teacher) => teacher.uid === user.uid
        );
        return isCreator || isJoinedTeacher;
      });

      setTeacherClasses(teacherClassList);
      if (teacherClassList.length > 0) {
        setSelectedClass(teacherClassList[0].code);
      }
    } catch (error) {
      console.error("Failed to load classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const assignmentRef = collection(db, "assignments");
      const q = query(
        assignmentRef,
        where("classCode", "==", selectedClass)
      );
      const snapshot = await getDocs(q);

      const assignmentsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setAssignments(assignmentsList);
      if (assignmentsList.length > 0) {
        setSelectedAssignment(assignmentsList[0]);
      }
    } catch (error) {
      console.error("Failed to load assignments:", error);
    }
  };

  const loadSubmissions = async () => {
    try {
      const submissionsRef = collection(db, "assignmentSubmissions");
      const q = query(
        submissionsRef,
        where("assignmentId", "==", selectedAssignment?.id),
        where("classCode", "==", selectedClass)
      );
      const snapshot = await getDocs(q);

      const submissionsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setSubmissions(submissionsList);

      // Initialize grading data
      const gradingMap = {};
      submissionsList.forEach((sub) => {
        gradingMap[sub.id] = {
          grade: sub.grade || "",
          feedback: sub.feedback || "",
          graded: sub.graded || false,
        };
      });
      setGradingData(gradingMap);
    } catch (error) {
      console.error("Failed to load submissions:", error);
    }
  };

  const handleGradeChange = (submissionId, grade) => {
    setGradingData((prev) => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        grade: grade,
      },
    }));
  };

  const handleFeedbackChange = (submissionId, feedback) => {
    setGradingData((prev) => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        feedback: feedback,
      },
    }));
  };

  const handleSaveGrade = async (submissionId) => {
    if (!gradingData[submissionId]?.grade && gradingData[submissionId]?.grade !== 0) {
      alert("Please enter a grade");
      return;
    }

    setSavingGrade(true);

    try {
      const submissionRef = doc(db, "assignmentSubmissions", submissionId);

      await setDoc(
        submissionRef,
        {
          grade: parseInt(gradingData[submissionId].grade),
          feedback: gradingData[submissionId].feedback,
          graded: true,
          gradedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Update student's performance in the class
      updateStudentPerformance(submissions.find((s) => s.id === submissionId));

      alert("Grade saved successfully!");
      loadSubmissions();
    } catch (error) {
      console.error("Failed to save grade:", error);
      alert("Failed to save grade");
    } finally {
      setSavingGrade(false);
    }
  };

  const updateStudentPerformance = async (submission) => {
    try {
      const classRef = doc(db, "classes", selectedClass);
      const classSnap = await getDoc(classRef);

      if (!classSnap.exists()) return;

      const studentList = classSnap.data().studentList || [];
      const studentIndex = studentList.findIndex(
        (s) => s.uid === submission.studentId
      );

      if (studentIndex === -1) return;

      // Calculate assignments completed (count of graded submissions)
      const submissionsRef = collection(db, "assignmentSubmissions");
      const q = query(
        submissionsRef,
        where("studentId", "==", submission.studentId),
        where("classCode", "==", selectedClass),
        where("graded", "==", true)
      );
      const snapshot = await getDocs(q);

      const assignmentsCompleted = snapshot.docs.length;

      studentList[studentIndex].assignmentsCompleted = assignmentsCompleted;

      await setDoc(classRef, { studentList }, { merge: true });
    } catch (error) {
      console.error("Failed to update student performance:", error);
    }
  };

  if (loading) {
    return <div className="p-6">Loading grading interface...</div>;
  }

  if (teacherClasses.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">Grade Assignments</h1>
        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-4 text-yellow-800 dark:text-yellow-200">
          You have no classes. Create or join a class first.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Grade Assignments</h1>
        <p className="mt-3 text-gray-600 dark:text-gray-300">
          Review and grade student submissions
        </p>
      </div>

      {/* Class and Assignment Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg">
        <div>
          <label className="block text-sm font-medium mb-2">Select Class</label>
          <select
            value={selectedClass || ""}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          >
            {teacherClasses.map((cls) => (
              <option key={cls.code} value={cls.code}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Select Assignment
          </label>
          <select
            value={selectedAssignment?.id || ""}
            onChange={(e) => {
              const assignment = assignments.find((a) => a.id === e.target.value);
              setSelectedAssignment(assignment);
            }}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">-- Select an assignment --</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedAssignment ? (
        <>
          {/* Assignment Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-2">{selectedAssignment.title}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {selectedAssignment.description}
            </p>
            <div className="flex gap-4 flex-wrap text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Subject:</span>
                <span className="ml-2 font-medium">{selectedAssignment.subject}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Due:</span>
                <span className="ml-2 font-medium">
                  {new Date(selectedAssignment.due).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">
                  Submissions:
                </span>
                <span className="ml-2 font-medium">{submissions.length}</span>
              </div>
            </div>
          </div>

          {/* Submissions List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {submissions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No submissions yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Student Name
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Submission
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold">
                        Grade
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Feedback
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {submissions.map((submission) => (
                      <tr key={submission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{submission.studentName}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {submission.studentEmail}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <p className="text-sm">
                              {submission.type === "text" ? (
                                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                                  Text
                                </span>
                              ) : (
                                <a
                                  href={submission.fileLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:underline break-all text-xs"
                                >
                                  {submission.fileLink}
                                </a>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(submission.submittedAt).toLocaleString()}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={gradingData[submission.id]?.grade || ""}
                            onChange={(e) =>
                              handleGradeChange(submission.id, e.target.value)
                            }
                            placeholder="0-100"
                            className="w-16 px-2 py-1 border rounded text-center dark:bg-gray-700 dark:border-gray-600"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <textarea
                            value={gradingData[submission.id]?.feedback || ""}
                            onChange={(e) =>
                              handleFeedbackChange(submission.id, e.target.value)
                            }
                            placeholder="Add feedback..."
                            className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 resize-none h-12 text-sm"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleSaveGrade(submission.id)}
                            disabled={savingGrade}
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              gradingData[submission.id]?.graded
                                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 cursor-default"
                                : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                            }`}
                          >
                            {savingGrade
                              ? "Saving..."
                              : gradingData[submission.id]?.graded
                              ? "✓ Graded"
                              : "Save"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500 py-12">
          Please select an assignment to view submissions
        </div>
      )}
    </div>
  );
}
