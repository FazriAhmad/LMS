import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type {
  User, Notif, Assignment, AttStatus, QuizAttempt, Chat, Announcement,
  ForumThread, Job, FileItem, ExamParticipant, Submission,
} from './types';
import {
  USERS, PASSWORD, NOTIFS_INIT, ASSIGNMENTS, TODAY_ATTENDANCE_INIT, CHATS,
  ANNOUNCEMENTS, FORUMS, FILES, EXAMS, SCHOOL,
} from './data';

interface Toast { id: number; text: string; type: 'success' | 'error' | 'info' }

interface StoreShape {
  user: User | null;
  login: (email: string, password: string) => boolean;
  loginAs: (userId: string) => void;
  logout: () => void;

  notifications: Notif[];
  markAllRead: () => void;
  pushNotif: (text: string, kind?: string) => void;

  toasts: Toast[];
  toast: (text: string, type?: Toast['type']) => void;

  assignments: Assignment[];
  submitAssignment: (assignmentId: string, studentId: string, fileName: string) => void;
  gradeSubmission: (assignmentId: string, studentId: string, score: number, feedback: string) => void;
  requestRevision: (assignmentId: string, studentId: string, feedback: string) => void;

  todayAttendance: Record<string, AttStatus>;
  setAttendanceStatus: (studentId: string, status: AttStatus) => void;

  quizAttempts: QuizAttempt[];
  addQuizAttempt: (a: QuizAttempt) => void;

  examParticipants: Record<string, ExamParticipant[]>;
  updateExamParticipant: (examId: string, studentId: string, patch: Partial<ExamParticipant>) => void;

  chats: Chat[];
  sendMessage: (chatId: string, from: string, text: string) => void;

  announcements: Announcement[];
  addAnnouncement: (a: Omit<Announcement, 'id' | 'date' | 'author'>) => void;

  forums: ForumThread[];
  addForumReply: (threadId: string, text: string) => void;
  addForumThread: (courseId: string, title: string, body: string) => void;

  jobs: Job[];
  startJob: (name: string, format: string) => void;

  files: FileItem[];
  addFile: (f: Omit<FileItem, 'id' | 'at' | 'uploadedBy'>) => void;

  completedMaterials: string[];
  toggleMaterial: (id: string) => void;

  settings: Record<string, boolean>;
  toggleSetting: (key: string) => void;
}

const StoreCtx = createContext<StoreShape | null>(null);

