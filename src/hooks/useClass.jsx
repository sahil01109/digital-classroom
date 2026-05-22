import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";
import { showSuccess, showError, showInfo } from "../utils/toastHelpers";

export default function useClass() {
  const { userData, refetchUserData } = useUser();

  const [classId, setClassId] = useState(null);
  const [classData, setClassData] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollmentConfirmed, setEnrollmentConfirmed] = useState(false);

  // 🔥 Load class when userData changes
  useEffect(() => {
    if (!userData) return;

    // Prefer single `classId`, fall back to the first entry in `classIds` array
    // (some flows write to `classIds` when enrolling students).
    const id =
      userData?.classId ||
      (Array.isArray(userData?.classIds) && userData.classIds.length
        ? userData.classIds[0]
        : null);
    setClassId(id);

    if (id) {
      fetchClass(id);
    } else {
      setClassData(null);
      setSubjects([]);
      setLoading(false);
    }
  }, [userData]);

  // 🔥 Fetch class data
  const fetchClass = async (id) => {
    try {
      setLoading(true);

      const ref = doc(db, "classes", id);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();

        setClassData(data);

        // ✅ SAFE SUBJECT HANDLING (fixes your crash)
        const safeSubjects =
          Array.isArray(data.subjects)
            ? data.subjects
            : Array.isArray(data.Subjects)
            ? data.Subjects
            : [];

        const normalizedSubjects = safeSubjects.map((subject) => {
          if (typeof subject === "string") {
            const assignedTeacher = data.teachers?.find((teacher) =>
              teacher.subjects?.includes(subject)
            );

            return {
              name: subject,
              teacher: assignedTeacher?.name,
              teacherId: assignedTeacher?.uid,
            };
          }

          return subject;
        });

        setSubjects(normalizedSubjects);
      } else {
        setClassData(null);
        setSubjects([]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Join class
  const joinClass = async (code) => {
    if (!code) {
      showError("Enter class code.");
      return;
    }

    try {
      setLoading(true);

      const ref = doc(db, "classes", code);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        showError("Invalid class code.");
        return;
      }

      const data = snap.data();

      // ✅ FIXED UID (important)
      const uid = auth.currentUser?.uid;
      if (!uid) {
        showError("User not authenticated.");
        return;
      }

      // 🔥 Get current user data
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      const userInfo = userSnap.data();

      const isAlreadyEnrolled =
        userInfo?.classId === code ||
        (Array.isArray(userInfo?.classIds) && userInfo.classIds.includes(code)) ||
        Array.isArray(data.studentList) &&
        data.studentList.some((student) => student.uid === uid);

      if (isAlreadyEnrolled) {
        showInfo("You are already enrolled in this class.");
        return;
      }

      const requestRef = doc(db, "classes", code, "joinRequests", uid);
      const requestSnap = await getDoc(requestRef);

      if (requestSnap.exists()) {
        const requestData = requestSnap.data();
        if (requestData.status === "pending") {
          showInfo("Your request is already pending teacher approval.");
          return;
        }
        if (requestData.status === "approved") {
          showInfo("You are already enrolled in this class.");
          return;
        }
        if (requestData.status === "rejected") {
          showError("Your class join request was rejected. Please contact your teacher.");
          return;
        }
      }

      const joinRequest = {
        studentId: uid,
        studentName: userInfo?.name || userInfo?.displayName || "Student",
        studentEmail: userInfo?.email || "",
        classId: code,
        className: data.name || "",
        status: "pending",
        requestedAt: serverTimestamp(),
      };

      await setDoc(requestRef, joinRequest);

      showSuccess("✅ Class join request sent successfully.");
      showInfo("⏳ Your request is pending teacher approval.");
      setEnrollmentConfirmed(true);

      // 🔥 Refetch user data to update all components
      await refetchUserData();

    } catch (err) {
      console.error("Join error:", err);
      showError(`Failed to join class. ${err?.message || "Please try again."}`);
    } finally {
      setLoading(false);
    }
  };

  const clearEnrollmentConfirmed = () => {
    setEnrollmentConfirmed(false);
  };

  return {
    classId,
    classData,
    subjects,
    loading,
    joinClass,
    enrollmentConfirmed,
    clearEnrollmentConfirmed,
  };
}