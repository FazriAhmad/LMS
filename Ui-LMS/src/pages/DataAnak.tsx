import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { Avatar, Card, PageHeader } from '../components/ui';

interface ApiChild {
  student_id: number;
  name: string;
  username: string | null;
  email: string | null;
  nis: string | null;
  gender: string | null;
  class_name: string | null;
  major_name: string | null;
  homeroom_teacher: string | null;
}

const GENDER: Record<string, string> = { L: 'Laki-laki', P: 'Perempuan' };

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 border-b border-slate-100 py-2.5 last:border-0">
      <span className="w-40 shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm text-slate-800">{value || '—'}</span>
    </div>
  );
}

export default function DataAnak() {
  const [children, setChildren] = useState<ApiChild[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ data: ApiChild[] }>('/parent/children')
      .then(res => setChildren(res.data))
      .catch(e => setError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server.'));
  }, []);

  if (error) return <Card className="border-rose-200 bg-rose-50/60"><p className="text-sm font-semibold text-rose-700">{error}</p></Card>;
  if (children === null) return <div className="py-10 text-center text-sm text-slate-400">Memuat data anak…</div>;

  return (
    <div>
      <PageHeader title="Data Anak" desc="Biodata anak yang terhubung dengan akun ini" />

      {children.length === 0 ? (
        <Card><p className="py-8 text-center text-sm text-slate-400">Belum ada data anak yang terhubung ke akun ini. Hubungi admin sekolah untuk menautkan akun.</p></Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {children.map(c => (
            <Card key={c.student_id} pad={false}>
              <div className="flex items-center gap-4 border-b border-slate-100 p-5">
                <Avatar name={c.name} color="#6366f1" size="lg" />
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">
                    {c.class_name ? `Kelas ${c.class_name}` : 'Kelas belum diatur'}{c.nis ? ` · NIS ${c.nis}` : ''}
                  </p>
                </div>
              </div>
              <div className="px-5 py-3">
                <Row label="Nama Lengkap" value={c.name} />
                <Row label="NIS" value={c.nis} />
                <Row label="Jenis Kelamin" value={c.gender ? GENDER[c.gender] ?? c.gender : null} />
                <Row label="Kelas" value={c.class_name} />
                <Row label="Jurusan" value={c.major_name} />
                <Row label="Wali Kelas" value={c.homeroom_teacher} />
                <Row label="Username LMS" value={c.username} />
                <Row label="Email" value={c.email} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
