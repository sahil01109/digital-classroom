import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import { useUser } from "../../../context/UserContext";

export default function Classes() {
  const { user } = useUser();
  const navigate = useNavigate();
  
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState("");

  useEffect(() => {
    if (!user) return;
    loadClasses();
  }, [user]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, "classes"));

      const allClasses = snapshot.docs.map((document) => ({
        id: document.id,
        code: document.id,
        ...document.data(),
      }));

      // Filter to show only classes where current user is teacher
      const teacherClasses = allClasses.filter((cls) => {
        const isCreator = cls.teacherId === user.uid;
        const isJoinedTeacher = cls.teachers?.some(
          (teacher) => teacher.uid === user.uid
        );
        return isCreator || isJoinedTeacher;
      });

      setClasses(teacherClasses);
    } catch (error) {
      console.error("Failed to load classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClassClick = (classCode) => {
    navigate(`/teacher/classes/${classCode}`);
  };

  const handleCopyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode("") , 2000);
    } catch (error) {
      console.error("Failed to copy class code:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">Classes</h1>
        <div className="text-center py-8">Loading your classes...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Classes & Join Details</h1>
        <p className="mt-3 text-gray-600 dark:text-gray-300 max-w-2xl">
          Review your class roster, join codes, and subject summaries in one place.
        </p>
      </div>

      {classes.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            No classes created or joined yet.
          </p>
          <button
            onClick={() => navigate("/teacher")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Go to Dashboard to Create a Class
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
            {classes.map((cls) => (
              <div
                key={cls.code}
                onClick={() => handleClassClick(cls.code)}
                className="rounded-3xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 p-5 cursor-pointer hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition transform hover:scale-105"
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">{cls.name}</h2>
                  <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                    {cls.students || 0} students
                  </span>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-3">
                  Code: {cls.code}
                </p>

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-3">
                  <p>
                    Subjects:{" "}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {cls.subjects?.length || 0}
                    </span>
                  </p>
                  <p>
                    Teachers:{" "}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {cls.teachers?.length || 1}
                    </span>
                  </p>
                </div>

                <div className="grid gap-3">
                  <button
                    type="button"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClassClick(cls.code);
                    }}
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyCode(cls.code);
                    }}
                  >
                    {copiedCode === cls.code ? "Copied!" : "Copy Code"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Class Statistics Summary */}
          <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Classes
                </p>
                <p className="text-3xl font-bold text-blue-600">{classes.length}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Students
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {classes.reduce((sum, cls) => sum + (cls.students || 0), 0)}
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Subjects
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  {classes.reduce((sum, cls) => sum + (cls.subjects?.length || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
