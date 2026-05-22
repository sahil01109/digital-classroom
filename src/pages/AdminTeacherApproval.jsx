import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function AdminTeacherApproval() {
  const { userData, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedTeachers, setApprovedTeachers] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    // Check if user is admin
    if (!userLoading && userData?.role !== 'admin') {
      navigate('/');
      return;
    }

    loadTeacherRequests();
  }, [userData, userLoading, navigate]);

  const loadTeacherRequests = async () => {
    try {
      setLoading(true);
      
      // Get all users
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);

      const pending = [];
      const approved = [];
      const rejected = [];

      usersSnapshot.forEach(doc => {
        const user = doc.data();
        
        if (user.teacherStatus === 'pending') {
          pending.push({ uid: doc.id, ...user });
        } else if (user.teacherStatus === 'approved' && user.role === 'teacher') {
          approved.push({ uid: doc.id, ...user });
        } else if (user.teacherStatus === 'rejected') {
          rejected.push({ uid: doc.id, ...user });
        }
      });

      setPendingRequests(pending);
      setApprovedTeachers(approved);
      setRejectedRequests(rejected);
    } catch (error) {
      console.error('Error loading teacher requests:', error);
      alert('Failed to load teacher requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTeacher = async (userId) => {
    setActionLoading(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: 'teacher',
        teacherStatus: 'approved',
      });

      // Reload requests
      await loadTeacherRequests();
      alert('Teacher approved successfully!');
    } catch (error) {
      console.error('Error approving teacher:', error);
      alert('Failed to approve teacher');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectTeacher = async (userId) => {
    setActionLoading(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: 'student',
        teacherStatus: 'rejected',
      });

      // Reload requests
      await loadTeacherRequests();
      alert('Teacher request rejected');
    } catch (error) {
      console.error('Error rejecting teacher:', error);
      alert('Failed to reject teacher');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReverseApproval = async (userId) => {
    setActionLoading(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: 'student',
        teacherStatus: 'none',
      });

      // Reload requests
      await loadTeacherRequests();
      alert('Teacher approval reversed');
    } catch (error) {
      console.error('Error reversing approval:', error);
      alert('Failed to reverse approval');
    } finally {
      setActionLoading(null);
    }
  };
const handleLogout = async () => {
  try {
    await signOut(auth);
    navigate("/login");
  } catch (error) {
    console.error("Logout failed:", error);
    alert("Failed to logout");
  }
};
  if (userLoading || loading) {
    return (
      <div className="p-6 text-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (userData?.role !== 'admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">You do not have permission to view this page.</p>
      </div>
    );
  }

  const renderUserCard = (user, actions) => (
    <div key={user.uid} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{user.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Requested: {user.createdAt?.toDate?.().toLocaleDateString?.() || new Date(user.createdAt?.seconds * 1000).toLocaleDateString?.()}
          </p>
        </div>
        <div className="flex gap-2">
          {actions}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
     <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
  <div>
    <h1 className="text-4xl font-bold">Teacher Approval Management</h1>

    <p className="text-gray-600 dark:text-gray-400 mt-2">
      Review and manage teacher access requests
    </p>
  </div>

  <button
    onClick={handleLogout}
    className="bg-red-500 hover:bg-red-600 text-white px-5 py-3 rounded-xl font-medium transition"
  >
    Logout
  </button>
</div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'pending', label: `Pending Requests (${pendingRequests.length})` },
          { id: 'approved', label: `Approved Teachers (${approvedTeachers.length})` },
          { id: 'rejected', label: `Rejected Requests (${rejectedRequests.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium transition ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pending Requests */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No pending teacher requests
            </div>
          ) : (
            pendingRequests.map(user =>
              renderUserCard(user, (
                <>
                  <button
                    onClick={() => handleApproveTeacher(user.uid)}
                    disabled={actionLoading === user.uid}
                    className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-2 rounded text-sm font-medium transition"
                  >
                    {actionLoading === user.uid ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleRejectTeacher(user.uid)}
                    disabled={actionLoading === user.uid}
                    className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-3 py-2 rounded text-sm font-medium transition"
                  >
                    {actionLoading === user.uid ? 'Processing...' : 'Reject'}
                  </button>
                </>
              ))
            )
          )}
        </div>
      )}

      {/* Approved Teachers */}
      {activeTab === 'approved' && (
        <div className="space-y-4">
          {approvedTeachers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No approved teachers yet
            </div>
          ) : (
            approvedTeachers.map(user =>
              renderUserCard(user, (
                <button
                  onClick={() => handleReverseApproval(user.uid)}
                  disabled={actionLoading === user.uid}
                  className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white px-3 py-2 rounded text-sm font-medium transition"
                >
                  {actionLoading === user.uid ? 'Processing...' : 'Revoke'}
                </button>
              ))
            )
          )}
        </div>
      )}

      {/* Rejected Requests */}
      {activeTab === 'rejected' && (
        <div className="space-y-4">
          {rejectedRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No rejected requests
            </div>
          ) : (
            rejectedRequests.map(user =>
              renderUserCard(user, (
                <button
                  onClick={() => handleApproveTeacher(user.uid)}
                  disabled={actionLoading === user.uid}
                  className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-2 rounded text-sm font-medium transition"
                >
                  {actionLoading === user.uid ? 'Processing...' : 'Approve'}
                </button>
              ))
            )
          )}
        </div>
      )}
    </div>
  );
}
