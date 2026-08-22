import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useStore } from './lib/store';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Akademik from './pages/Akademik';
import Kurikulum from './pages/Kurikulum';
import Jadwal from './pages/Jadwal';
import Kalender from './pages/Kalender';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Tugas from './pages/Tugas';
import TugasDetail from './pages/TugasDetail';
import Ujian from './pages/Ujian';
import QuizPlayer from './pages/QuizPlayer';
import ExamPlayer from './pages/ExamPlayer';
import BankSoal from './pages/BankSoal';
import Nilai from './pages/Nilai';
import Presensi from './pages/Presensi';
import Progress from './pages/Progress';
import Komunikasi from './pages/Komunikasi';
import OrangTua from './pages/OrangTua';
import Laporan from './pages/Laporan';
import Files from './pages/Files';
import Integrasi from './pages/Integrasi';
import Pengaturan from './pages/Pengaturan';

function AuthSplash() {
  return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">Memuat…</div>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useStore();
  if (authLoading) return <AuthSplash />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function LoginGate() {
  const { user, authLoading } = useStore();
  if (authLoading) return <AuthSplash />;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginGate />} />
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/akademik" element={<Akademik />} />
            <Route path="/kurikulum" element={<Kurikulum />} />
            <Route path="/jadwal" element={<Jadwal />} />
            <Route path="/kalender" element={<Kalender />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/tugas" element={<Tugas />} />
            <Route path="/tugas/:id" element={<TugasDetail />} />
            <Route path="/ujian" element={<Ujian />} />
            <Route path="/quiz/:id" element={<QuizPlayer />} />
            <Route path="/ujian/:id" element={<ExamPlayer />} />
            <Route path="/bank-soal" element={<BankSoal />} />
            <Route path="/nilai" element={<Nilai />} />
            <Route path="/presensi" element={<Presensi />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/komunikasi" element={<Komunikasi />} />
            <Route path="/anak" element={<OrangTua />} />
            <Route path="/laporan" element={<Laporan />} />
            <Route path="/files" element={<Files />} />
            <Route path="/integrasi" element={<Integrasi />} />
            <Route path="/pengaturan" element={<Pengaturan />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
