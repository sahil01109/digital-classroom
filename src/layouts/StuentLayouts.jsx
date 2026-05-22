import React, { useEffect, useState } from 'react'
import { useUser } from "../context/UserContext";
import { NavLink, Outlet , Link} from "react-router-dom";
import useClass from "../hooks/useClass";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function StudentLayout() {
    const { userData, loading, logout } = useUser();
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [toast, setToast] = useState({ visible: false, message: '' })
    const [theme, setTheme] = useState('light')
    const { classId } = useClass();
    const [notifications, setNotifications] = useState([])
    const [showNotifications, setShowNotifications] = useState(false)
    const [lastNotificationId, setLastNotificationId] = useState(null)

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme')
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark')
            setTheme('dark')
        }
    }, [])

    useEffect(() => {
        if (!classId) return

        const notificationsQuery = query(
            collection(db, 'notifications'),
            where('classCode', '==', classId)
        )

        const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
            const items = snapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => {
                    const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()
                    const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()
                    return bTime - aTime
                })

            setNotifications(items)

            if (items.length > 0 && items[0].id !== lastNotificationId) {
                if (lastNotificationId !== null) {
                    const newest = items[0]
                    showToast(newest.message || newest.title)
                    if (window.Notification && Notification.permission === 'granted') {
                        new Notification(newest.title, { body: newest.message })
                    }
                }
                setLastNotificationId(items[0].id)
            }
        })

        return () => unsubscribe()
    }, [classId, lastNotificationId])

    useEffect(() => {
        if (window.Notification && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {})
        }
    }, [])

    const toggleSidebar = () => {
        setSidebarOpen((open) => !open)
    }

    const showToast = (msg) => {
        setToast({ visible: true, message: msg })
        window.setTimeout(() => setToast({ visible: false, message: '' }), 2000)
    }

    const toggleDark = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark'
        setTheme(nextTheme)
        document.documentElement.classList.toggle('dark')
        localStorage.setItem('theme', nextTheme)
    }

    return (
        <>
            <div
                className={`fixed top-5 right-5 px-4 py-2 rounded-lg shadow-lg z-50 bg-black text-white dark:bg-white dark:text-black transition-opacity ${toast.visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
            >
                {toast.message}
            </div>

            <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 dark:text-white transition duration-300">
                <div
                    id="sidebarOverlay"
                    className={`${sidebarOpen ? 'block' : 'hidden'} fixed inset-0 bg-black/50 md:hidden z-30`}
                    onClick={toggleSidebar}
                ></div>

                <div
                    id="sidebar"
                    className={`w-64 bg-gradient-to-b from-blue-500 to-blue-700 dark:from-gray-800 dark:to-gray-900 text-white p-5 rounded-r-3xl fixed md:static transform transition-transform duration-300 h-screen md:h-auto z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                        }`}
                >
                    <div className="flex items-center gap-3 mb-8">
                        <Link to="/profile" className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            👤
                        </Link>
                        <div>
                            <h2 className="font-semibold">{userData?.name || 'User'}</h2>
                            <p className="text-sm opacity-80">{userData?.role || 'Not assigned'}</p>
                        </div>
                    </div>

                    <ul className="space-y-3 text-sm">
                        <li>
                            <NavLink
                                to="/student"
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    isActive
                                        ? 'block p-2 rounded '
                                        : 'block p-2 rounded hover:bg-white/20'
                                }
                            >
                                Dashboard
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/student/subjects"
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    isActive
                                        ? 'block p-2 rounded bg-white/20'
                                        : 'block p-2 rounded hover:bg-white/20'
                                }
                            >
                                Subjects
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/student/homework"
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    isActive
                                        ? 'block p-2 rounded bg-white/20'
                                        : 'block p-2 rounded hover:bg-white/20'
                                }
                            >
                                Homework
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/student/quizzes"
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    isActive
                                        ? 'block p-2 rounded bg-white/20'
                                        : 'block p-2 rounded hover:bg-white/20'
                                }
                            >
                                Quizzes
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/student/notes"
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    isActive
                                        ? 'block p-2 rounded bg-white/20'
                                        : 'block p-2 rounded hover:bg-white/20'
                                }
                            >
                                Notes
                            </NavLink>
                        </li>
                    </ul>

                    <div className="mt-8 border-t border-white/20 pt-4 space-y-3">
                        <button
                            onClick={toggleDark}
                            className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2"
                        >
                            <span>{theme === 'dark' ? '☀️' : '🌙'} Theme</span>
                        </button>

                    

                        
                    </div>

                    <button
                        onClick={logout}
                        className="mt-10 bg-white dark:bg-gray-700 text-blue-600 dark:text-white w-full py-2 rounded-xl"
                    >
                        Log Out
                    </button>
                </div>

                <div className="flex-1 p-4 md:p-6">
                    <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                        <button onClick={toggleSidebar} className="md:hidden text-2xl">
                            ☰
                        </button>

                        <h1 className="text-lg md:text-2xl font-bold flex-1">Welcome,{userData?.name || 'Student'}</h1>
                    </div>

                    

                    <div>
                        <Outlet />
                    </div>
                </div>
            </div>
           
        </>
    )
}
