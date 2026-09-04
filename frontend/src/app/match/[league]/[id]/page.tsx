import Link from 'next/link';
import { ArrowLeft, Calendar } from 'lucide-react';

export default function LegacyMatchRedirectPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 mb-1">
        <Calendar className="w-6 h-6" />
      </div>
      <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
        Halaman Pertandingan Telah Diperbarui
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Format tautan pertandingan lama telah dialihkan ke sistem data baru. Silakan pilih pertandingan dari jadwal lengkap.
      </p>
      <Link
        href="/fixtures"
        className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition shadow-xs"
      >
        <ArrowLeft className="w-4 h-4" />
        Buka Jadwal Pertandingan
      </Link>
    </div>
  );
}
