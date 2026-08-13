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

export function ResourceForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [stage, setStage] = useState("none");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/admin/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        url,
        category,
        stage: stage === "none" ? undefined : stage,
      }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    setTitle("");
    setUrl("");
    setCategory("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      {error && (
        <Alert variant="danger" className="w-full">
          {error}
        </Alert>
      )}
      <div className="min-w-[180px] flex-1">
        <Label htmlFor="res-title">Title</Label>
        <Input id="res-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="min-w-[180px] flex-1">
        <Label htmlFor="res-url">URL</Label>
        <Input id="res-url" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      <div className="min-w-[140px]">
        <Label htmlFor="res-category">Category</Label>
        <Input id="res-category" value={category} onChange={(e) => setCategory(e.target.value)} />
      </div>
      <div className="min-w-[140px]">
        <Label>Stage</Label>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Any</SelectItem>
            <SelectItem value="PASSION">Passion</SelectItem>
            <SelectItem value="POWER">Power</SelectItem>
            <SelectItem value="LEGACY">Legacy</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting ? "Adding…" : "Add Resource"}
      </Button>
    </form>
  );
}
