"use client";

import { useState } from "react";
import { Copy, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function CreateKeySheet({ onCreate }: { onCreate: (name?: string) => Promise<string> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const key = await onCreate(name.trim() || undefined);
      setCreatedKey(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key.");
    } finally {
      setCreating(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setName("");
      setCreatedKey(null);
      setError(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger render={<Button />}>
        <Plus />
        Create key
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Create a new API key</SheetTitle>
          <SheetDescription>
            {createdKey
              ? "Copy your key now — you won't be able to see it again."
              : "Give it a name so you can recognize it later."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 px-4">
          {!createdKey ? (
            <div className="space-y-1.5">
              <Label htmlFor="key-name">Name (optional)</Label>
              <Input
                id="key-name"
                placeholder="e.g. Production server"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-1.5 rounded-lg bg-muted p-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Your new key</p>
                <Badge variant="secondary">Shown once</Badge>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all font-mono text-xs">{createdKey}</code>
                <Button variant="outline" size="icon-sm" onClick={() => navigator.clipboard.writeText(createdKey)}>
                  <Copy />
                </Button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter>
          {!createdKey ? (
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating…" : "Create key"}
            </Button>
          ) : (
            <SheetClose render={<Button variant="outline" />}>Done</SheetClose>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
