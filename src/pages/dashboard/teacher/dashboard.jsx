import React, { useEffect, useMemo, useState } from "react";
import {
  arrayUnion,
  arrayRemove,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  serverTimestamp,
  updateDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { useUser } from "../../../context/UserContext";
import { useNavigate } from "react-router-dom";
import AILessonPlanner from "../../../components/AILessonPlanner";

const recentUpdates = [
  { date: "Apr 27", text: "Uploaded new lesson plan for CSE 1." },
  { date: "Apr 26", text: "Published assignments for CSE 3." },
  { date: "Apr 25", text: "Reviewed attendance records for CSE 5." },
];

function generateClassCode(name = "CLASS") {
  const prefix = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);

  const random = Array.from({ length: 4 }, () =>
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(
      Math.floor(Math.random() * 36)
    )
  ).join("");

  return `${prefix || "CLASS"}-${random}`;
}

export default function Dashboard() {
  const { user, userData, isApprovedTeacher, isTeacherRequestPending, canRequestTeacherAccess } = useUser();
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignmentsDueCount, setAssignmentsDueCount] = useState(0);
  const [attendanceRateValue, setAttendanceRateValue] = useState("0%");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);

  const [newClassName, setNewClassName] = useState("");
  const [newClassSubjects, setNewClassSubjects] = useState([]);
  const [subjectInput, setSubjectInput] = useState("");

  const [joinCode, setJoinCode] = useState("");
  const [joinSubjects, setJoinSubjects] = useState([]);
  const [joinSubjectInput, setJoinSubjectInput] = useState("");

  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [announcementClass, setAnnouncementClass] = useState("");
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [announcementSuccess, setAnnouncementSuccess] = useState("");
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceStudents, setAttendanceStudents] = useState([]);
  const [attendanceModalTitle, setAttendanceModalTitle] = useState("Student Attendance");

  const [aiPlannerClass, setAiPlannerClass] = useState("");
  const [aiPlannerSubject, setAiPlannerSubject] = useState("");

  const loadClasses = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const snapshot = await getDocs(collection(db, "classes"));

      const allClasses = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

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

  useEffect(() => {
    loadClasses();
  }, [user]);

  useEffect(() => {
    if (classes.length > 0 && !announcementClass) {
      setAnnouncementClass(classes[0].id);
    }
  }, [classes, announcementClass]);

  const loadAssignmentsDue = async () => {
    if (!user) return;
    try {
      const assignmentsRef = collection(db, "assignments");
      const q = query(assignmentsRef, where("teacherId", "==", user.uid));
      const snapshot = await getDocs(q);
      const now = new Date();
      const dueCount = snapshot.docs.filter(doc => new Date(doc.data().due) < now).length;
      setAssignmentsDueCount(dueCount);
    } catch (error) {
      console.error("Failed to load assignments:", error);
    }
  };

  const loadAttendanceRate = async () => {
    if (!user || classes.length === 0) return;
    try {
      let totalPresent = 0;
      let totalRecords = 0;

      for (const cls of classes) {
        const attendanceRef = collection(db, "attendance");
        const q = query(attendanceRef, where("classCode", "==", cls.id));
        const snapshot = await getDocs(q);

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.records) {
            Object.values(data.records).forEach(status => {
              totalRecords++;
              if (status === "present") totalPresent++;
            });
          }
        });
      }

      const rate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
      setAttendanceRateValue(`${rate}%`);
    } catch (error) {
      console.error("Failed to calculate attendance:", error);
    }
  };

  useEffect(() => {
    if (classes.length > 0) {
      loadAssignmentsDue();
      loadAttendanceRate();
    }
  }, [classes, user]);

  const totalStudents = useMemo(() => {
    return classes.reduce((total, cls) => total + (cls.students || 0), 0);
  }, [classes]);

  const lowAttendanceCount = useMemo(() => {
    return classes.reduce((count, cls) => {
      const students = Array.isArray(cls.studentList) ? cls.studentList : [];
      return (
        count +
        students.filter(
          (student) =>
            typeof student.attendance === "number" && student.attendance < 75
        ).length
      );
    }, 0);
  }, [classes]);

  const selectedAnnouncementClass = classes.find((cls) => cls.id === announcementClass);
  const selectedAnnouncements = Array.isArray(selectedAnnouncementClass?.announcements)
    ? selectedAnnouncementClass.announcements
    : [];

  const assignmentsDue = useMemo(async () => {
    if (!user) return 0;
    try {
      const assignmentsRef = collection(db, "assignments");
      const q = query(assignmentsRef, where("teacherId", "==", user.uid));
      const snapshot = await getDocs(q);
      const now = new Date();
      return snapshot.docs.filter(doc => new Date(doc.data().due) < now).length;
    } catch (error) {
      console.error("Failed to load assignments:", error);
      return 0;
    }
  }, [user, classes]);

  const attendanceRate = useMemo(async () => {
    if (!user || classes.length === 0) return "0%";
    try {
      let totalPresent = 0;
      let totalRecords = 0;

      for (const cls of classes) {
        const attendanceRef = collection(db, "attendance");
        const q = query(attendanceRef, where("classCode", "==", cls.id));
        const snapshot = await getDocs(q);

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.records) {
            Object.values(data.records).forEach(status => {
              totalRecords++;
              if (status === "present") totalPresent++;
            });
          }
        });
      }

      const rate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
      return `${rate}%`;
    } catch (error) {
      console.error("Failed to calculate attendance:", error);
      return "0%";
    }
  }, [user, classes]);

  const teacherStats = [
    {
      title: "Active Classes",
      value: classes.length,
      icon: "📚",
      description: "Classes created or joined by you",
    },
    {
      title: "Students Enrolled",
      value: totalStudents,
      icon: "👥",
      description: "Total students across your classes",
    },
    {
      title: "Assignments Due",
      value: assignmentsDueCount,
      icon: "📝",
      description: "Pending grading and follow-up",
    },
    {
      title: "Low Attendance",
      value: lowAttendanceCount,
      icon: "⚠️",
      description: "Students below 75% attendance",
    },
    {
      title: "Attendance Rate",
      value: attendanceRateValue,
      icon: "✅",
      description: "Average student attendance",
    },
  ];

  const generateUniqueCode = async (name) => {
    let attempts = 0;

    while (attempts < 6) {
      const code = generateClassCode(name);
      const classRef = doc(db, "classes", code);
      const classSnap = await getDoc(classRef);

      if (!classSnap.exists()) {
        return code;
      }

      attempts++;
    }

    throw new Error("Could not generate unique class code.");
  };

  const handleSaveAnnouncement = async (event) => {
    event.preventDefault();

    if (!announcementClass || !newAnnouncement.trim()) {
      alert("Please select a class and enter an announcement.");
      return;
    }

    if (!user || !userData) {
      alert("Teacher not logged in. Please log in again.");
      return;
    }

    try {
      setAnnouncementSaving(true);
      const classRef = doc(db, "classes", announcementClass);
      
      await setDoc(
        classRef,
        {
          announcements: arrayUnion({
            text: newAnnouncement.trim(),
            teacher: userData?.name || "Teacher",
            createdAt: new Date(),
          }),
        },
        { merge: true }
      );

      setNewAnnouncement("");
      setAnnouncementSuccess("Announcement posted successfully.");
      setTimeout(() => setAnnouncementSuccess(""), 3000);
      await loadClasses();
    } catch (error) {
      console.error("Failed to post announcement:", error);
      console.error("Class ID:", announcementClass);
      console.error("User:", user?.uid);
      alert(`Could not post announcement: ${error.message}`);
    } finally {
      setAnnouncementSaving(false);
    }
  };

  const handleDeleteAnnouncement = async (announcement) => {
    if (!selectedAnnouncementClass) {
      alert("Please select a class first.");
      return;
    }

    try {
      const classRef = doc(db, "classes", selectedAnnouncementClass.id);
      await updateDoc(classRef, {
        announcements: arrayRemove(announcement),
      });
      await loadClasses();
      setAnnouncementSuccess("Announcement deleted successfully.");
      setTimeout(() => setAnnouncementSuccess(""), 3000);
    } catch (error) {
      console.error("Failed to delete announcement:", error);
      alert("Could not delete announcement. Please try again.");
    }
  };

  const handleAddCreateSubject = () => {
    const subject = subjectInput.trim();

    if (!subject) return;
    if (newClassSubjects.includes(subject)) return;

    setNewClassSubjects((prev) => [...prev, subject]);
    setSubjectInput("");
  };

  const handleAddJoinSubject = () => {
    const subject = joinSubjectInput.trim();

    if (!subject) return;
    if (joinSubjects.includes(subject)) return;

    setJoinSubjects((prev) => [...prev, subject]);
    setJoinSubjectInput("");
  };

  const handleCreateClass = async (event) => {
    event.preventDefault();

    if (!newClassName.trim()) {
      alert("Please enter class name.");
      return;
    }

    if (newClassSubjects.length === 0) {
      alert("Please add at least one subject.");
      return;
    }

    if (!user || !isApprovedTeacher) {
      alert("Only approved teachers can create classes.");
      return;
    }

    setCreateLoading(true);

    try {
      const code = await generateUniqueCode(newClassName);

      const teacherName = userData?.name || user.displayName || "Teacher";
      const teacherInfo = {
        uid: user.uid,
        name: teacherName,
        email: user.email || "",
        subjects: newClassSubjects,
        joinedAt: Timestamp.now(),
        role: "owner",
      };

      const classSubjects = newClassSubjects.map((name) => ({
        name,
        teacher: teacherName,
        teacherId: user.uid,
      }));

      const newClass = {
        name: newClassName.trim(),
        code,
        teacherId: user.uid,
        teacherName,
        subjects: classSubjects,
        teachers: [teacherInfo],
        students: 0,
        studentList: [],
        announcements: [],
        status: "Active",
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "classes", code), newClass);

      setClasses((prev) => [
        {
          id: code,
          ...newClass,
          announcements: [],
          createdAt: Timestamp.now(),
        },
        ...prev,
      ]);

      setNewClassName("");
      setNewClassSubjects([]);
      setSubjectInput("");
      setShowCreateForm(false);

      alert("Class created successfully!");
    } catch (error) {
      console.error("Create class failed:", error);
      alert("Could not create class.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinClass = async (event) => {
    event.preventDefault();

    const code = joinCode.trim().toUpperCase();

    if (!code) {
      alert("Please enter class code.");
      return;
    }

    if (joinSubjects.length === 0) {
      alert("Please add at least one subject.");
      return;
    }

    if (!user || !isApprovedTeacher) {
      alert("Only approved teachers can join classes.");
      return;
    }

    setJoinLoading(true);

    try {
      const classRef = doc(db, "classes", code);
      const classSnap = await getDoc(classRef);

      if (!classSnap.exists()) {
        alert("Invalid class code.");
        setJoinLoading(false);
        return;
      }

      const classData = classSnap.data();
      const existingTeachers = classData.teachers || [];

      const alreadyJoined = existingTeachers.some(
        (teacher) => teacher.uid === user.uid
      );

      if (alreadyJoined) {
        alert("You already joined this class.");
        setJoinLoading(false);
        return;
      }

      const teacherName = userData?.name || user.displayName || "Teacher";
      const teacherInfo = {
        uid: user.uid,
        name: teacherName,
        email: user.email || "",
        subjects: joinSubjects,
        joinedAt: Timestamp.now(),
        role: "teacher",
      };

      const updatedTeachers = [...existingTeachers, teacherInfo];

      const existingSubjects = Array.isArray(classData.subjects)
        ? classData.subjects
        : [];

      const normalizedExistingSubjects = existingSubjects.map((subject) =>
        typeof subject === "string"
          ? { name: subject }
          : subject
      );

      const joinSubjectObjects = joinSubjects.map((name) => ({
        name,
        teacher: teacherName,
        teacherId: user.uid,
      }));

      const subjectMap = new Map(
        normalizedExistingSubjects.map((subject) => [subject.name, subject])
      );

      joinSubjectObjects.forEach((subject) => {
        if (!subjectMap.has(subject.name)) {
          subjectMap.set(subject.name, subject);
        }
      });

      const mergedSubjects = Array.from(subjectMap.values());

      await setDoc(
        classRef,
        {
          teachers: updatedTeachers,
          subjects: mergedSubjects,
        },
        { merge: true }
      );

      setClasses((prev) => [
        {
          id: code,
          ...classData,
          code: classData.code || code,
          teachers: updatedTeachers,
          subjects: mergedSubjects,
        },
        ...prev,
      ]);

      setJoinCode("");
      setJoinSubjects([]);
      setJoinSubjectInput("");
      setShowJoinForm(false);

      alert("Class joined successfully!");
    } catch (error) {
      console.error("Join class failed:", error);
      alert("Could not join class.");
    } finally {
      setJoinLoading(false);
    }
  };

  const getMySubjects = (cls) => {
    const currentTeacher = cls.teachers?.find(
      (teacher) => teacher.uid === user?.uid
    );

    return currentTeacher?.subjects || [];
  };

  const handleOpenAttendanceModal = () => {
    const studentList = classes.flatMap((cls) =>
      Array.isArray(cls.studentList)
        ? cls.studentList.map((student) => ({
            ...student,
            className: cls.name,
          }))
        : []
    );

    const enrichedStudents = studentList
      .map((student) => ({
        name: student.name || student.displayName || "Unnamed Student",
        email: student.email || student.uid || "No email",
        attendance:
          typeof student.attendance === "number"
            ? student.attendance
            : null,
        className: student.className || "Unknown Class",
      }))
      .sort((a, b) => {
        if (a.attendance === null) return 1;
        if (b.attendance === null) return -1;
        return a.attendance - b.attendance;
      });

    setAttendanceStudents(enrichedStudents);
    setAttendanceModalTitle("Student Attendance");
    setShowAttendanceModal(true);
  };

  if (loading) {
    return <div className="p-6">Loading teacher dashboard...</div>;
  }

  return (
    <div className="p-6">
      {/* Show approval message if not approved */}
      {!isApprovedTeacher && isTeacherRequestPending && (
        <div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-2xl">
          <h3 className="font-semibold">⏳ Pending Teacher Approval</h3>
          <p className="text-sm mt-1">Your teacher access request is pending admin approval. You can still access student features. We'll notify you once your request is reviewed.</p>
        </div>
      )}

      {!isApprovedTeacher && canRequestTeacherAccess && (
        <div className="mb-6 p-4 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-2xl">
          <h3 className="font-semibold">🔒 Teacher Features Locked</h3>
          <p className="text-sm mt-1">To access teacher features like creating classes and assignments, please request teacher access from your profile settings.</p>
        </div>
      )}

      <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="mt-3 text-gray-600 dark:text-gray-300 max-w-2xl">
            {isApprovedTeacher 
              ? "Create your own classes or join existing classes using a class code."
              : "You need teacher approval to access full teacher features."}
            Your created and joined classes will appear here after login.
          </p>
        </div>

        {isApprovedTeacher && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setShowCreateForm((prev) => !prev);
                setShowJoinForm(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl shadow-sm font-medium"
            >
              + Create Class
            </button>

            <button
              onClick={() => {
                setShowJoinForm((prev) => !prev);
                setShowCreateForm(false);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl shadow-sm font-medium"
            >
              Join Class
            </button>

            <button
              onClick={() => navigate('/teacher/quizzes')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl shadow-sm font-medium"
            >
              🤖 Create Quiz
            </button>
          </div>
        )}
      </div>

    
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white dark:bg-gray-900 shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-gray-200 dark:border-gray-700 px-6 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Manage Announcements</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Post new announcements and review existing messages for your selected class.
                </p>
              </div>
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6">
              <div className="rounded-3xl bg-gray-50 dark:bg-gray-950 p-4">
                {classes.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Please create or join a class first to post announcements.
                  </p>
                ) : (
                  <form onSubmit={handleSaveAnnouncement} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Select Class</label>
                      <select
                        value={announcementClass}
                        onChange={(e) => setAnnouncementClass(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800"
                      >
                        <option value="">Choose a class</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Announcement</label>
                      <textarea
                        value={newAnnouncement}
                        onChange={(e) => setNewAnnouncement(e.target.value)}
                        rows={3}
                        placeholder="Type your message for students"
                        className="w-full px-4 py-3 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={announcementSaving || !announcementClass}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {announcementSaving ? "Posting..." : "Post Announcement"}
                    </button>

                    {announcementSuccess && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {announcementSuccess}
                      </p>
                    )}
                  </form>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Posted Announcements</h3>
                {selectedAnnouncements.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No announcements available.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedAnnouncements.slice().reverse().map((announcement, index) => (
                      <div key={index} className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm text-gray-900 dark:text-gray-100">{announcement.text}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              {announcement.teacher ? `${announcement.teacher} • ` : ""}
                              {announcement.createdAt?.toDate ? announcement.createdAt.toDate().toLocaleDateString() : announcement.createdAt}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteAnnouncement(announcement)}
                            className="rounded-2xl bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white dark:bg-gray-900 shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-gray-200 dark:border-gray-700 px-6 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{attendanceModalTitle}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Review student attendance across your classes below.
                </p>
              </div>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6">
              {attendanceStudents.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No student attendance records are available for your classes.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-3xl bg-gray-50 dark:bg-gray-950 p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Students</p>
                      <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{attendanceStudents.length}</p>
                    </div>
                    <div className="rounded-3xl bg-blue-50 dark:bg-blue-950/40 p-4">
                      <p className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-300">Lowest Attendance</p>
                      <p className="mt-2 text-3xl font-semibold text-blue-700 dark:text-blue-200">
                        {attendanceStudents[0].attendance !== null ? `${attendanceStudents[0].attendance}%` : "N/A"}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-green-50 dark:bg-green-950/40 p-4">
                      <p className="text-xs uppercase tracking-wide text-green-600 dark:text-green-300">Classes Covered</p>
                      <p className="mt-2 text-3xl font-semibold text-green-700 dark:text-green-200">
                        {new Set(attendanceStudents.map((student) => student.className)).size}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
                    <div className="grid grid-cols-12 gap-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      <span className="col-span-5">Student</span>
                      <span className="col-span-4">Class</span>
                      <span className="col-span-2">Attendance</span>
                      <span className="col-span-1 text-right">Status</span>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {attendanceStudents.map((student, idx) => (
                        <div key={`${student.email}-${idx}`} className="grid grid-cols-12 gap-4 px-4 py-4 items-center text-sm text-gray-700 dark:text-gray-200">
                          <div className="col-span-5">
                            <div className="font-medium">{student.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{student.email}</div>
                          </div>
                          <div className="col-span-4 text-sm text-gray-600 dark:text-gray-300">{student.className}</div>
                          <div className="col-span-2 font-semibold">{
                            student.attendance !== null ? `${student.attendance}%` : "N/A"
                          }</div>
                          <div className="col-span-1 text-right">
                            <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${student.attendance !== null && student.attendance < 75 ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200" : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"}`}>
                              {student.attendance !== null ? (student.attendance < 75 ? "Low" : "Good") : "Unknown"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

   

      {showCreateForm && isApprovedTeacher && (
        <div className="mb-8 rounded-3xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold mb-4">Create New Class</h2>

          <form onSubmit={handleCreateClass} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Class Name
              </label>

              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Example: CSE 5"
                className="w-full px-4 py-2 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Subjects You Teach
              </label>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCreateSubject();
                    }
                  }}
                  placeholder="Example: Compiler Design"
                  className="flex-1 px-4 py-2 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800"
                />

                <button
                  type="button"
                  onClick={handleAddCreateSubject}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {newClassSubjects.map((subject) => (
                  <span
                    key={subject}
                    className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                  >
                    {subject}
                    <button
                      type="button"
                      onClick={() =>
                        setNewClassSubjects((prev) =>
                          prev.filter((item) => item !== subject)
                        )
                      }
                      className="ml-2 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={createLoading}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl"
              >
                {createLoading ? "Creating..." : "Create Class"}
              </button>

              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-300 dark:bg-gray-700 px-6 py-2 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showJoinForm && isApprovedTeacher && (
        <div className="mb-8 rounded-3xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold mb-4">Join Existing Class</h2>

          <form onSubmit={handleJoinClass} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Class Code
              </label>

              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Example: CSE5-A7K2"
                className="w-full px-4 py-2 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 tracking-widest"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Subjects You Teach In This Class
              </label>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={joinSubjectInput}
                  onChange={(e) => setJoinSubjectInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddJoinSubject();
                    }
                  }}
                  placeholder="Example: Computer Graphics"
                  className="flex-1 px-4 py-2 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800"
                />

                <button
                  type="button"
                  onClick={handleAddJoinSubject}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {joinSubjects.map((subject) => (
                  <span
                    key={subject}
                    className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm"
                  >
                    {subject}
                    <button
                      type="button"
                      onClick={() =>
                        setJoinSubjects((prev) =>
                          prev.filter((item) => item !== subject)
                        )
                      }
                      className="ml-2 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={joinLoading}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl"
              >
                {joinLoading ? "Joining..." : "Join Class"}
              </button>

              <button
                type="button"
                onClick={() => setShowJoinForm(false)}
                className="bg-gray-300 dark:bg-gray-700 px-6 py-2 rounded-xl"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
   <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 mb-8">
        {[
          { label: "Classes", to: "/teacher/classes", icon: "🏫" },
          { label: "Assignments", to: "/teacher/assignments", icon: "📝" },
          { label: "Announcements", onClick: () => setShowAnnouncementModal(true), icon: "📣", description: "Add announcements" },
          { label: "Messages", to: "/teacher/messages", icon: "✉️" },
        ].map((action, index) => (
          <button
            key={action.label + index}
            type="button"
            onClick={() => action.onClick ? action.onClick() : navigate(action.to)}
            className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 shadow-sm text-left hover:shadow-md transition"
          >
            <div className="text-2xl mb-2">{action.icon}</div>
            <div className="font-semibold">{action.label}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {action.description || `Open ${action.label}`}
            </div>
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
        {teacherStats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-3xl bg-white dark:bg-gray-900 shadow-sm p-5 border border-gray-100 dark:border-gray-800"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl">{stat.icon}</div>
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {stat.title}
              </div>
            </div>

            <div className="text-4xl font-semibold text-slate-900 dark:text-white">
              {stat.value}
            </div>

            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {stat.description}
            </p>

            {stat.title === "Low Attendance" && (
              <button
                type="button"
                onClick={handleOpenAttendanceModal}
                className="mt-4 inline-flex items-center justify-center rounded-2xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition"
              >
                View attendance list
              </button>
            )}
          </div>
        ))}
      </div>

      {/* AI Tools Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">AI Teaching Tools</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Select a class and subject to use AI-powered teaching assistants.
        </p>

        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Class for AI Tools</label>
            <select
              value={aiPlannerClass}
              onChange={(e) => {
                setAiPlannerClass(e.target.value);
                setAiPlannerSubject("");
              }}
              className="w-full px-4 py-2 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <option value="">-- Select Class --</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Select Subject</label>
            <select
              value={aiPlannerSubject}
              onChange={(e) => setAiPlannerSubject(e.target.value)}
              disabled={!aiPlannerClass}
              className="w-full px-4 py-2 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <option value="">-- Select Subject --</option>
              {aiPlannerClass && getMySubjects(classes.find(cls => cls.id === aiPlannerClass)).map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
        </div>

        <AILessonPlanner
          selectedClass={aiPlannerClass}
          selectedSubject={aiPlannerSubject}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">

        <section className="lg:col-span-2 rounded-3xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold mb-4">Today's Summary</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-blue-50 dark:bg-blue-950/40 p-5">
              <h3 className="text-sm text-blue-600 dark:text-blue-300 uppercase tracking-wide">
                Class Feedback
              </h3>
              <p className="mt-3 text-3xl font-semibold">4.8 / 5</p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Average rating from recent surveys
              </p>
            </div>

            <div className="rounded-3xl bg-green-50 dark:bg-green-950/40 p-5">
              <h3 className="text-sm text-green-600 dark:text-green-300 uppercase tracking-wide">
                Upcoming Exams
              </h3>
              <p className="mt-3 text-3xl font-semibold">3</p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Exams scheduled this week
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>

          <ul className="space-y-3">
            {recentUpdates.map((update) => (
              <li
                key={update.date}
                className="rounded-2xl border border-gray-100 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-950/50"
              >
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>{update.date}</span>
                  <span className="font-semibold">Update</span>
                </div>

                <p className="mt-2 text-gray-700 dark:text-gray-200">
                  {update.text}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}