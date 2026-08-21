import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Target, Flag, Route, BookOpen, Info } from 'lucide-react';
import { CURRICULUM, getMapel, getCourse, getClass } from '../lib/data';
import { cn } from '../lib/utils';
import { Badge, Card, PageHeader } from '../components/ui';

export default function Kurikulum() {
  const [open, setOpen] = useState<Record<string, boolean>>({ cp1: true, 'tp-cp1': true });
  const toggle = (k: string) => setOpen(o => ({ ...o, [k]: !o[k] }));

  return (
    <div>
      <PageHeader
        title="Kurikulum — CP · TP · ATP"
        desc="Struktur Capaian Pembelajaran → Tujuan Pembelajaran → Alur Tujuan Pembelajaran, dengan tautan opsional ke Course/Materi/Bank Soal"
      />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
        <p className="text-xs leading-relaxed text-sky-800">
          Struktur mengikuti Kurikulum Merdeka: <b>CP</b> (Capaian Pembelajaran per elemen) diturunkan menjadi <b>TP</b> (Tujuan Pembelajaran),
          lalu diurutkan menjadi <b>ATP</b> (Alur Tujuan Pembelajaran). Setiap ATP dapat ditautkan ke Course, Materi, atau Bank Soal
          agar guru mudah memetakan asesmen terhadap kompetensi.
        </p>
      </div>

      <div className="space-y-4">
        {CURRICULUM.map(cp => {
          const m = getMapel(cp.mapelId);
          const cpOpen = open[cp.id];
          return (
            <Card key={cp.id} pad={false} className="overflow-hidden">
              <button onClick={() => toggle(cp.id)} className="flex w-full items-start gap-4 p-5 text-left transition hover:bg-slate-50/60">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: m.color }}>
                  <Target className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color="indigo">CP</Badge>
                    <span className="text-sm font-bold text-slate-900">{m.name} · {cp.elemen}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{cp.text}</p>
                </div>
                {cpOpen ? <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-slate-400" /> : <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400" />}
              </button>

              {cpOpen && (
                <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-4">
                  {cp.tp.map(tp => {
                    const key = `${tp.id}-${cp.id}`;
                    const tpOpen = open[key];
                    return (
                      <div key={tp.id} className="mb-3 last:mb-0">
                        <button onClick={() => toggle(key)} className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left shadow-sm transition hover:shadow">
                          <Flag className="h-4 w-4 shrink-0 text-violet-500" />
                          <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">{tp.code}</span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{tp.text}</span>
                          {tpOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                        </button>
                        {tpOpen && (
                          <div className="ml-6 mt-2 space-y-2 border-l-2 border-violet-200 pl-4">
                            {tp.atp.map(atp => (
                              <div key={atp.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-white p-3">
                                <Route className="h-4 w-4 shrink-0 text-emerald-500" />
                                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{atp.code}</span>
                                <span className="text-xs text-slate-700">{atp.text}</span>
                                {atp.courseId && (
                                  <Link
                                    to={`/courses/${atp.courseId}`}
                                    className={cn('ml-auto inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100')}
                                  >
                                    <BookOpen className="h-3 w-3" />
                                    {getMapel(getCourse(atp.courseId).mapelId).name} · {getClass(getCourse(atp.courseId).classId).name}
                                  </Link>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
