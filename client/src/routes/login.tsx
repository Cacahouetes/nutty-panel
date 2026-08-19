export function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <form className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-100">
          Connexion
        </h1>
        <label className="mb-2 block text-sm text-slate-400" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          placeholder="admin@example.com"
        />
        <label className="mb-2 block text-sm text-slate-400" htmlFor="password">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          className="mb-6 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          placeholder="••••••••"
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-600 py-2 font-medium text-white transition hover:bg-emerald-500"
        >
          Se connecter
        </button>
      </form>
    </main>
  )
}

export default LoginPage