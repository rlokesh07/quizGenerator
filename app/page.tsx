import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Quiz Generator</h1>
          <p className="text-muted-foreground">Create and share interactive quizzes powered by AI.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">API Reference</CardTitle>
            <CardDescription>The API is running. Use the endpoints below to create and access quizzes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge>POST</Badge>
                <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">/api/quiz</code>
              </div>
              <p className="text-sm text-muted-foreground pl-1">Generate a new quiz from a topic or document.</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">GET</Badge>
                <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">/quiz/&lt;id&gt;</code>
              </div>
              <p className="text-sm text-muted-foreground pl-1">Share a quiz with a generated link.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
