import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Layers, Users } from 'lucide-react';
import { COURSES, getMapel, getClass, getTeacherName, STUDENTS } from '../lib/data';
import { useStore } from '../lib/store';
import { Badge, Card, PageHeader } from '../components/ui';

export default function Courses() {
  const { user } = useStore();
  const courses = !user ? [] :
    user.role === 'siswa' ? COURSES.filter(c => c.classId === user.classId) :
    user.role === 'ortu' ? COURSES.filter(c => c.classId === 'k3') :
    user.role === 'guru' || user.role === 'walikelas' ? COURSES.filter(c => c.teacherId === user.id || c.classId === user.homeroomClassId) :
    COURSES;

  return (
    <div>
      <PageHeader
        title="Mata Pelajaran / Course"
        desc="Modul, materi, tugas, quiz, ujian, forum, dan progress belajar dalam satu tempat"
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {courses.map(c => {
          const m = getMapel(c.mapelId);
          const mats = c.modules.reduce((n, mo) => n + mo.materials.length, 0);
          const students = STUDENTS.filter(s => s.classId === c.classId).length;
          return (
            <Link key={c.id} to={`/courses/${c.id}`} className="group">
              <Card className="h-full transition group-hover:-translate-y-1 group-hover:shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-md" style={{ backgroundColor: m.color }}>
                    {m.code}
                  </div>
                  <Badge color="slate">{getClass(c.classId).name}</Badge>
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-slate-900 group-hover:text-indigo-700">{m.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{c.description}</p>
                <div className="mt-4 flex items-center gap-4 border-t border-slate-50 pt-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {c.modules.length} modul</span>
                  <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {mats} materi</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {students}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[11px] text-slate-400">{getTeacherName(c.teacherId)}</p>
                  <span className="flex items-center gap-1 text-xs font-bold text-indigo-600">Buka <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
