"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface AvailableTemplate {
  id: string;
  title: string;
  stage: string;
}

export function AddTaskForms({
  businessId,
  availableTemplates,
}: {
  businessId: string;
  availableTemplates: AvailableTemplate[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [templateId, setTemplateId] = useState(availableTemplates[0]?.id ?? "");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState("PASSION");
  const [category, setCategory] = useState("");

  async function assignTemplate(e: FormEvent) {
    e.preventDefault();
    if (!templateId) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/facilitator/roadmap/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "assign", businessId, taskTemplateId: templateId }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  async function addCustom(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/facilitator/roadmap/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "custom",
        businessId,
        title,
        description,
        stage,
        category: category || "Custom",
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    setTitle("");
    setDescription("");
    setCategory("");
    router.refresh();
  }

  return (
    <Tabs defaultValue="assign">
      <TabsList>
        <TabsTrigger value="assign">Assign Library Task</TabsTrigger>
        <TabsTrigger value="custom">Add Custom Task</TabsTrigger>
      </TabsList>

      {error && (
        <Alert variant="danger" className="mt-4">
          {error}
        </Alert>
      )}

      <TabsContent value="assign">
        {availableTemplates.length === 0 ? (
          <p className="text-sm text-foreground-muted">Every library task is already on this roadmap.</p>
        ) : (
          <form onSubmit={assignTemplate} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px]">
              <Label>Task</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title} ({t.stage})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? "Adding…" : "Assign Task"}
            </Button>
          </form>
        )}
      </TabsContent>

      <TabsContent value="custom">
        <form onSubmit={addCustom} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="custom-title">Title</Label>
            <Input id="custom-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="custom-description">Description</Label>
            <Textarea
              id="custom-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Stage</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PASSION">Passion</SelectItem>
                  <SelectItem value="POWER">Power</SelectItem>
                  <SelectItem value="LEGACY">Legacy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="custom-category">Category</Label>
              <Input
                id="custom-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Special Project"
              />
            </div>
          </div>
          <Button type="submit" disabled={busy} className="self-start">
            {busy ? "Adding…" : "Add Custom Task"}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
