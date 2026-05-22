import { Navigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

function ProtectedRoute({ children }) {
  const { user, loading } = useUser();

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

export default ProtectedRoute;