let idCounter = 100;
const nextId = (p: string) => `${p}${idCounter++}`;

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('edunusa_user');
      return raw ? (JSON.parse(raw) as User) : null;
    } catch { return null; }
  });
  const [notifications, setNotifications] = useState<Notif[]>(NOTIFS_INIT);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>(ASSIGNMENTS);
  const [todayAttendance, setTodayAttendance] = useState<Record<string, AttStatus>>(TODAY_ATTENDANCE_INIT);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [examParticipants, setExamParticipants] = useState<Record<string, ExamParticipant[]>>(
    Object.fromEntries(EXAMS.map(e => [e.id, e.participants]))
  );
  const [chats, setChats] = useState<Chat[]>(CHATS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(ANNOUNCEMENTS);
  const [forums, setForums] = useState<ForumThread[]>(FORUMS);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [files, setFiles] = useState<FileItem[]>(FILES);
  const [completedMaterials, setCompletedMaterials] = useState<string[]>(['mat1', 'mat2', 'mat10']);
  const [settings, setSettings] = useState<Record<string, boolean>>({
    twoFA: true, youtube: true, gdrive: true, email: true, gcalendar: true,
    meet: false, zoom: false, whatsapp: false, gworkspace: true, qrAttendance: true,
  });
  const timers = useRef<number[]>([]);

  useEffect(() => () => { timers.current.forEach(t => window.clearInterval(t)); }, []);

  const toast = useCallback((text: string, type: Toast['type'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, text, type }]);
    window.setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800);
  }, []);

  const pushNotif = useCallback((text: string, kind = 'info') => {
    setNotifications(n => [{ id: nextId('n'), text, time: new Date().toISOString(), read: false, kind }, ...n]);
  }, []);

  const login = useCallback((email: string, password: string) => {
    const u = USERS.find(x => x.email.toLowerCase() === email.toLowerCase());
    if (!u || password !== PASSWORD) return false;
    setUser(u);
    localStorage.setItem('edunusa_user', JSON.stringify(u));
    return true;
  }, []);

  const loginAs = useCallback((userId: string) => {
    const u = USERS.find(x => x.id === userId);
    if (!u) return;
    setUser(u);
    localStorage.setItem('edunusa_user', JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('edunusa_user');
  }, []);

  const markAllRead = useCallback(() => setNotifications(n => n.map(x => ({ ...x, read: true }))), []);

  const submitAssignment = useCallback((assignmentId: string, studentId: string, fileName: string) => {
    setAssignments(list => list.map(a => a.id !== assignmentId ? a : {
      ...a,
      submissions: a.submissions.map(s => s.studentId !== studentId ? s : {
        ...s, status: 'sudah', file: fileName, submittedAt: new Date().toISOString(), revisions: s.revisions,
      }),
    }));
  }, []);

  const gradeSubmission = useCallback((assignmentId: string, studentId: string, score: number, feedback: string) => {
    setAssignments(list => list.map(a => a.id !== assignmentId ? a : {
      ...a,
      submissions: a.submissions.map(s => s.studentId !== studentId ? s : { ...s, status: 'dinilai', score, feedback }),
    }));
  }, []);

  const requestRevision = useCallback((assignmentId: string, studentId: string, feedback: string) => {
    setAssignments(list => list.map(a => a.id !== assignmentId ? a : {
      ...a,
      submissions: a.submissions.map(s => s.studentId !== studentId ? s : { ...s, status: 'revisi', feedback, revisions: s.revisions + 1 }),
    }));
  }, []);

  const setAttendanceStatus = useCallback((studentId: string, status: AttStatus) => {
    setTodayAttendance(t => ({ ...t, [studentId]: status }));
  }, []);

  const addQuizAttempt = useCallback((a: QuizAttempt) => {
    setQuizAttempts(list => [...list, a]);
  }, []);

  const updateExamParticipant = useCallback((examId: string, studentId: string, patch: Partial<ExamParticipant>) => {
    setExamParticipants(map => ({
      ...map,
      [examId]: (map[examId] || []).map(p => p.studentId !== studentId ? p : { ...p, ...patch }),
    }));
  }, []);

  const sendMessage = useCallback((chatId: string, from: string, text: string) => {
    setChats(list => list.map(c => c.id !== chatId ? c : {
      ...c, messages: [...c.messages, { from, text, at: new Date().toISOString() }],
    }));
  }, []);

  const addAnnouncement = useCallback((a: Omit<Announcement, 'id' | 'date' | 'author'>) => {
    setAnnouncements(list => [{ ...a, id: nextId('an'), date: new Date().toISOString(), author: SCHOOL.short }, ...list]);
  }, []);

  const addForumReply = useCallback((threadId: string, text: string) => {
    setForums(list => list.map(f => f.id !== threadId ? f : {
      ...f, replies: [...f.replies, { author: 'Anda', role: 'Anda', text, at: new Date().toISOString() }],
    }));
  }, []);

  const addForumThread = useCallback((courseId: string, title: string, body: string) => {
    setForums(list => [{ id: nextId('f'), courseId, title, body, author: 'Anda', date: new Date().toISOString(), replies: [] }, ...list]);
  }, []);

  const startJob = useCallback((name: string, format: string) => {
    const id = nextId('job');
    setJobs(j => [{ id, name, format, progress: 0, status: 'antre', at: new Date().toISOString() }, ...j]);
    window.setTimeout(() => {
      setJobs(j => j.map(x => x.id === id ? { ...x, status: 'proses' } : x));
      const iv = window.setInterval(() => {
        setJobs(j => {
          const job = j.find(x => x.id === id);
          if (!job) { window.clearInterval(iv); return j; }
          const p = Math.min(100, job.progress + 8 + Math.random() * 14);
          if (p >= 100) {
            window.clearInterval(iv);
            setNotifications(n => [{ id: nextId('n'), text: `Laporan "${name}" (${format}) selesai diproses — siap diunduh`, time: new Date().toISOString(), read: false, kind: 'laporan' }, ...n]);
            return j.map(x => x.id === id ? { ...x, progress: 100, status: 'selesai' } : x);
          }
          return j.map(x => x.id === id ? { ...x, progress: p } : x);
        });
      }, 500);
      timers.current.push(iv);
    }, 800);
  }, []);

  const addFile = useCallback((f: Omit<FileItem, 'id' | 'at' | 'uploadedBy'>) => {
    setFiles(list => [{ ...f, id: nextId('fl'), at: new Date().toISOString(), uploadedBy: 'Anda' }, ...list]);
  }, []);

  const toggleMaterial = useCallback((id: string) => {
    setCompletedMaterials(list => list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  }, []);

  const toggleSetting = useCallback((key: string) => {
    setSettings(s => ({ ...s, [key]: !s[key] }));
  }, []);

  const value: StoreShape = {
    user, login, loginAs, logout,
    notifications, markAllRead, pushNotif,
    toasts, toast,
    assignments, submitAssignment, gradeSubmission, requestRevision,
    todayAttendance, setAttendanceStatus,
    quizAttempts, addQuizAttempt,
    examParticipants, updateExamParticipant,
    chats, sendMessage,
    announcements, addAnnouncement,
    forums, addForumReply, addForumThread,
    jobs, startJob,
    files, addFile,
    completedMaterials, toggleMaterial,
    settings, toggleSetting,
  };

  return (
    <StoreCtx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <div key={t.id} className={`animate-slide-up rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            t.type === 'error' ? 'bg-rose-600' : t.type === 'info' ? 'bg-slate-800' : 'bg-emerald-600'
          }`}>
            {t.text}
          </div>
        ))}
      </div>
    </StoreCtx.Provider>
  );
}

export function useStore(): StoreShape {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within AppProvider');
  return ctx;
}
