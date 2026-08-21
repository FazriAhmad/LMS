import { Link } from 'react-router-dom';
import {
  Users, GraduationCap, BookOpen, ClipboardList, CalendarCheck, Bell, Star,
  Clock, AlertTriangle, TrendingUp, MonitorPlay, FileBarChart, CheckCircle2,
  BookMarked, Award, Baby, ArrowRight, Activity, Database,
} from 'lucide-react';
import { useStore } from '../lib/store';
import {
  SCHOOL, STUDENTS, TEACHERS, CLASSES, MAPEL, SCHEDULE, COURSES, GRADES,
  ATTENDANCE_HISTORY, ACTIVITIES, ANNOUNCEMENTS, EXAMS, getMapel, getClass,
  getStudent, getTeacherName, ROLE_LABELS, STORAGE,
} from '../lib/data';
import { cn, fmtDate, fmtTime, daysUntil, isOverdue, finalScore, gradeLetter, gradeColor, attendancePct, timeAgo } from '../lib/utils';
import { Card, StatCard, Badge, ProgressBar, Avatar } from '../components/ui';

const todayIdx = () => {
  const d = (new Date().getDay() + 6) % 7;
  return d > 4 ? 0 : d;
};

export default function Dashboard() {
  const { user } = useStore();
  if (!user) return null;
  switch (user.role) {
    case 'siswa': return <SiswaDash />;
    case 'ortu': return <OrtuDash />;
    case 'kepsek': return <KepsekDash />;
    case 'guru': return <GuruDash />;
    case 'walikelas': return <GuruDash />;
    default: return <AdminDash />;
  }
}

function Greeting({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-200 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">{SCHOOL.year} · Semester {SCHOOL.semester}</p>
          <h1 className="mt-1 font-display text-2xl font-bold md:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-indigo-100">{sub}</p>
        </div>
        <img src="/images/banner.jpg" alt="" className="hidden h-24 w-40 rounded-xl object-cover ring-2 ring-white/30 md:block" />
      </div>
    </div>
  );
}

