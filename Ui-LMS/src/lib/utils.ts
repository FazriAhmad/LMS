import type { GradeRow, ScheduleItem, AttendanceSummary } from './types';

export const cn = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');

export const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export const fmtDateLong = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

export function fmtCountdown(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function gradeLetter(v: number): string {
  if (v >= 90) return 'A';
  if (v >= 80) return 'B';
  if (v >= 70) return 'C';
  return 'D';
}

export function gradeColor(l: string): string {
  switch (l) {
    case 'A': return 'bg-emerald-100 text-emerald-700';
    case 'B': return 'bg-sky-100 text-sky-700';
    case 'C': return 'bg-amber-100 text-amber-700';
    default: return 'bg-rose-100 text-rose-700';
  }
}

export const WEIGHTS = { tugas: 0.25, quiz: 0.25, pts: 0.25, pas: 0.25 };

export function finalScore(g: GradeRow): number {
  return Math.round(g.tugas * WEIGHTS.tugas + g.quiz * WEIGHTS.quiz + g.pts * WEIGHTS.pts + g.pas * WEIGHTS.pas);
}

export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export interface Conflict { a: ScheduleItem; b: ScheduleItem; kind: 'kelas' | 'guru' }

export function detectConflicts(items: ScheduleItem[]): Conflict[] {
  const out: Conflict[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.day !== b.day) continue;
      const overlap = toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
      if (!overlap) continue;
      if (a.classId === b.classId) out.push({ a, b, kind: 'kelas' });
      else if (a.teacherId === b.teacherId) out.push({ a, b, kind: 'guru' });
    }
  }
  return out;
}

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} mnt lalu`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return fmtDate(iso);
}

export function initials(name: string): string {
  return name.replace(/,.*|Ir\.|Dr\.|S\.\w+|M\.Pd/g, '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function attendancePct(a: AttendanceSummary): number {
  const total = a.hadir + a.izin + a.sakit + a.alpa + a.terlambat;
  if (!total) return 0;
  return Math.round(((a.hadir + a.terlambat) / total) * 100);
}

export function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export const isOverdue = (iso: string) => new Date(iso).getTime() < Date.now();
