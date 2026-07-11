"use client";

import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; key: string; email: string }
  | { status: "error"; message: string };

export default function LoginPage() {
  const [state, setState] = useState<State>({ status: "idle" });

  async function handleGoogleSignIn() {
    setState({ status: "loading" });
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const res = await fetch("/api/auth/create-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Failed to create API key." });
        return;
      }

      setState({ status: "done", key: data.key, email: data.email });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setState({ status: "error", message });
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Get an API Key</h1>
          <p className="text-muted-foreground">Sign in with Google to generate your personal API key.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>
              We&apos;ll create an API key tied to your Google account email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {state.status !== "done" && (
              <Button
                onClick={handleGoogleSignIn}
                disabled={state.status === "loading"}
                className="w-full"
              >
                {state.status === "loading" ? (
                  "Signing in…"
                ) : (
                  <>
                    <GoogleIcon />
                    Sign in with Google
                  </>
                )}
              </Button>
            )}

            {state.status === "error" && (
              <p className="text-sm text-destructive text-center">{state.message}</p>
            )}

            {state.status === "done" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Signed in as</p>
                  <p className="font-medium">{state.email}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">Your API Key</p>
                    <Badge variant="secondary">Keep this secret</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-muted px-3 py-2 rounded break-all">
                      {state.key}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(state.key)}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This key will not be shown again. Store it somewhere safe.
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">Usage</p>
                  <code className="block text-xs font-mono bg-muted px-3 py-2 rounded">
                    x-api-key: {state.key}
                  </code>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
