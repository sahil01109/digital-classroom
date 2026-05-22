import React, { useState } from "react";

export default function Schedule() {
  const [schedule, setSchedule] = useState([
    { id: 1, subject: "Mathematics", className: "CSE 1", time: "09:00 AM", day: "Monday" },
    { id: 2, subject: "Physics", className: "CSE 3", time: "11:00 AM", day: "Monday" },
    { id: 3, subject: "Chemistry", className: "CSE 5", time: "02:00 PM", day: "Tuesday" },
  ]);

  const [form, setForm] = useState({
    subject: "",
    className: "",
    time: "",
    day: "Monday",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addSchedule = () => {
    if (!form.subject || !form.className || !form.time) return;

    setSchedule([
      ...schedule,
      { id: Date.now(), ...form },
    ]);

    setForm({
      subject: "",
      className: "",
      time: "",
      day: "Monday",
    });
  };

  const deleteItem = (id) => {
    setSchedule(schedule.filter((item) => item.id !== id));
  };

  return (
    <div className="p-4 md:p-6">

      {/* Heading */}
      <h2 className="text-2xl font-bold mb-6">Class Schedule</h2>

      {/* Add Schedule Form */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow mb-6">
        <h3 className="font-semibold mb-4">Add New Schedule</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            name="subject"
            placeholder="Subject"
            value={form.subject}
            onChange={handleChange}
            className="p-2 border rounded dark:bg-gray-700"
          />

          <input
            type="text"
            name="className"
            placeholder="Class (e.g. CSE 1)"
            value={form.className}
            onChange={handleChange}
            className="p-2 border rounded dark:bg-gray-700"
          />

          <input
            type="time"
            name="time"
            value={form.time}
            onChange={handleChange}
            className="p-2 border rounded dark:bg-gray-700"
          />

          <select
            name="day"
            value={form.day}
            onChange={handleChange}
            className="p-2 border rounded dark:bg-gray-700"
          >
            <option>Monday</option>
            <option>Tuesday</option>
            <option>Wednesday</option>
            <option>Thursday</option>
            <option>Friday</option>
          </select>
        </div>

        <button
          onClick={addSchedule}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:scale-105 transition"
        >
          Add Schedule
        </button>
      </div>

      {/* Schedule Table */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow">
        <h3 className="font-semibold mb-4">Weekly Schedule</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b">
                <th className="p-2">Day</th>
                <th className="p-2">Subject</th>
                <th className="p-2">Class</th>
                <th className="p-2">Time</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>

            <tbody>
              {schedule.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="p-2">{item.day}</td>
                  <td className="p-2">{item.subject}</td>
                  <td className="p-2">{item.className}</td>
                  <td className="p-2">{item.time}</td>
                  <td className="p-2">
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {schedule.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center p-4 text-gray-400">
                    No schedule added
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}