import { Navigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

function RoleProtectedRoute({ children, role }) {
  const { user, userData, loading } = useUser();

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  if (!user) return <Navigate to="/auth" />;

  // Check role
  if (userData?.role !== role) {
    return <Navigate to="/" />; // wrong role → home
  }

  // For teacher role, also check if approved
  if (role === "teacher") {
    const isApprovedTeacher =
      userData?.role === "teacher" &&
      userData?.teacherStatus === "approved";

    if (!isApprovedTeacher) {
      return <Navigate to="/" />; // not approved → home
    }
  }

  return children;
}

export default RoleProtectedRoute;