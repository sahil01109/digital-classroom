import { useNavigate } from "react-router-dom";

export default function JoinClassPrompt() {
  const navigate = useNavigate();

  return (
    <div className="text-center p-10">
      <h2 className="text-xl font-semibold">
        You are not enrolled in any class
      </h2>
      <p className="text-gray-500 mt-2 mb-4">
        Join a class to access all features
      </p>

      <button
        onClick={() => navigate("/student/subjects")}
        className="bg-blue-500 text-white px-6 py-2 rounded-lg"
      >
        Join Class
      </button>
    </div>
  );
}