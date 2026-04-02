import { useAuth } from "@clerk/clerk-react";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-5 py-12 sm:px-8">
        <div className="max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-[0_25px_60px_rgba(2,6,23,0.35)] backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-slate-400">
            Loading
          </p>
          <h1 className="display-type mt-4 text-3xl font-semibold tracking-tight text-white">
            Checking your session
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-300">
            Travel Nest is preparing your workspace.
          </p>
        </div>
      </section>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }

  return children;
}
