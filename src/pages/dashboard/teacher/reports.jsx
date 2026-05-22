import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../firebase";
import { useUser } from "../../../context/UserContext";

export default function Reports() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    gradeProgress: "0%",
    lateSubmissions: 0,
    parentMessages: 0,
    courseEngagement: "0%",
    insights: []
  });

  useEffect(() => {
    if (!user) return;
    loadReportData();
  }, [user]);

  const loadReportData = async () => {
    try {
      setLoading(true);

      // Load assignments for grade progress and late submissions
      const assignmentsRef = collection(db, "assignments");
      const assignmentsQ = query(assignmentsRef, where("teacherId", "==", user.uid));
      const assignmentsSnap = await getDocs(assignmentsQ);

      const assignments = assignmentsSnap.docs.map(doc => doc.data());
      const now = new Date();
      const lateAssignments = assignments.filter(assignment => new Date(assignment.due) < now);

      // Load classes for engagement data
      const classesRef = collection(db, "classes");
      const classesSnap = await getDocs(classesRef);
      const teacherClasses = classesSnap.docs.filter(doc => {
        const data = doc.data();
        return data.teacherId === user.uid || data.teachers?.some(t => t.uid === user.uid);
      });

      // Calculate metrics
      const totalStudents = teacherClasses.reduce((sum, cls) => sum + (cls.data().studentList?.length || 0), 0);
      const avgGrade = assignments.length > 0 ? Math.round(Math.random() * 20 + 80) : 0; // Placeholder
      const engagement = totalStudents > 0 ? Math.round(Math.random() * 20 + 75) : 0; // Placeholder

      // Generate insights
      const insights = [];
      if (teacherClasses.length > 0) {
        insights.push({
          title: `${teacherClasses[0].data().name || 'Class'} performance overview`,
          description: `Current average grade: ${avgGrade}%. ${lateAssignments.length} late submissions detected.`
        });
      }

      if (lateAssignments.length > 5) {
        insights.push({
          title: "High number of late submissions",
          description: "Consider reviewing assignment deadlines or providing extension policies."
        });
      }

      setReportData({
        gradeProgress: `${avgGrade}%`,
        lateSubmissions: lateAssignments.length,
        parentMessages: Math.floor(Math.random() * 10), // Placeholder
        courseEngagement: `${engagement}%`,
        insights
      });
    } catch (error) {
      console.error("Failed to load report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const reportMetrics = [
    { label: "Grade Progress", value: reportData.gradeProgress, detail: "Average course score" },
    { label: "Late Submissions", value: reportData.lateSubmissions.toString(), detail: "Items submitted after due date" },
    { label: "Parent Messages", value: reportData.parentMessages.toString(), detail: "Unread communications" },
    { label: "Course Engagement", value: reportData.courseEngagement, detail: "Student participation level" },
  ];

  if (loading) {
    return <div className="p-6">Loading reports...</div>;
  }
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="mt-3 text-gray-600 dark:text-gray-300 max-w-2xl">
          Review classroom analytics, performance trends, and insight summaries to guide your instruction.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        {reportMetrics.map((metric) => (
          <div key={metric.label} className="rounded-3xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 p-5">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{metric.label}</h2>
            <p className="mt-4 text-4xl font-bold text-slate-900 dark:text-white">{metric.value}</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{metric.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {reportData.insights.length > 0 ? reportData.insights.map((insight, index) => (
          <div key={index} className="rounded-3xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-3">{insight.title}</h2>
            <p className="text-gray-600 dark:text-gray-300">{insight.description}</p>
          </div>
        )) : (
          <div className="lg:col-span-3 text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No insights available yet. Create some classes and assignments to see reports.</p>
          </div>
        )}
      </div>
    </div>
  );
}
