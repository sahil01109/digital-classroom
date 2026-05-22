import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../firebase";
import useClass from "../../../hooks/useClass";
import JoinClassPrompt from "../../../components/JoinClassPrompt";

export default function Notes() {
  const { classId, loading, subjects = [] } = useClass();

  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [loadingNotes, setLoadingNotes] = useState(false);

  const loadNotes = async () => {
    if (!classId) return;

    try {
      setLoadingNotes(true);

      const notesRef = collection(db, "notes");
      const q = query(notesRef, where("classCode", "==", classId));
      const snapshot = await getDocs(q);

      const loadedNotes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const sortedNotes = loadedNotes.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || 0;
        const dateB = b.createdAt?.toDate?.() || 0;
        return new Date(dateB) - new Date(dateA);
      });

      setNotes(sortedNotes);
      setSelectedSubject("");
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [classId]);

  useEffect(() => {
    if (selectedSubject) {
      setFilteredNotes(notes.filter((note) => note.subject === selectedSubject));
    } else {
      setFilteredNotes(notes);
    }
  }, [selectedSubject, notes]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!classId) {
    return <JoinClassPrompt />;
  }

  const stats = [
    {
      title: "Total Notes",
      value: notes.length,
      color: "bg-blue-500",
    },
    {
      title: "Subjects",
      value: subjects.length,
      color: "bg-green-500",
    },
    {
      title: "Latest",
      value: notes.length > 0 ? "Updated" : "No notes",
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Class Notes</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Access study materials shared by your teachers
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((item, index) => (
          <div
            key={index}
            className={`p-4 rounded-2xl text-white shadow ${item.color}`}
          >
            <h2 className="text-xl font-bold">{item.value}</h2>
            <p className="text-sm">{item.title}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Filter by Subject
        </h3>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedSubject("")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedSubject === ""
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow hover:bg-blue-500 hover:text-white"
            }`}
          >
            All Notes
          </button>

          {subjects.map((subject) => {
            const subjectName = subject.name || subject;

            return (
              <button
                key={subjectName}
                onClick={() => setSelectedSubject(subjectName)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedSubject === subjectName
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow hover:bg-blue-500 hover:text-white"
                }`}
              >
                {subjectName}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold text-lg text-gray-900 dark:text-white">
          {selectedSubject ? `${selectedSubject} Notes` : "All Class Notes"}
        </h2>

        {loadingNotes ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            Loading notes...
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm text-center border border-gray-100 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400">
              {selectedSubject
                ? `No notes available for ${selectedSubject}`
                : "No notes available yet"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white line-clamp-2">
                    {note.title}
                  </h3>

                  <span className="text-2xl flex-shrink-0">
                    {note.type === "PDF"
                      ? "📄"
                      : note.type === "Image"
                      ? "🖼️"
                      : note.type === "Video"
                      ? "🎥"
                      : "📝"}
                  </span>
                </div>

                <div className="flex gap-2 mb-3 flex-wrap">
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                    {note.subject}
                  </span>

                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-200">
                    {note.type}
                  </span>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                  {note.content}
                </p>

                {(note.attachmentUrl || note.attachmentLink) && (
                  <div className="mb-3 space-y-2 text-sm">
                    {note.attachmentUrl && (
                      <a
                        href={note.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-blue-600 dark:text-blue-300 hover:underline"
                      >
                        Open {note.attachmentName || note.type.toLowerCase()} attachment
                      </a>
                    )}
                    {note.attachmentLink && (
                      <a
                        href={note.attachmentLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-blue-600 dark:text-blue-300 hover:underline"
                      >
                        Open resource link
                      </a>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {note.createdAt?.toDate
                    ? note.createdAt.toDate().toLocaleDateString()
                    : "Recently shared"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}