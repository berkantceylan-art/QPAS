import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-radial-fade" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-40 mask-fade-y dark:opacity-25" />
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
        404
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
        Sayfa <span className="gradient-text">bulunamadı</span>
      </h1>
      <p className="mt-4 max-w-md text-slate-600 dark:text-slate-400">
        Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.
      </p>
      <Link to="/" className="mt-8">
        <Button>Anasayfaya Dön</Button>
      </Link>
    </div>
  );
}
