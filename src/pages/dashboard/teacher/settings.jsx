import { useState } from "react";

export default function Settings() {
  const [profile, setProfile] = useState({
    name: "Teacher Name",
    email: "teacher@gmail.com",
  });

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    alert("Settings saved!");
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Settings</h2>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow space-y-4">

        <div>
          <label className="text-sm">Name</label>
          <input
            name="name"
            value={profile.name}
            onChange={handleChange}
            className="w-full p-2 border rounded mt-1"
          />
        </div>

        <div>
          <label className="text-sm">Email</label>
          <input
            name="email"
            value={profile.email}
            onChange={handleChange}
            className="w-full p-2 border rounded mt-1"
          />
        </div>

        <button
          onClick={handleSave}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}