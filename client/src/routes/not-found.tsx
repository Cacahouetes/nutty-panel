import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold text-slate-100">404</h1>
      <p className="text-slate-400">Cette page n'existe pas.</p>
      <Link to="/" className="text-emerald-500 hover:underline">
        Retour au dashboard
      </Link>
    </main>
  )
}

export default NotFoundPage