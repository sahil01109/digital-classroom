import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { db, storage } from "../../../firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useUser } from "../../../context/UserContext";

export default function Notes() {
  const { user } = useUser();
  const [notes, setNotes] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const [newNote, setNewNote] = useState({
    title: "",
    content: "",
    classCode: "",
    subject: "",
    type: "Text", // Text, PDF, Image, Video
    link: "",
  });
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load teacher's classes on mount
  useEffect(() => {
    if (!user) return;
    loadTeacherClasses();
  }, [user]);

  // Load notes when classes are loaded
  useEffect(() => {
    if (teacherClasses.length > 0) {
      loadNotes();
    }
  }, [teacherClasses]);

  const loadTeacherClasses = async () => {
    try {
      setLoading(true);
      const classesRef = collection(db, "classes");
      const snapshot = await getDocs(classesRef);
      const allClasses = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter classes where the user is a teacher
      const myClasses = allClasses.filter((cls) =>
        cls.teachers?.some((teacher) => teacher.uid === user.uid)
      );

      setTeacherClasses(myClasses);
    } catch (err) {
      console.error("Failed to load classes:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      const notesRef = collection(db, "notes");
      const q = query(
        notesRef,
        where("teacherId", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const loadedNotes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotes(loadedNotes.sort((a, b) => new Date(b.createdAt?.toDate?.() || 0) - new Date(a.createdAt?.toDate?.() || 0)));
    } catch (err) {
      console.error("Failed to load notes:", err);
    }
  };

  const uploadFile = async (file, path) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        },
        (error) => reject(error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();

    if (!newNote.title.trim()) {
      alert("Please enter a note title");
      return;
    }

    if (!newNote.classCode) {
      alert("Please select a class");
      return;
    }

    if (!newNote.subject) {
      alert("Please select a subject");
      return;
    }

    if (!newNote.content.trim() && !attachmentFile) {
      alert("Please add note content or upload a file.");
      return;
    }

    setCreating(true);

    try {
      let attachmentUrl = "";
      let attachmentName = "";

      if (attachmentFile) {
        attachmentName = attachmentFile.name;
        attachmentUrl = await uploadFile(
          attachmentFile,
          `notes/${user.uid}/${Date.now()}_${attachmentFile.name}`
        );
      }

      await addDoc(collection(db, "notes"), {
        title: newNote.title,
        content: newNote.content,
        classCode: newNote.classCode,
        subject: newNote.subject,
        type: newNote.type,
        teacherId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        attachmentUrl,
        attachmentName,
        attachmentLink: newNote.link,
      });

      await addDoc(collection(db, "notifications"), {
        classCode: newNote.classCode,
        title: "New Class Note",
        message: `${newNote.title} has been shared for ${newNote.subject}.`,
        type: "note",
        createdAt: serverTimestamp(),
      });

      setNewNote({
        title: "",
        content: "",
        classCode: "",
        subject: "",
        type: "Text",
      });
      setAttachmentFile(null);
      setUploadProgress(0);

      await loadNotes();
      alert("Note created successfully!");
    } catch (err) {
      console.error("Failed to create note:", err);
      alert("Failed to create note");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;

    try {
      await deleteDoc(doc(db, "notes", noteId));
      await loadNotes();
      alert("Note deleted successfully!");
    } catch (err) {
      console.error("Failed to delete note:", err);
      alert("Failed to delete note");
    }
  };

  const getClassDetails = (classCode) => {
    return teacherClasses.find((cls) => cls.id === classCode);
  };

  const getSubjectsForClass = (classCode) => {
    const classData = getClassDetails(classCode);
    if (!classData) return [];
    
    const currentTeacher = classData.teachers?.find((t) => t.uid === user.uid);
    return currentTeacher?.subjects || [];
  };

  if (loading) {
    return <div className="p-6 text-center">Loading your classes...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Class Notes</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Create and share notes with your students
        </p>
      </div>

      {/* Create Note Form */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="text-xl font-semibold mb-4">Create New Note</h2>

        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Class
              </label>
              <select
                value={newNote.classCode}
                onChange={(e) => {
                  setNewNote({ ...newNote, classCode: e.target.value, subject: "" });
                  setSelectedClass(e.target.value);
                }}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Class --</option>
                {teacherClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Subject
              </label>
              <select
                value={newNote.subject}
                onChange={(e) => {
                  setNewNote({ ...newNote, subject: e.target.value });
                  setSelectedSubject(e.target.value);
                }}
                disabled={!selectedClass}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="">-- Select Subject --</option>
                {getSubjectsForClass(selectedClass).map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Note Title
            </label>
            <input
              type="text"
              placeholder="e.g., Introduction to Algebra"
              value={newNote.title}
              onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Note Content
            </label>
            <textarea
              placeholder="Write your note here... You can include formulas, examples, and detailed explanations."
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              rows="6"
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Attachment (Optional)
            </label>
            <input
              type="file"
              onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900 dark:file:text-blue-100"
            />
            {attachmentFile && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Selected: {attachmentFile.name} {uploadProgress > 0 && `(${uploadProgress}% uploaded)`}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Resource Link (Optional)
            </label>
            <input
              type="url"
              placeholder="https://example.com/reference"
              value={newNote.link}
              onChange={(e) => setNewNote({ ...newNote, link: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Note Type
            </label>
            <select
              value={newNote.type}
              onChange={(e) => setNewNote({ ...newNote, type: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Text">Text</option>
              <option value="PDF">PDF</option>
              <option value="Image">Image</option>
              <option value="Video">Video</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-medium transition"
          >
            {creating ? "Creating..." : "Create Note"}
          </button>
        </form>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Notes</h2>

        {notes.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm text-center border border-gray-100 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400">No notes created yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((note) => {
              const classData = getClassDetails(note.classCode);

              return (
                <div
                  key={note.id}
                  className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col"
                >
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white line-clamp-2">
                      {note.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {classData?.name || note.classCode}
                    </p>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200"
                    >
                      {note.subject}
                    </span>
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-200"
                    >
                      {note.type}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 flex-grow line-clamp-3">
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

                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                    Created: {note.createdAt?.toDate ? new Date(note.createdAt.toDate()).toLocaleDateString() : "Recently"}
                  </p>

                  <button
                    onClick={() => handleDelete(note.id)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
