export default function MissingClerkConfig() {
  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12 text-slate-100">
      <div className="max-w-2xl rounded-[2rem] border border-amber-300/20 bg-slate-950/85 p-8 text-center shadow-[0_25px_60px_rgba(2,6,23,0.45)]">
        <p className="text-sm uppercase tracking-[0.35em] text-amber-300">Config Needed</p>
        <h1 className="display-type mt-4 text-4xl font-semibold tracking-tight text-white">
          Add your Clerk publishable key to continue.
        </h1>
        <p className="mt-5 text-base leading-7 text-slate-300">
          Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> for the Vite client environment, then restart
          the client.
        </p>
      </div>
    </div>
  );
}
