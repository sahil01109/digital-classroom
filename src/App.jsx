import Home from "./pages/Home";
import { useUser } from "./context/UserContext";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import SelectRole from "./pages/SelectRole";
import AdminTeacherApproval from "./pages/AdminTeacherApproval";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Protected routes
import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";

// STUDENT
import StudentLayout from "./layouts/StuentLayouts";
import StudentDashboard from "./pages/dashboard/student/DashboardHome";
import Subjects from "./pages/dashboard/student/Subjects";
import SubjectDetail from "./pages/dashboard/student/subjectDetail";
import Homework from "./pages/dashboard/student/Homework";
import Notes from "./pages/dashboard/student/Notes";
import Quizzes from "./pages/dashboard/student/Quizzes";

// TEACHER
import TeacherLayout from "./layouts/TeacherLayouts";
import Dashboard from "./pages/dashboard/teacher/dashboard";
import Classes from "./pages/dashboard/teacher/Classes";
import Assignments from "./pages/dashboard/teacher/Assignments";
import GradeAssignments from "./pages/dashboard/teacher/GradeAssignments";
import TeacherNotes from "./pages/dashboard/teacher/notes";
import QuizBuilder from "./pages/dashboard/teacher/QuizBuilder";
import Reports from "./pages/dashboard/teacher/Reports";
import Messages from "./pages/dashboard/teacher/Messages";
import Settings from "./pages/dashboard/teacher/Settings";
import Analytics from "./pages/dashboard/teacher/Analytics";
import Attendance from "./pages/dashboard/teacher/Attendance";
import Schedule from "./pages/dashboard/teacher/Schedule";
import TeacherClassDetails from "./pages/dashboard/teacher/TeacherClassDetailsNew";
import TeacherProfile from "./pages/TeacherProfile";

// Profile Router Component
function ProfileRouter() {
  const { userData } = useUser();
  return userData?.role === 'teacher' ? <TeacherProfile /> : <Profile />;
}


function App() {
  const router = createBrowserRouter([
    // PUBLIC ROUTES
    {
      path: "/",
      element: <Home />,
    },
    {
      path: "/auth",
      element: <Auth />,
    },

    // ROLE SELECTION
    {
      path: "/select-role",
      element: (
        <ProtectedRoute>
          <SelectRole />
        </ProtectedRoute>
      ),
    },

    // REDIRECTS (important)
    {
      path: "/student-dashboard",
      element: (
        <RoleProtectedRoute role="student">
          <Navigate to="/student" replace />
        </RoleProtectedRoute>
      ),
    },
    {
      path: "/teacher-dashboard",
      element: (
        <RoleProtectedRoute role="teacher">
          <Navigate to="/teacher" replace />
        </RoleProtectedRoute>
      ),
    },

    // ================= STUDENT =================
    {
      path: "/student",
      element: (
        <RoleProtectedRoute role="student">
          <StudentLayout />
        </RoleProtectedRoute>
      ),
      children: [
        { index: true, element: <StudentDashboard /> },
        {
          path: "subjects",
          children: [
            { index: true, element: <Subjects /> },
            { path: ":subjectId", element: <SubjectDetail /> },
          ],
        },
        { path: "homework", element: <Homework /> },
        { path: "notes", element: <Notes /> },
        { path: "quizzes", element: <Quizzes /> },
      ],
    },

    // ================= TEACHER =================
    {
      path: "/teacher",
      element: (
        <RoleProtectedRoute role="teacher">
          <TeacherLayout />
        </RoleProtectedRoute>
      ),
      children: [
        { index: true, element: <Dashboard /> },
        {
          path: "classes",
          children: [
            { index: true, element: <Classes /> },
            { path: ":classId", element: <TeacherClassDetails /> },
          ],
        },
        { path: "assignments", element: <Assignments /> },
        { path: "notes", element: <TeacherNotes /> },
        { path: "quizzes", element: <QuizBuilder /> },
        { path: "grade-assignments", element: <GradeAssignments /> },
        { path: "reports", element: <Reports /> },
        { path: "messages", element: <Messages /> },
        { path: "settings", element: <Settings /> },
        { path: "analytics", element: <Analytics /> },
        { path: "attendance", element: <Attendance /> },
        { path: "schedule", element: <Schedule /> },
      ],
    },

    // PROFILE
    {
      path: "/profile",
      element: (
        <ProtectedRoute>
          <ProfileRouter />
        </ProtectedRoute>
      ),
    },
    {
      path: "/admin/teacher-approval",
      element: (
        <ProtectedRoute>
          <AdminTeacherApproval />
        </ProtectedRoute>
      ),
    },

    // 404
    {
      path: "*",
      element: <h1 className="text-center mt-10 text-2xl">404 - Page Not Found</h1>,
    },
  ]);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#0f172a",
            color: "#f8fafc",
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.5)",
          },
        }}
      />
    </>
  );
}

export default App;