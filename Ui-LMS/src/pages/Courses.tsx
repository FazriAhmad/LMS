import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Layers } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { Badge, Card, PageHeader } from '../components/ui';

interface ApiCourse {
  id: number;
  description: string | null;
  modules_count: number;
  teaching_assignment: {
    teacher: { name: string };
    subject: { name: string; code: string; color: string };
    school_class: { name: string };
  };
}

export default function Courses() {
  const [courses, setCourses] = useState<ApiCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ data: ApiCourse[] }>('/courses')
      .then(res => setCourses(res.data))
      .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-10 text-center text-sm text-slate-400">Memuat course…</div>;
  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;

  return (
    <div>
      <PageHeader
        title="Mata Pelajaran / Course"
        desc="Modul, materi, tugas, quiz, ujian, forum, dan progress belajar dalam satu tempat"
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {courses.map(c => {
          const ta = c.teaching_assignment;
          return (
            <Link key={c.id} to={`/courses/${c.id}`} className="group">
              <Card className="h-full transition group-hover:-translate-y-1 group-hover:shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-md" style={{ backgroundColor: ta.subject.color }}>
                    {ta.subject.code}
                  </div>
                  <Badge color="slate">{ta.school_class.name}</Badge>
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-slate-900 group-hover:text-indigo-700">{ta.subject.name}</h3>
                {c.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{c.description}</p>}
                <div className="mt-4 flex items-center gap-4 border-t border-slate-50 pt-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {c.modules_count} modul</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[11px] text-slate-400">{ta.teacher.name}</p>
                  <span className="flex items-center gap-1 text-xs font-bold text-indigo-600">Buka <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
      {courses.length === 0 && (
        <Card><div className="py-8 text-center text-sm text-slate-400"><BookOpen className="mx-auto mb-2 h-6 w-6" />Belum ada course.</div></Card>
      )}
    </div>
  );
}
