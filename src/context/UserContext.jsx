import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);         // firebase user
  const [userData, setUserData] = useState(null); // firestore data
  const [loading, setLoading] = useState(true);

  const isApprovedTeacher =
    userData?.role === "teacher" &&
    userData?.teacherStatus === "approved";

  const isTeacherRequestPending = userData?.teacherStatus === "pending";
  const canRequestTeacherAccess =
    !userData?.teacherStatus || userData?.teacherStatus === "none";

  useEffect(() => {
    // Listen for auth state changes. When a user signs in, subscribe to their
    // Firestore document with onSnapshot so `userData` updates in realtime
    // (e.g., when a teacher approves a student's enrollment).
    let userDocUnsubscribe = null;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        try {
          const docRef = doc(db, "users", currentUser.uid);
          // Subscribe to realtime updates for the user document
          userDocUnsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
              if (docSnap.exists()) setUserData(docSnap.data());
              else setUserData(null);
            },
            (err) => {
              console.error("User doc listener error:", err);
            }
          );
        } catch (err) {
          console.error(err);
        }
      } else {
        setUser(null);
        setUserData(null);
        if (userDocUnsubscribe) {
          try {
            userDocUnsubscribe();
          } catch {}
          userDocUnsubscribe = null;
        }
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (userDocUnsubscribe) {
        try {
          userDocUnsubscribe();
        } catch {}
      }
    };
  }, []);

  // 🔥 refetch user data function
  const refetchUserData = async () => {
    if (user) {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      } catch (err) {
        console.error("Error refetching user data:", err);
      }
    }
  };

  // 🔥 logout function
  const logout = async () => {
    await signOut(auth);
  };

  // 🔥 Request teacher access
  const requestTeacherAccess = async () => {
    if (!user) {
      console.error("User not authenticated");
      return false;
    }

    try {
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, {
        teacherStatus: "pending",
      });
      await refetchUserData();
      return true;
    } catch (err) {
      console.error("Error requesting teacher access:", err);
      return false;
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        userData,
        loading,
        logout,
        refetchUserData,
        isApprovedTeacher,
        isTeacherRequestPending,
        canRequestTeacherAccess,
        requestTeacherAccess,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

// custom hook
export function useUser() {
  return useContext(UserContext);
}