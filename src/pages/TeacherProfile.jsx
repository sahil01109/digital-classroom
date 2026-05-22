import React, { useEffect, useState } from 'react'
import { useUser } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc, collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

export default function TeacherProfile() {
  const { userData, refetchUserData } = useUser()
  const navigate = useNavigate()
  const [theme, setTheme] = useState('light')
  const [activeTab, setActiveTab] = useState('overview')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [currentField, setCurrentField] = useState('')
  const [editValue, setEditValue] = useState('')
  const [profileName, setProfileName] = useState('Teacher')
  const [profileRole, setProfileRole] = useState('Teacher')
  const [saveLoading, setSaveLoading] = useState(false)
  const [teacherStats, setTeacherStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    totalAssignments: 0,
    totalNotes: 0,
    totalQuizzes: 0
  })

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark')
      setTheme('dark')
    }
  }, [])

  useEffect(() => {
    if (!userData) return

    setProfileName(userData.name || 'Teacher')
    setProfileRole(userData.role || 'Teacher')
    if (userData.name) {
      setEditValue(userData.name)
    }

    const unsubscribe = onSnapshot(
      collection(db, 'classes'),
      (snapshot) => {
        const allClasses = snapshot.docs.map((doc) => doc.data())

        const myClasses = allClasses.filter((cls) => {
          const createdByMe = cls.teacherId === userData.uid
          const joinedByMe = cls.teachers?.some((teacher) => teacher?.uid === userData.uid)
          return createdByMe || joinedByMe
        })

        let totalStudents = 0
        let totalAssignments = 0
        let totalNotes = 0
        let totalQuizzes = 0

        myClasses.forEach((cls) => {
          totalStudents += cls.students || 0
          totalAssignments += cls.assignments?.length || 0
          totalNotes += cls.notes?.length || 0
          totalQuizzes += cls.quizzes?.length || 0
        })

        setTeacherStats({
          totalClasses: myClasses.length,
          totalStudents,
          totalAssignments,
          totalNotes,
          totalQuizzes,
        })
      },
      (error) => {
        console.error('Error fetching teacher stats:', error)
      }
    )

    return () => unsubscribe()
  }, [userData])

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark')
    if (document.documentElement.classList.contains('dark')) {
      setTheme('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      setTheme('light')
      localStorage.setItem('theme', 'light')
    }
  }

  const switchTab = (tab) => {
    setActiveTab(tab)
  }

  const openSettings = () => setSettingsOpen(true)
  const closeSettings = () => setSettingsOpen(false)
  const closeEdit = () => setEditOpen(false)

  const editField = (field) => {
    setCurrentField(field)
    setEditOpen(true)
    if (field === 'name') {
      setEditValue(userData?.name || profileName)
    }
  }

  const saveEdit = async () => {
    if (!userData?.uid) return
    setSaveLoading(true)

    try {
      const userRef = doc(db, 'users', userData.uid)
      const updates = {}

      if (currentField === 'name' && editValue.trim()) {
        updates.name = editValue.trim()
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(userRef, updates)
        await refetchUserData()
      }

      setEditOpen(false)
    } catch (err) {
      console.error('Profile update failed:', err)
      alert('Unable to save profile changes. Please try again.')
    } finally {
      setSaveLoading(false)
    }
  }

  const stats = [
    { title: 'Classes', value: teacherStats.totalClasses },
    { title: 'Students', value: teacherStats.totalStudents },
    { title: 'Assignments', value: teacherStats.totalAssignments },
    { title: 'Notes', value: teacherStats.totalNotes },
    { title: 'Quizzes', value: teacherStats.totalQuizzes },
  ]

  return (
    <>
      <section>
        <div className="relative h-72 md:h-80 bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-6 md:px-10 md:py-8 rounded-b-[40px] overflow-hidden dark:from-gray-800 dark:to-gray-900">
          <button
            onClick={() => navigate('/teacher')}
            className="absolute top-4 left-4 text-sm text-white/90 hover:text-white flex items-center gap-2"
          >
            <span>←</span>
            Back to Dashboard
          </button>
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <button
              onClick={toggleDark}
              className="bg-white/20 hover:bg-white/30 backdrop-blur p-3 rounded-full text-white transition"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              onClick={openSettings}
              className="bg-white/20 hover:bg-white/30 backdrop-blur p-3 rounded-full text-white transition"
              aria-label="Open settings"
            >
              ⚙️
            </button>
          </div>

          <div className="h-full flex items-center gap-6">
            <div className="w-28 h-28 rounded-full border-4 border-white shadow-2xl bg-white/20 text-4xl text-white flex items-center justify-center">
              👨‍🏫
            </div>

            <div className="text-white">
              <h2 className="text-3xl md:text-4xl font-bold">{profileName}</h2>
              <p className="text-sm md:text-base opacity-90 mt-2">{profileRole}</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-2 text-xs md:text-sm">
                <span className="block h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                <span>Online</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {stats.map((stat, idx) => (
              <div key={idx} className="glass p-4 rounded-xl text-center">
                <h3 className="text-xl font-bold">{stat.value}</h3>
                <p className="text-xs">{stat.title}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-6 border-b pb-2 text-sm overflow-hidden">
            {['overview', 'classes', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`tabBtn pb-1 ${
                  activeTab === tab ? 'text-blue-500 border-b-2 border-blue-500' : ''
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="tabContent space-y-4">
              <div className="glass p-4 rounded-xl">
                <h3 className="font-semibold">Teaching Overview</h3>
                <p className="text-sm">Managing {teacherStats.totalClasses} classes with {teacherStats.totalStudents} students</p>
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="tabContent space-y-4">
              <div className="glass p-4 rounded-xl">
                <p>📚 Class Management</p>
                <p className="text-sm mt-2">View and manage your classes, assignments, and student progress</p>
                <button className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-xl">Manage Classes</button>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="tabContent space-y-4">
              <div className="glass p-4 rounded-xl">
                <p>📊 Performance Analytics</p>
                <p className="text-sm mt-2">Track student engagement and learning outcomes</p>
                <button className="mt-2 bg-purple-500 text-white px-4 py-2 rounded-xl">View Analytics</button>
              </div>
            </div>
          )}
        </div>

        {settingsOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-96 space-y-4">
              <h2 className="text-lg font-bold dark:text-white">Edit Profile</h2>

              <button onClick={() => editField('name')} className=" dark:text-white w-full p-3 border rounded-xl text-left">
                Change Name
              </button>

              <button onClick={closeSettings} className="w-full bg-red-500 text-white p-2 rounded-xl">
                Close
              </button>
            </div>
          </div>
        )}

        {editOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-80 space-y-4">
              <h3 className="font-bold">Edit {currentField}</h3>

              <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white"
              />

              <button onClick={saveEdit} className="bg-blue-500 text-white w-full p-2 rounded-xl">
                {saveLoading ? 'Saving...' : 'Save'}
              </button>
              <button onClick={closeEdit} className="bg-gray-500 text-white w-full p-2 rounded-xl">
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  )
}