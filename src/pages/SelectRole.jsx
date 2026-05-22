import { useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function SelectRole() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/auth", { replace: true });
    }
  }, [navigate]);

  const setRole = async (role) => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please sign in first.");
      navigate("/auth");
      return;
    }

    // Security: Only allow setting student role here
    // Teacher role must be approved by admin through profile
    if (role === "teacher") {
      alert("To become a teacher, please request access from your Profile page after signing in.");
      return;
    }

    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        role: "student",
        teacherStatus: "none",
        createdAt: serverTimestamp()
      });

      navigate("/student");
    } catch (error) {
      console.error("Error setting role:", error);
      alert("Failed to set role. Please try again.");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center gap-6 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">
          Get Started
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
          Start as a student. You can request teacher access later from your profile.
        </p>

        <button
          onClick={() => setRole("student")}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl transition transform hover:scale-105 shadow-lg"
        >
          Continue as Student
        </button>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-6">
          Want to become a teacher? Access will be available through your profile after sign-in.
        </p>
      </div>
    </div>
  );
}

export default SelectRole;