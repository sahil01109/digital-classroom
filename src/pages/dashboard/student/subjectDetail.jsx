import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, ClipboardList, FileText, HelpCircle, BarChart3, CalendarDays, Clock, CheckCircle2 } from "lucide-react";

function ActionCard({ icon: Icon, title, subtitle, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="rounded-2xl bg-slate-800 p-5 shadow-md transition hover:-translate-y-1 hover:bg-slate-700 cursor-pointer"
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
        <Icon size={22} />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
    </div>
  );
}

function ListBox({ title, items, icon: Icon }) {
  return (
    <div className="rounded-2xl bg-slate-800 p-5 shadow-md">
      <div className="mb-4 flex items-center gap-2 text-white">
        <Icon size={20} className="text-blue-400" />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="space-y-3">
        {items && items.length > 0 ? (
          items.map((item, index) => (
            <div key={index} className="flex items-center justify-between rounded-xl bg-slate-900/70 p-3">
              <span className="text-sm text-slate-200">{item}</span>
              <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs text-blue-300">View</span>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-slate-400 text-sm">
            No {title.toLowerCase()} available yet
          </div>
        )}
      </div>
    </div>
  );
}

export default function SubjectDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const subject = location.state?.subject;

  if (!subject) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Subject not found</p>
          <button
            onClick={() => navigate('/student/subjects')}
            className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Back to Subjects
          </button>
        </div>
      </div>
    );
  }

  const subjectName =
    typeof subject === "string"
      ? subject
      : subject.name || subject.title || "Subject";
  const subjectTeacher =
    typeof subject === "object" ? subject.teacher : undefined;

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <button
        onClick={() => navigate('/student/subjects')}
        className="mb-6 flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
      >
        <ArrowLeft size={18} /> Back to Subjects
      </button>

      <div className="rounded-3xl bg-gradient-to-r from-slate-800 to-slate-900 p-7 shadow-xl">
        <p className="text-sm text-blue-300">Subject Dashboard</p>
        <h1 className="mt-2 text-4xl font-bold">{subjectName}</h1>
        <p className="mt-2 text-slate-400">Teacher: {subjectTeacher || 'Not assigned'}</p>
        <p className="mt-4 max-w-2xl text-slate-300">{subject.description || 'Subject description not available.'}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-950/60 p-4">
            <CalendarDays className="mb-2 text-blue-400" />
            <p className="text-sm text-slate-400">Next Class</p>
            <p className="font-semibold">{subject.nextClass || 'Not scheduled'}</p>
          </div>
          <div className="rounded-2xl bg-slate-950/60 p-4">
            <BarChart3 className="mb-2 text-blue-400" />
            <p className="text-sm text-slate-400">Progress</p>
            <p className="font-semibold">{subject.progress || 0}% Complete</p>
          </div>
          <div className="rounded-2xl bg-slate-950/60 p-4">
            <Clock className="mb-2 text-blue-400" />
            <p className="text-sm text-slate-400">Pending Work</p>
            <p className="font-semibold">{subject.pendingWork || 0} Assignments</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-4">
        <ActionCard 
          icon={FileText} 
          title="Notes" 
          subtitle="Read subject notes"
          onClick={() => navigate('/student/notes')}
        />
        <ActionCard 
          icon={ClipboardList} 
          title="Homework" 
          subtitle="View assignments"
          onClick={() => navigate('/student/homework')}
        />
        <ActionCard 
          icon={HelpCircle} 
          title="Quizzes" 
          subtitle="Start practice tests"
          onClick={() => navigate('/student/quizzes')}
        />
        <ActionCard 
          icon={CheckCircle2} 
          title="Attendance" 
          subtitle={`${subject.attendance || 0}% present`}
          onClick={() => {}}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <ListBox title="Latest Notes" items={subject.notes || []} icon={BookOpen} />
        <ListBox title="Homework" items={subject.homework || []} icon={ClipboardList} />
        <ListBox title="Quizzes" items={subject.quizzes || []} icon={HelpCircle} />
      </div>
    </div>
  );
}