/* ================= SISWA ================= */
function SiswaDash() {
  const { user, assignments, completedMaterials } = useStore();
  const classId = user!.classId || 'k3';
  const day = todayIdx();
  const todaySchedule = SCHEDULE.filter(s => s.classId === classId && s.day === day);
  const myCourses = COURSES.filter(c => c.classId === classId);
  const myGrades = GRADES.filter(g => g.studentId === user!.id);
  const avg = Math.round(myGrades.reduce((a, g) => a + finalScore(g), 0) / (myGrades.length || 1));
  const att = ATTENDANCE_HISTORY.find(a => a.studentId === user!.id)!;
  const deadlines = assignments
    .filter(a => COURSES.find(c => c.id === a.courseId)?.classId === classId)
    .map(a => ({ a, sub: a.submissions.find(s => s.studentId === user!.id) }))
    .sort((x, y) => x.a.deadline.localeCompare(y.a.deadline));
  const totalMats = myCourses.reduce((n, c) => n + c.modules.reduce((m, mo) => m + mo.materials.length, 0), 0);

  return (
    <div>
      <Greeting title={`Halo, ${user!.name.split(' ')[0]}! 👋`} sub={`Kelas ${getClass(classId).name} · ${myCourses.length} mata pelajaran aktif · ${totalMats - completedMaterials.length} materi menunggu dipelajari`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Star} label="Rata-rata Nilai" value={avg} sub={<Badge color={gradeColor(gradeLetter(avg))}>Grade {gradeLetter(avg)}</Badge>} color="bg-amber-50 text-amber-600" />
        <StatCard icon={CalendarCheck} label="Kehadiran" value={`${attendancePct(att)}%`} sub={`${att.hadir} hadir · ${att.izin} izin · ${att.sakit} sakit · ${att.alpa} alpa`} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={ClipboardList} label="Tugas Belum Dikumpulkan" value={deadlines.filter(d => d.sub?.status === 'belum').length} sub="Cek menu Tugas untuk detail" color="bg-rose-50 text-rose-600" />
        <StatCard icon={BookMarked} label="Progress Materi" value={`${completedMaterials.length}/${totalMats}`} sub={<ProgressBar value={(completedMaterials.length / totalMats) * 100} className="mt-1" />} color="bg-indigo-50 text-indigo-600" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Jadwal Hari Ini" subtitle={new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })} action={<Link to="/jadwal" className="text-xs font-bold text-indigo-600 hover:underline">Lihat semua →</Link>}>
            <div className="space-y-2">
              {todaySchedule.map(s => {
                const m = getMapel(s.mapelId);
                return (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/40">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: m.color }}>{m.code}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{m.name}</p>
                      <p className="text-xs text-slate-500">{getTeacherName(s.teacherId)} · {s.room}</p>
                    </div>
                    <Badge color="slate"><Clock className="h-3 w-3" /> {s.start}–{s.end}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Deadline Tugas" action={<Link to="/tugas" className="text-xs font-bold text-indigo-600 hover:underline">Semua tugas →</Link>}>
            <div className="space-y-3">
              {deadlines.slice(0, 4).map(({ a, sub }) => {
                const course = COURSES.find(c => c.id === a.courseId)!;
                const overdue = isOverdue(a.deadline);
                return (
                  <Link key={a.id} to={`/tugas/${a.id}`} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/40">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{a.title}</p>
                      <p className="text-xs text-slate-500">{getMapel(course.mapelId).name} · tenggat {fmtDate(a.deadline)} {daysUntil(a.deadline) >= 0 && `(${daysUntil(a.deadline)} hari lagi)`}</p>
                    </div>
                    {sub?.status === 'dinilai' ? <Badge color="emerald">Dinilai · {sub.score}</Badge>
                      : sub?.status === 'sudah' ? <Badge color="sky">Sudah dikumpulkan</Badge>
                      : sub?.status === 'revisi' ? <Badge color="amber">Perlu revisi</Badge>
                      : overdue ? <Badge color="rose">Terlambat</Badge>
                      : <Badge color="slate">Belum</Badge>}
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card title="Nilai Terbaru" action={<Link to="/nilai" className="text-xs font-bold text-indigo-600 hover:underline">Detail nilai →</Link>}>
            <div className="grid gap-3 sm:grid-cols-2">
              {myGrades.map(g => {
                const f = finalScore(g); const m = getMapel(g.mapelId);
                return (
                  <div key={g.mapelId} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-bold text-white" style={{ backgroundColor: m.color }}>{m.code}</div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-700">{m.name}</p>
                      <ProgressBar value={f} className="mt-1.5" color={f >= 80 ? 'bg-emerald-500' : f >= 70 ? 'bg-amber-500' : 'bg-rose-500'} />
                    </div>
                    <span className={cn('rounded-lg px-2 py-1 text-sm font-bold', gradeColor(gradeLetter(f)))}>{f}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Ujian Mendatang" action={<Link to="/ujian" className="text-xs font-bold text-indigo-600 hover:underline">Menu ujian →</Link>}>
            <div className="space-y-3">
              {EXAMS.filter(e => e.classId === classId && e.status !== 'selesai').map(e => (
                <div key={e.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{e.title}</p>
                    <Badge color={e.status === 'aktif' ? 'emerald' : 'sky'}>{e.status === 'aktif' ? 'Sedang dibuka' : 'Terjadwal'}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{e.type} · {fmtDate(e.date)} {fmtTime(e.date)} · {e.durationMin} menit</p>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Pengumuman">
            <div className="space-y-3">
              {ANNOUNCEMENTS.slice(0, 3).map(a => (
                <div key={a.id} className="border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <p className="text-xs font-bold text-slate-800">{a.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{a.body}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Progress Mata Pelajaran">
            <div className="space-y-3">
              {myCourses.map(c => {
                const mats = c.modules.flatMap(m => m.materials);
                const done = mats.filter(m => completedMaterials.includes(m.id)).length;
                const m = getMapel(c.mapelId);
                return (
                  <Link key={c.id} to={`/courses/${c.id}`} className="block">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{m.name}</span>
                      <span className="text-slate-400">{done}/{mats.length}</span>
                    </div>
                    <ProgressBar value={(done / mats.length) * 100} color="bg-violet-500" />
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ================= GURU / WALI KELAS ================= */
function GuruDash() {
  const { user, assignments, todayAttendance } = useStore();
  const isWali = user!.role === 'walikelas';
  const day = todayIdx();
  const mySchedule = SCHEDULE.filter(s => s.teacherId === user!.id && s.day === day);
  const myCourses = COURSES.filter(c => c.teacherId === user!.id);
  const myAssignments = assignments.filter(a => myCourses.some(c => c.id === a.courseId));
  const toGrade = myAssignments.flatMap(a => a.submissions.filter(s => s.status === 'sudah').map(s => ({ a, s })));
  const hadir = Object.values(todayAttendance).filter(v => v === 'H' || v === 'T').length;
  const total = Object.keys(todayAttendance).length;
  const homeroom = isWali ? CLASSES.find(c => c.id === user!.homeroomClassId) : undefined;
  const homeroomStudents = homeroom ? STUDENTS.filter(s => s.classId === homeroom.id) : [];
  const homeroomAvg = homeroomStudents.length
    ? Math.round(homeroomStudents.reduce((t, s) => t + (GRADES.filter(g => g.studentId === s.id).reduce((x, g) => x + finalScore(g), 0) / 4), 0) / homeroomStudents.length)
    : 0;

  return (
    <div>
      <Greeting title={`Selamat datang, ${user!.name.split(',')[0]} 🎓`} sub={`${user!.title} · ${myCourses.length} kelas diampu · ${toGrade.length} pengumpulan menunggu dinilai`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BookOpen} label="Kelas Diampu" value={myCourses.length} sub={myCourses.map(c => getClass(c.classId).name).join(', ')} color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={ClipboardList} label="Perlu Dinilai" value={toGrade.length} sub="Pengumpulan tugas masuk" color="bg-amber-50 text-amber-600" />
        <StatCard icon={CalendarCheck} label="Presensi Hari Ini (XI-IPA-1)" value={`${Math.round((hadir / total) * 100)}%`} sub={`${hadir}/${total} siswa hadir`} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={MonitorPlay} label="Ujian Aktif" value={EXAMS.filter(e => e.status === 'aktif').length} sub="CBT sedang berlangsung" color="bg-violet-50 text-violet-600" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Jadwal Mengajar Hari Ini">
            {mySchedule.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Tidak ada jadwal mengajar hari ini.</p>
            ) : (
              <div className="space-y-2">
                {mySchedule.map(s => {
                  const m = getMapel(s.mapelId);
                  return (
                    <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: m.color }}>{m.code}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">{m.name} · {getClass(s.classId).name}</p>
                        <p className="text-xs text-slate-500">{s.room}</p>
                      </div>
                      <Badge color="slate"><Clock className="h-3 w-3" /> {s.start}–{s.end}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Pengumpulan Menunggu Dinilai" action={<Link to="/tugas" className="text-xs font-bold text-indigo-600 hover:underline">Kelola tugas →</Link>}>
            {toGrade.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Semua pengumpulan sudah dinilai. 🎉</p>
            ) : (
              <div className="space-y-2">
                {toGrade.slice(0, 5).map(({ a, s }) => (
                  <Link key={a.id + s.studentId} to={`/tugas/${a.id}`} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-amber-200 hover:bg-amber-50/40">
                    <Avatar name={getStudent(s.studentId).name} color="#f59e0b" size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{getStudent(s.studentId).name}</p>
                      <p className="truncate text-xs text-slate-500">{a.title} · {s.file}</p>
                    </div>
                    <Badge color="amber">Nilai sekarang</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card title="Aktivitas Terbaru LMS">
            <div className="space-y-3">
              {ACTIVITIES.slice(0, 5).map(ac => (
                <div key={ac.id} className="flex items-start gap-3">
                  <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', ac.icon === 'alert' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500')}>
                    {ac.icon === 'alert' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <p className="text-xs text-slate-700"><b>{ac.user}</b> {ac.action}</p>
                    <p className="text-[10px] text-slate-400">{timeAgo(ac.at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {homeroom && (
            <Card title={`Wali Kelas · ${homeroom.name}`} subtitle="Ringkasan kelas walimu">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="font-display text-xl font-bold text-slate-900">{homeroomStudents.length}</p>
                  <p className="text-[10px] font-semibold text-slate-500">Siswa</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="font-display text-xl font-bold text-slate-900">{homeroomAvg}</p>
                  <p className="text-[10px] font-semibold text-slate-500">Rata-rata nilai</p>
                </div>
              </div>
              <Link to="/progress" className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-indigo-50 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100">
                Lihat progress kelas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Card>
          )}
          <Card title="Kelas Saya" pad={false}>
            <div className="divide-y divide-slate-50">
              {myCourses.map(c => {
                const m = getMapel(c.mapelId);
                return (
                  <Link key={c.id} to={`/courses/${c.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-bold text-white" style={{ backgroundColor: m.color }}>{m.code}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{m.name}</p>
                      <p className="text-xs text-slate-500">{getClass(c.classId).name} · {c.modules.length} modul</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </Link>
                );
              })}
            </div>
          </Card>
          <Card title="Aksi Cepat">
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: '/presensi', label: 'Input Presensi', icon: CalendarCheck },
                { to: '/bank-soal', label: 'Bank Soal', icon: Database },
                { to: '/tugas', label: 'Buat Tugas', icon: ClipboardList },
                { to: '/ujian', label: 'Buat Ujian', icon: MonitorPlay },
              ].map(q => (
                <Link key={q.to} to={q.to} className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 p-3 text-center transition hover:border-indigo-300 hover:bg-indigo-50/50">
                  <q.icon className="h-5 w-5 text-indigo-600" />
                  <span className="text-[11px] font-bold text-slate-700">{q.label}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ================= ORANG TUA ================= */
function OrtuDash() {
  const { user } = useStore();
  const children = (user!.childIds || []).map(getStudent);
  return (
    <div>
      <Greeting title={`Selamat datang, ${user!.name} 👨‍👩‍👧‍👦`} sub="Pantau perkembangan belajar, nilai, dan kehadiran anak Anda secara real-time." />
      <div className="grid gap-6 lg:grid-cols-2">
        {children.map(child => {
          const kelas = getClass(child.classId);
          const grades = GRADES.filter(g => g.studentId === child.id);
          const avg = grades.length ? Math.round(grades.reduce((a, g) => a + finalScore(g), 0) / grades.length) : 0;
          const att = ATTENDANCE_HISTORY.find(a => a.studentId === child.id) || { hadir: 100, izin: 2, sakit: 1, alpa: 0, terlambat: 3, studentId: child.id };
          return (
            <Card key={child.id} className="overflow-hidden">
              <div className="flex items-center gap-4">
                <Avatar name={child.name} color={child.id === 's1' ? '#d97706' : '#e11d48'} size="lg" />
                <div className="flex-1">
                  <p className="font-display text-base font-bold text-slate-900">{child.name}</p>
                  <p className="text-xs text-slate-500">NIS {child.nis} · Kelas {kelas.name} · {kelas.jurusan}</p>
                </div>
                <Link to="/anak" className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700">Detail</Link>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-amber-50 p-3 text-center">
                  <Award className="mx-auto mb-1 h-4 w-4 text-amber-600" />
                  <p className="font-display text-lg font-bold text-slate-900">{avg || '—'}</p>
                  <p className="text-[10px] font-semibold text-slate-500">Rata-rata nilai</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-center">
                  <CalendarCheck className="mx-auto mb-1 h-4 w-4 text-emerald-600" />
                  <p className="font-display text-lg font-bold text-slate-900">{attendancePct(att)}%</p>
                  <p className="text-[10px] font-semibold text-slate-500">Kehadiran</p>
                </div>
                <div className="rounded-xl bg-indigo-50 p-3 text-center">
                  <ClipboardList className="mx-auto mb-1 h-4 w-4 text-indigo-600" />
                  <p className="font-display text-lg font-bold text-slate-900">{child.id === 's1' ? '2' : '1'}</p>
                  <p className="text-[10px] font-semibold text-slate-500">Tugas aktif</p>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Catatan guru terbaru</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                  {child.id === 's1' ? '“Andi aktif bertanya di forum dan konsisten mengumpulkan tugas tepat waktu.” — Dewi Lestari' : '“Sinta cepat memahami materi Informatika, namun beberapa kali terlambat jam pertama.” — Andi Nugroho'}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Pengumuman Sekolah">
          <div className="space-y-3">
            {ANNOUNCEMENTS.slice(0, 3).map(a => (
              <div key={a.id} className="border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5 text-indigo-500" />
                  <p className="text-xs font-bold text-slate-800">{a.title}</p>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{a.body}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Aktivitas Terbaru Anak">
          <div className="space-y-3">
            {ACTIVITIES.filter(a => a.user === 'Andi Pratama' || a.user === 'Bella Safitri').slice(0, 4).map(ac => (
              <div key={ac.id} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-xs text-slate-700"><b>{ac.user}</b> {ac.action}</p>
                  <p className="text-[10px] text-slate-400">{timeAgo(ac.at)}</p>
                </div>
              </div>
            ))}
            <Link to="/anak" className="mt-2 flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline">
              Lihat semua aktivitas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ================= KEPALA SEKOLAH ================= */
function KepsekDash() {
  const classAvg = CLASSES.map(c => {
    if (c.id === 'k3') {
      const rows = GRADES.filter(g => STUDENTS.some(s => s.id === g.studentId && s.classId === 'k3'));
      const perStudent = STUDENTS.filter(s => s.classId === 'k3').map(s => {
        const gs = rows.filter(r => r.studentId === s.id);
        return gs.reduce((a, g) => a + finalScore(g), 0) / (gs.length || 1);
      });
      return { c, avg: Math.round(perStudent.reduce((a, b) => a + b, 0) / perStudent.length) };
    }
    const staticAvg: Record<string, number> = { k1: 79, k2: 77, k4: 76, k5: 84, k6: 78 };
    return { c, avg: staticAvg[c.id] || 78 };
  });
  const lowPerformers = STUDENTS.filter(s => s.classId === 'k3').map(s => {
    const gs = GRADES.filter(g => g.studentId === s.id);
    return { s, avg: Math.round(gs.reduce((a, g) => a + finalScore(g), 0) / (gs.length || 1)) };
  }).filter(x => x.avg < 75).sort((a, b) => a.avg - b.avg);
  const totalStudents = CLASSES.reduce((a, c) => a + c.studentCount, 0);

  return (
    <div>
      <Greeting title={`Dashboard Kepala Sekolah 📊`} sub={`${SCHOOL.name} · Tahun Ajaran ${SCHOOL.year} · Semester ${SCHOOL.semester}`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total Siswa" value={totalStudents} sub={`${CLASSES.length} rombongan belajar`} color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={GraduationCap} label="Guru & Staf" value={TEACHERS.length + 4} sub={`${TEACHERS.length} guru mata pelajaran`} color="bg-violet-50 text-violet-600" />
        <StatCard icon={CalendarCheck} label="Kehadiran Sekolah" value="95,2%" sub="Rata-rata bulan ini" color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={TrendingUp} label="Rata-rata Nilai" value="79,4" sub="+1,8 dari semester lalu" color="bg-amber-50 text-amber-600" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Performa Kelas — Rata-rata Nilai" subtitle="Seluruh mata pelajaran per rombongan belajar">
            <div className="space-y-3">
              {classAvg.map(({ c, avg }) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs font-bold text-slate-600">{c.name}</span>
                  <div className="flex-1"><ProgressBar value={avg} color={avg >= 80 ? 'bg-emerald-500' : avg >= 75 ? 'bg-indigo-500' : 'bg-amber-500'} /></div>
                  <span className="w-8 text-right text-sm font-bold text-slate-800">{avg}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Statistik Tugas & Ujian" subtitle="Semester genap berjalan">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { l: 'Tugas dibuat', v: '128', icon: ClipboardList, c: 'text-indigo-600 bg-indigo-50' },
                { l: 'Pengumpulan', v: '3.412', icon: CheckCircle2, c: 'text-emerald-600 bg-emerald-50' },
                { l: 'Ujian CBT', v: '14', icon: MonitorPlay, c: 'text-violet-600 bg-violet-50' },
                { l: 'Soal di bank', v: '862', icon: Database, c: 'text-amber-600 bg-amber-50' },
              ].map(x => (
                <div key={x.l} className="rounded-xl border border-slate-100 p-4">
                  <div className={cn('mb-2 flex h-8 w-8 items-center justify-center rounded-lg', x.c)}><x.icon className="h-4 w-4" /></div>
                  <p className="font-display text-lg font-bold text-slate-900">{x.v}</p>
                  <p className="text-[11px] text-slate-500">{x.l}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Aktivitas LMS Terkini" subtitle="Log aktivitas pengguna platform">
            <div className="space-y-3">
              {ACTIVITIES.slice(0, 6).map(ac => (
                <div key={ac.id} className="flex items-start gap-3">
                  <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', ac.icon === 'alert' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500')}>
                    {ac.icon === 'alert' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-700"><b>{ac.user}</b> {ac.action}</p>
                    <p className="text-[10px] text-slate-400">{timeAgo(ac.at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Siswa Performa Rendah" subtitle="Rata-rata < 75 — perlu intervensi" className="border-rose-100">
            {lowPerformers.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Tidak ada siswa di bawah ambang batas.</p>
            ) : (
              <div className="space-y-2">
                {lowPerformers.map(({ s, avg }) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                    <Avatar name={s.name} color="#f43f5e" size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-800">{s.name}</p>
                      <p className="text-[10px] text-slate-500">{getClass(s.classId).name} · NIS {s.nis}</p>
                    </div>
                    <Badge color="rose">{avg}</Badge>
                  </div>
                ))}
                <p className="pt-1 text-[10px] text-slate-400">Rekomendasi: konseling wali kelas & remedial terarah.</p>
              </div>
            )}
          </Card>
          <Card title="Rekap Presensi Hari Ini">
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: 'Hadir', v: 196, c: 'bg-emerald-50 text-emerald-700' },
                { l: 'Izin', v: 4, c: 'bg-sky-50 text-sky-700' },
                { l: 'Sakit', v: 3, c: 'bg-amber-50 text-amber-700' },
                { l: 'Alpa', v: 3, c: 'bg-rose-50 text-rose-700' },
              ].map(x => (
                <div key={x.l} className={cn('rounded-xl p-3 text-center', x.c)}>
                  <p className="font-display text-lg font-bold">{x.v}</p>
                  <p className="text-[10px] font-semibold">{x.l}</p>
                </div>
              ))}
            </div>
          </Card>
          <Link to="/laporan" className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50">
            <FileBarChart className="h-4 w-4" /> Buka Pusat Laporan
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ================= ADMIN ================= */
function AdminDash() {
  const { todayAttendance, assignments } = useStore();
  const totalStudents = CLASSES.reduce((a, c) => a + c.studentCount, 0);
  const hadir = Object.values(todayAttendance).filter(v => v === 'H' || v === 'T').length;
  const total = Object.keys(todayAttendance).length;
  const collected = assignments.reduce((n, a) => n + a.submissions.filter(s => s.status !== 'belum').length, 0);

  return (
    <div>
      <Greeting title="Panel Administrasi Sekolah 🏫" sub={`Kelola data akademik, pengguna, dan sistem · ${SCHOOL.npsn}`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Siswa" value={totalStudents} sub="+12 siswa baru semester ini" color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={GraduationCap} label="Guru" value={TEACHERS.length} sub="8 mapel tercover" color="bg-violet-50 text-violet-600" />
        <StatCard icon={BookOpen} label="Kelas / Mapel" value={`${CLASSES.length} / ${MAPEL.length}`} sub="Semua jurusan aktif" color="bg-sky-50 text-sky-600" />
        <StatCard icon={CalendarCheck} label="Presensi XI-IPA-1 Hari Ini" value={`${Math.round((hadir / total) * 100)}%`} sub={`${hadir}/${total} hadir`} color="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Statistik Tugas & Pengumpulan">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-indigo-50 p-4 text-center">
                <p className="font-display text-2xl font-bold text-indigo-700">{assignments.length}</p>
                <p className="text-[11px] font-semibold text-indigo-600">Tugas aktif</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4 text-center">
                <p className="font-display text-2xl font-bold text-emerald-700">{collected}</p>
                <p className="text-[11px] font-semibold text-emerald-600">Pengumpulan masuk</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4 text-center">
                <p className="font-display text-2xl font-bold text-amber-700">{assignments.reduce((n, a) => n + a.submissions.filter(s => s.status === 'sudah').length, 0)}</p>
                <p className="text-[11px] font-semibold text-amber-600">Menunggu dinilai</p>
              </div>
            </div>
          </Card>
          <Card title="Aktivitas Sistem" action={<Link to="/pengaturan" className="text-xs font-bold text-indigo-600 hover:underline">Audit log →</Link>}>
            <div className="space-y-3">
              {ACTIVITIES.slice(0, 6).map(ac => (
                <div key={ac.id} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-700"><b>{ac.user}</b> {ac.action}</p>
                    <p className="text-[10px] text-slate-400">{timeAgo(ac.at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Pengumuman Terbaru" action={<Link to="/komunikasi" className="text-xs font-bold text-indigo-600 hover:underline">Kelola →</Link>}>
            <div className="space-y-3">
              {ANNOUNCEMENTS.slice(0, 3).map(a => (
                <div key={a.id} className="flex items-start gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <Bell className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">{a.title}</p>
                    <p className="line-clamp-1 text-[11px] text-slate-500">{a.body}</p>
                  </div>
                  <Badge color={a.scope === 'sekolah' ? 'indigo' : 'emerald'} className="ml-auto shrink-0">{a.scope}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Penyimpanan" subtitle="Storage monitoring">
            <div className="mb-2 flex items-end justify-between">
              <p className="font-display text-2xl font-bold text-slate-900">{STORAGE.usedGB} GB</p>
              <p className="text-xs text-slate-400">dari {STORAGE.quotaGB} GB</p>
            </div>
            <ProgressBar value={(STORAGE.usedGB / STORAGE.quotaGB) * 100} color="bg-violet-500" />
            <p className="mt-2 text-[11px] text-slate-400">Batas upload file kecil (maks 25 MB) aktif untuk menghemat storage. Video disarankan via YouTube unlisted.</p>
          </Card>
          <Card title="Akses Cepat">
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: '/akademik', label: 'Data Akademik', icon: GraduationCap },
                { to: '/files', label: 'File Management', icon: FileBarChart },
                { to: '/integrasi', label: 'Integrasi', icon: CheckCircle2 },
                { to: '/laporan', label: 'Laporan', icon: TrendingUp },
              ].map(q => (
                <Link key={q.to} to={q.to} className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 p-3 text-center transition hover:border-indigo-300 hover:bg-indigo-50/50">
                  <q.icon className="h-5 w-5 text-indigo-600" />
                  <span className="text-[11px] font-bold text-slate-700">{q.label}</span>
                </Link>
              ))}
            </div>
          </Card>
          <div className="rounded-2xl bg-slate-950 p-5 text-white">
            <p className="flex items-center gap-2 text-xs font-bold"><Baby className="h-4 w-4 text-indigo-400" /> Portal Orang Tua</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
              {ROLE_LABELS.ortu} dapat memantau nilai, presensi, tugas, dan catatan guru untuk beberapa anak sekaligus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
