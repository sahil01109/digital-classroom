import { useState } from "react";

export default function Messages() {
  const [messages] = useState([
    { name: "Rahul", msg: "Sir, doubt in math question 5" },
    { name: "Priya", msg: "Assignment submission done" },
    { name: "Amit", msg: "Can you explain topic again?" },
  ]);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Student Messages</h2>

      <div className="space-y-4">
        {messages.map((m, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
            <h3 className="font-semibold">{m.name}</h3>
            <p className="text-gray-600 dark:text-gray-300">{m.msg}</p>

            <button className="mt-2 text-sm text-blue-500 hover:underline">
              Reply
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}