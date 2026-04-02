import { SignIn, SignUp } from "@clerk/clerk-react";

const authCopy = {
  "sign-in": {
    eyebrow: "Welcome Back",
    title: "Sign in to keep planning with context.",
    description:
      "Authenticate with Clerk to protect your planning workspace and unlock the Travel Nest setup flows.",
  },
  "sign-up": {
    eyebrow: "Create Account",
    title: "Start a secure Travel Nest workspace.",
    description:
      "Create your account first, then the business setup, leisure setup, and itinerary routes will be ready for you.",
  },
};

export default function AuthPage({ mode }) {
  const copy = authCopy[mode];
  const isSignIn = mode === "sign-in";

  return (
    <section className="px-5 py-10 sm:px-8 sm:py-14">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-center">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-[0_25px_60px_rgba(2,6,23,0.35)] backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-slate-400">
            {copy.eyebrow}
          </p>
          <h1 className="display-type mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            {copy.description}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              "Protected trip setup pages",
              "Secure token-based API access",
              "One-click account management",
            ].map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-200"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/[0.78] p-4 shadow-[0_30px_70px_rgba(2,6,23,0.45)] backdrop-blur-xl">
            {isSignIn ? (
              <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                forceRedirectUrl="/mode"
                appearance={{
                  variables: {
                    colorPrimary: "#22d3ee",
                    colorBackground: "#020617",
                    colorInputBackground: "#0f172a",
                    colorInputText: "#e2e8f0",
                    colorText: "#e2e8f0",
                    colorTextSecondary: "#94a3b8",
                    colorDanger: "#f87171",
                    borderRadius: "1rem",
                  },
                }}
              />
            ) : (
              <SignUp
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                forceRedirectUrl="/mode"
                appearance={{
                  variables: {
                    colorPrimary: "#22d3ee",
                    colorBackground: "#020617",
                    colorInputBackground: "#0f172a",
                    colorInputText: "#e2e8f0",
                    colorText: "#e2e8f0",
                    colorTextSecondary: "#94a3b8",
                    colorDanger: "#f87171",
                    borderRadius: "1rem",
                  },
                }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
