import React, { useEffect, useState } from 'react'
import { useUser } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

export default function Profile() {
  const { userData, refetchUserData, requestTeacherAccess, isTeacherRequestPending, canRequestTeacherAccess } = useUser()
  const navigate = useNavigate()
  const [theme, setTheme] = useState('light')
  const [activeTab, setActiveTab] = useState('overview')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [currentField, setCurrentField] = useState('')
  const [editValue, setEditValue] = useState('')
  const [profileName, setProfileName] = useState('Student')
  const [profileClass, setProfileClass] = useState('Student • Class')
  const [saveLoading, setSaveLoading] = useState(false)
  const [requestingTeacherAccess, setRequestingTeacherAccess] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark')
      setTheme('dark')
    }
  }, [])

  useEffect(() => {
    if (!userData) return

    setProfileName(userData.name || 'Student')
    const classLabel = userData.classId ? `Class ${userData.classId}` : 'No class yet'
    setProfileClass(userData.role === 'student' ? `Student • ${classLabel}` : `${userData.role || 'Teacher'}`)
    if (userData.name) {
      setEditValue(userData.name)
    }
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
    } else if (field === 'class') {
      setEditValue(userData?.classId || '')
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

      if (currentField === 'class') {
        updates.classId = editValue.trim()
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

  const handleRequestTeacherAccess = async () => {
    setRequestingTeacherAccess(true)
    try {
      const success = await requestTeacherAccess()
      if (success) {
        alert('Teacher access request submitted! An admin will review your request.')
        closeSettings()
      } else {
        alert('Failed to submit teacher access request. Please try again.')
      }
    } catch (err) {
      console.error('Error requesting teacher access:', err)
      alert('An error occurred. Please try again.')
    } finally {
      setRequestingTeacherAccess(false)
    }
  }

  const stats = userData?.role === 'teacher'
    ? [
        { title: 'Classes', value: userData?.classes?.length || 0 },
        { title: 'Students', value: userData?.students?.length || 0 },
        { title: 'Assignments', value: userData?.assignments?.length || 0 },
        { title: 'Notes', value: userData?.notes?.length || 0 },
        { title: 'Rating', value: userData?.rating || 4.5, prefix: '⭐' },
      ]
    : [
        { title: 'Subjects', value: userData?.subjects?.length || 0 },
        { title: 'Assignments', value: userData?.assignments?.length || 0 },
        { title: 'Quiz Score', value: userData?.quizScore ? `${userData.quizScore}%` : '0%' },
        { title: 'Notes', value: userData?.notes?.length || 0 },
        { title: 'Rating', value: userData?.rating || 4.5, prefix: '⭐' },
      ]

  return (
    <>
      <section>
        <div className="relative h-72 md:h-80 bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-6 md:px-10 md:py-8 rounded-b-[40px] overflow-hidden dark:from-gray-800 dark:to-gray-900">
          <button
            onClick={() => navigate(userData?.role === 'teacher' ? '/teacher' : '/student')}
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
              👤
            </div>

            <div className="text-white">
              <h2 className="text-3xl md:text-4xl font-bold">{profileName}</h2>
              <p className="text-sm md:text-base opacity-90 mt-2">{profileClass}</p>
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
                <h3 className="text-xl font-bold">
                  {stat.prefix ? `${stat.prefix} ${stat.value}` : stat.value}
                </h3>
                <p className="text-xs">{stat.title}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-6 border-b pb-2 text-sm overflow-hidden">
            {['overview', 'notes', 'quiz', 'activity'].map((tab) => (
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
                <h3 className="font-semibold">Recent Activity</h3>
                <p className="text-sm">Viewed notes, submitted homework, attempted quiz</p>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="tabContent space-y-4">
              <div className="glass p-4 rounded-xl">
                <p>📄 Algebra Notes (120 views)</p>
                <button className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-xl">Upload</button>
              </div>
            </div>
          )}

         
          {activeTab === 'quiz' && (
            <div className="tabContent space-y-4">
              <div className="glass p-4 rounded-xl">
                <p>Quiz Score: 88%</p>
                <button className="mt-2 bg-indigo-500 text-white px-4 py-2 rounded-xl">Start Quiz</button>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="tabContent space-y-4">
              <div className="glass p-4 rounded-xl">
                <p>🕒 Logged in</p>
                <p>📚 Viewed notes</p>
                <p>📝 Submitted homework</p>
              </div>
            </div>
          )}

        
        </div>

        {settingsOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-96 space-y-4 max-h-96 overflow-y-auto">
              <h2 className="text-lg font-bold dark:text-white">Settings & Profile</h2>

              <button onClick={() => editField('name')} className="dark:text-white w-full p-3 border rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                Change Name
              </button>
              <button onClick={() => editField('class')} className="dark:text-white w-full p-3 border rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                Change Class
              </button>

              {/* Teacher Access Request Section */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-3 dark:text-white">Teacher Access</h3>
                
                {isTeacherRequestPending ? (
                  <div className="w-full p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-xl text-sm">
                    ⏳ Your teacher request is pending admin approval. You will be notified once reviewed.
                  </div>
                ) : canRequestTeacherAccess ? (
                  <button 
                    onClick={handleRequestTeacherAccess}
                    disabled={requestingTeacherAccess}
                    className="w-full p-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl font-medium transition"
                  >
                    {requestingTeacherAccess ? 'Submitting...' : 'Request Teacher Access'}
                  </button>
                ) : userData?.role === 'teacher' ? (
                  <div className="w-full p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-xl text-sm">
                    ✅ You are an approved teacher!
                  </div>
                ) : null}
              </div>

              <button onClick={closeSettings} className="w-full bg-red-500 hover:bg-red-600 text-white p-2 rounded-xl transition">
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
