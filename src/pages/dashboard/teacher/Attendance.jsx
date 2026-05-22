import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, setDoc, query, where } from "firebase/firestore";
import { db } from "../../../firebase";
import { useUser } from "../../../context/UserContext";

export default function Attendance() {
  const { user } = useUser();

  const [teacherClasses, setTeacherClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [viewMode, setViewMode] = useState("mark");

  useEffect(() => {
    if (!user) return;
    loadTeacherClasses();
  }, [user]);

  useEffect(() => {
    if (!selectedClass) return;
    loadStudents();
    loadAttendanceRecords();
  }, [selectedClass, selectedDate]);

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

  const loadStudents = async () => {
    try {
      const classRef = doc(db, "classes", selectedClass);
      const classSnap = await getDoc(classRef);

      if (classSnap.exists()) {
        const studentList = classSnap.data().studentList || [];
        setStudents(studentList);

        const attendanceState = {};
        studentList.forEach((student) => {
          attendanceState[student.uid] = null;
        });
        setAttendance(attendanceState);
      }
    } catch (error) {
      console.error("Failed to load students:", error);
    }
  };

  const loadAttendanceRecords = async () => {
    try {
      const attendanceRef = collection(db, "attendance");
      const q = query(
        attendanceRef,
        where("classCode", "==", selectedClass),
        where("date", "==", selectedDate)
      );
      const snapshot = await getDocs(q);

      if (snapshot.docs.length > 0) {
        const records = snapshot.docs[0].data().records || {};
        setAttendance(records);
      }
    } catch (error) {
      console.error("Failed to load attendance records:", error);
    }
  };

  const loadAttendanceHistory = async () => {
    try {
      const attendanceRef = collection(db, "attendance");
      const q = query(
        attendanceRef,
        where("classCode", "==", selectedClass)
      );
      const snapshot = await getDocs(q);

      const records = snapshot.docs.map((doc) => ({
        ...doc.data(),
      }));

      records.sort((a, b) => new Date(b.date) - new Date(a.date));
      setHistory(records);
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status,
    }));
  };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);

      const attendanceDocId = `${selectedClass}_${selectedDate}`;
      const attendanceRef = doc(db, "attendance", attendanceDocId);

      await setDoc(attendanceRef, {
        classCode: selectedClass,
        className: teacherClasses.find((c) => c.code === selectedClass)?.name,
        date: selectedDate,
        records: attendance,
        savedAt: new Date().toISOString(),
        teacherId: user.uid,
      });

      updateStudentAttendancePercentages();

      alert("Attendance saved successfully!");
      loadAttendanceRecords();
    } catch (error) {
      console.error("Failed to save attendance:", error);
      alert("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const updateStudentAttendancePercentages = async () => {
    try {
      const attendanceRef = collection(db, "attendance");
      const q = query(attendanceRef, where("classCode", "==", selectedClass));
      const snapshot = await getDocs(q);

      const attendanceRecords = snapshot.docs.map((doc) => doc.data());

      const classRef = doc(db, "classes", selectedClass);
      const classSnap = await getDoc(classRef);
      const studentList = classSnap.data().studentList || [];

      const updatedStudentList = studentList.map((student) => {
        let presentCount = 0;
        let totalDays = 0;

        attendanceRecords.forEach((record) => {
          if (record.records[student.uid]) {
            totalDays++;
            if (record.records[student.uid] === "present") {
              presentCount++;
            }
          }
        });

        const attendancePercentage =
          totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

        return {
          ...student,
          attendance: attendancePercentage,
        };
      });

      await setDoc(classRef, { studentList: updatedStudentList }, { merge: true });
    } catch (error) {
      console.error("Failed to update attendance percentages:", error);
    }
  };

  const handleMarkAllPresent = () => {
    const newAttendance = {};
    students.forEach((student) => {
      newAttendance[student.uid] = "present";
    });
    setAttendance(newAttendance);
  };

  const handleMarkAllAbsent = () => {
    const newAttendance = {};
    students.forEach((student) => {
      newAttendance[student.uid] = "absent";
    });
    setAttendance(newAttendance);
  };

  const getAttendanceStats = () => {
    const present = Object.values(attendance).filter((s) => s === "present").length;
    const absent = Object.values(attendance).filter((s) => s === "absent").length;
    const late = Object.values(attendance).filter((s) => s === "late").length;
    const unmarked = students.length - present - absent - late;

    return { present, absent, late, unmarked };
  };

  const stats = getAttendanceStats();

  if (loading) {
    return <div className="p-6">Loading attendance data...</div>;
  }

  if (teacherClasses.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">Attendance</h1>
        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-4 text-yellow-800 dark:text-yellow-200">
          You have no classes. Create or join a class first.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Attendance</h1>
        <p className="mt-3 text-gray-600 dark:text-gray-300">
          Mark and track student attendance for your classes.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Class</label>
            <select
              value={selectedClass || ""}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              {teacherClasses.map((cls) => (
                <option key={cls.code} value={cls.code}>
                  {cls.name} ({cls.students || 0} students)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("mark")}
            className={`px-4 py-2 rounded-lg font-medium ${
              viewMode === "mark"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            Mark Attendance
          </button>
          <button
            onClick={() => {
              setViewMode("history");
              loadAttendanceHistory();
            }}
            className={`px-4 py-2 rounded-lg font-medium ${
              viewMode === "history"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            History
          </button>
        </div>
      </div>

      {viewMode === "mark" ? (
        <>
          {students.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Present", value: stats.present, color: "green" },
                { label: "Absent", value: stats.absent, color: "red" },
                { label: "Late", value: stats.late, color: "yellow" },
                { label: "Unmarked", value: stats.unmarked, color: "gray" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`bg-${stat.color}-50 dark:bg-${stat.color}-950 p-3 rounded-lg text-center`}
                >
                  <p className={`text-2xl font-bold text-${stat.color}-600`}>
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleMarkAllPresent}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium"
            >
              Mark All Present
            </button>
            <button
              onClick={handleMarkAllAbsent}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium"
            >
              Mark All Absent
            </button>
            <button
              onClick={handleSaveAttendance}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg font-medium"
            >
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Student Name
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">
                      Present
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">
                      Absent
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">
                      Late
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                        No students in this class
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr key={student.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {student.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleAttendanceChange(student.uid, "present")}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${
                              attendance[student.uid] === "present"
                                ? "bg-green-600 text-white"
                                : "bg-gray-200 dark:bg-gray-700 hover:bg-green-200"
                            }`}
                          >
                            ✓
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleAttendanceChange(student.uid, "absent")}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${
                              attendance[student.uid] === "absent"
                                ? "bg-red-600 text-white"
                                : "bg-gray-200 dark:bg-gray-700 hover:bg-red-200"
                            }`}
                          >
                            ✗
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleAttendanceChange(student.uid, "late")}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${
                              attendance[student.uid] === "late"
                                ? "bg-yellow-600 text-white"
                                : "bg-gray-200 dark:bg-gray-700 hover:bg-yellow-200"
                            }`}
                          >
                            L
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {history.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No attendance records found for this class
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Date
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">
                      Present
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">
                      Absent
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">
                      Late
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {history.map((record) => {
                    const presentCount = Object.values(record.records).filter(
                      (s) => s === "present"
                    ).length;
                    const absentCount = Object.values(record.records).filter(
                      (s) => s === "absent"
                    ).length;
                    const lateCount = Object.values(record.records).filter(
                      (s) => s === "late"
                    ).length;

                    return (
                      <tr key={record.date} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 font-medium">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full">
                            {presentCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-3 py-1 rounded-full">
                            {absentCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full">
                            {lateCount}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
