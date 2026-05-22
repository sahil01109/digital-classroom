import React, { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";
import { NavLink, Outlet } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function TeacherDashboard() {
  const { user, userData, logout } = useUser();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isClassesOpen, setIsClassesOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);

  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);

  // SAFE TEXT FUNCTION
  const safeText = (value) => {
    if (value === null || value === undefined) return "";

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => safeText(item)).join(", ");
    }

    if (typeof value === "object") {
      return (
        safeText(value.name) ||
        safeText(value.title) ||
        safeText(value.label) ||
        safeText(value.text) ||
        JSON.stringify(value)
      );
    }

    return String(value);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const darkMode = savedTheme === "dark";

    setIsDark(darkMode);

    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // REALTIME CLASSES
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(
      collection(db, "classes"),

      (snapshot) => {
        const allClasses = snapshot.docs.map((doc) => ({
          id: doc.id,
          code: doc.id,
          ...doc.data(),
        }));

        const myClasses = allClasses.filter((cls) => {
          const createdByMe = cls.teacherId === user.uid;

          const joinedByMe = cls.teachers?.some(
            (teacher) => teacher?.uid === user.uid
          );

          return createdByMe || joinedByMe;
        });

        setClasses(myClasses);
        setClassesLoading(false);
      },

      (error) => {
        console.error("Realtime class listener error:", error);
        setClassesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // DARK MODE
  const toggleDark = () => {
    setIsDark((prev) => {
      const next = !prev;

      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }

      return next;
    });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row dark:bg-gray-800 dark:text-white transition duration-300 font-sans">

      {/* MOBILE HEADER */}
      <header className="lg:hidden bg-gradient-to-r from-blue-500 to-blue-700 dark:from-gray-800 dark:to-gray-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">

        <div className="flex items-center gap-3">
          <a href="/profile" className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            👤
          </a>

          <div>
            <h1 className="font-semibold text-sm">
              {safeText(userData?.name) || "Digital Classroom Teacher"}
            </h1>

            <p className="text-xs opacity-75">
              {safeText(userData?.role) || "Instructor"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 hover:bg-white/20 rounded-lg"
          >
            ☰
          </button>
        </div>
      </header>

      {/* SIDEBAR */}
      <aside
        className={`fixed lg:relative top-0 left-0 h-screen lg:h-auto w-64 bg-gradient-to-b from-blue-500 to-blue-700 dark:from-gray-800 dark:to-gray-900 text-white p-5 rounded-r-3xl z-30 overflow-y-auto transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >

        {/* SIDEBAR HEADER */}
        <div className="flex items-center justify-between lg:block mb-8">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              👤
            </div>

            <div>
              <h2 className="font-semibold text-sm sm:text-base">
                {safeText(userData?.name) || "Teacher"}
              </h2>

              <p className="text-xs opacity-80">
                {safeText(userData?.role) || "Instructor"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden focus:outline-none p-1.5 hover:bg-white/20 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        {/* NAVIGATION */}
        <nav>
          <ul className="space-y-3 text-sm">

            <li>
              <NavLink
                to="/teacher"
                end
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  isActive
                    ? " p-3 rounded-lg block"
                    : "p-3 rounded-lg block hover:bg-white/20"
                }
              >
                Dashboard
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/teacher/classes"
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  isActive
                    ? "bg-white/20 p-3 rounded-lg block"
                    : "p-3 rounded-lg block hover:bg-white/20"
                }
              >
                Classes
              </NavLink>
            </li>

            {/* CLASSES */}
            <li className="space-y-1">

              <button
                onClick={() => setIsClassesOpen((prev) => !prev)}
                className="w-full flex items-center justify-between p-3 hover:bg-white/20 rounded-lg transition text-left"
              >
                <span>Classes</span>

                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {classes.length}
                </span>
              </button>

              <ul
                className={`${
                  isClassesOpen ? "block" : "hidden"
                } space-y-1 pl-3`}
              >

                {classesLoading ? (

                  <li className="p-2 text-xs opacity-70">
                    Loading classes...
                  </li>

                ) : classes.length === 0 ? (

                  <li className="p-2 text-xs opacity-70">
                    No classes yet
                  </li>

                ) : (

                  classes.map((cls) => (
                    <li key={cls.id}>

                      <NavLink
                        to={`/teacher/classes/${cls.id}`}
                        onClick={() => setIsSidebarOpen(false)}
                        className={({ isActive }) =>
                          isActive
                            ? "bg-white/20 p-2 rounded-lg block transition"
                            : "p-2 rounded-lg hover:bg-white/20 transition block"
                        }
                      >

                        {/* CLASS NAME */}
                        <div className="font-medium truncate">
                          {safeText(cls.name) || "Untitled Class"}
                        </div>

                        {/* CLASS CODE */}
                        <div className="text-[11px] opacity-70 truncate">
                          {safeText(cls.code || cls.id)}
                        </div>

                      </NavLink>
                    </li>
                  ))
                )}
              </ul>
            </li>

            {/* OTHER NAV LINKS */}
            {[
              ["Attendance", "/teacher/attendance", () => setIsSidebarOpen(false)],
              ["Assignments", "/teacher/assignments", () => setIsSidebarOpen(false)],
              ["Quizzes", "/teacher/quizzes", () => setIsSidebarOpen(false)],
              ["Schedule", "/teacher/schedule", () => setIsSidebarOpen(false)],
              ["Analytics", "/teacher/analytics", () => setIsSidebarOpen(false)],
              ["Messages", "/teacher/messages", () => setIsSidebarOpen(false)],
              ["Reports", "/teacher/reports", () => setIsSidebarOpen(false)],
              ["Settings", "/teacher/settings", () => setIsSidebarOpen(false)],
            ].map(([label, path, onClickHandler]) => (
              <li key={path}>
                <NavLink
                  to={path}
                  onClick={onClickHandler}
                  className={({ isActive }) =>
                    isActive
                      ? "bg-white/20 p-3 rounded-lg block"
                      : "p-3 rounded-lg block hover:bg-white/20"
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 border-t border-white/20 pt-4 space-y-3">
          <button
            onClick={toggleDark}
            className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2"
          >
            <span>{isDark ? '☀️' : '🌙'} Theme</span>
          </button>

          <button className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2">
            <span>🔔 Notifications</span>
          </button>

          <a
            href="/profile"
            className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2"
          >
            <span>👤 Profile</span>
          </a>
        </div>

        <button
          onClick={logout}
          className="mt-10 bg-white dark:bg-gray-700 text-blue-600 dark:text-white w-full py-3 rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-600 transition text-sm sm:text-base"
        >
          Log Out
        </button>
      </aside>

      {/* OVERLAY */}
      <div
        onClick={() => setIsSidebarOpen(false)}
        className={`${
          isSidebarOpen ? "block" : "hidden"
        } fixed inset-0 bg-black/50 z-20 lg:hidden`}
      />

      {/* MAIN */}
      <main className="flex-1 w-full overflow-y-auto pb-8">

        <div className="relative">

          {/* DESKTOP HEADER */}
          {/* HERO */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 p-4 sm:p-6 md:p-8 rounded-b-3xl">

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
              Welcome back, {safeText(userData?.name) || "Instructor"}
            </h1>
          

          </div>
        </div>

        {/* PAGE CONTENT */}
        <div className="p-4">
          <Outlet />
        </div>

      </main>
    </div>
  );
}