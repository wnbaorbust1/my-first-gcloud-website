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
import { Textarea } from "@/components/ui/textarea";
import type { BusinessModel } from "@/generated/prisma/models/Business";
import {
  ANNUAL_REVENUE_OPTIONS,
  BUSINESS_STAGE_OPTIONS,
  EMPLOYEE_COUNT_OPTIONS,
  HOURS_PER_WEEK_OPTIONS,
  MONTHLY_REVENUE_OPTIONS,
  REGISTRATION_STATUS_OPTIONS,
  WEBSITE_STATUS_OPTIONS,
  YEARS_IN_BUSINESS_OPTIONS,
} from "@/lib/business-options";

type FormState = {
  name: string;
  industry: string;
  description: string;
  website: string;
  location: string;
  businessStage: string;
  yearsInBusiness: string;
  annualRevenueRange: string;
  monthlyRevenueRange: string;
  numberOfEmployees: string;
  primaryProductOrService: string;
  idealCustomer: string;
  primaryChallenge: string;
  primaryGoal: string;
  hoursAvailablePerWeek: string;
  crmUsed: string;
  websiteStatus: string;
  registrationStatus: string;
};

function toFormState(business: BusinessModel | null): FormState {
  return {
    name: business?.name ?? "",
    industry: business?.industry ?? "",
    description: business?.description ?? "",
    website: business?.website ?? "",
    location: business?.location ?? "",
    businessStage: business?.businessStage ?? "",
    yearsInBusiness: business?.yearsInBusiness ?? "",
    annualRevenueRange: business?.annualRevenueRange ?? "",
    monthlyRevenueRange: business?.monthlyRevenueRange ?? "",
    numberOfEmployees: business?.numberOfEmployees ?? "",
    primaryProductOrService: business?.primaryProductOrService ?? "",
    idealCustomer: business?.idealCustomer ?? "",
    primaryChallenge: business?.primaryChallenge ?? "",
    primaryGoal: business?.primaryGoal ?? "",
    hoursAvailablePerWeek: business?.hoursAvailablePerWeek ?? "",
    crmUsed: business?.crmUsed ?? "",
    websiteStatus: business?.websiteStatus ?? "",
    registrationStatus: business?.registrationStatus ?? "",
  };
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Select one (optional)",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function BusinessProfileForm({
  business,
}: {
  business: BusinessModel | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => toFormState(business));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setIsSubmitting(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(data?.error ?? "Something went wrong. Please try again.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {error && <Alert variant="danger">{error}</Alert>}

      <section className="flex flex-col gap-4">
        <div>
          <Label htmlFor="name">Business name</Label>
          <Input
            id="name"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={form.industry}
              onChange={(e) => set("industry", e.target.value)}
              placeholder="e.g. Consulting, E-commerce"
            />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="City, State"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder="https://"
          />
        </div>

        <div>
          <Label htmlFor="description">Business description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-navy-100 pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-400">
          Where you are today
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Business stage"
            value={form.businessStage}
            onChange={(v) => set("businessStage", v)}
            options={BUSINESS_STAGE_OPTIONS}
          />
          <SelectField
            label="Years in business"
            value={form.yearsInBusiness}
            onChange={(v) => set("yearsInBusiness", v)}
            options={YEARS_IN_BUSINESS_OPTIONS}
          />
          <SelectField
            label="Approximate annual revenue"
            value={form.annualRevenueRange}
            onChange={(v) => set("annualRevenueRange", v)}
            options={ANNUAL_REVENUE_OPTIONS}
          />
          <SelectField
            label="Current monthly revenue"
            value={form.monthlyRevenueRange}
            onChange={(v) => set("monthlyRevenueRange", v)}
            options={MONTHLY_REVENUE_OPTIONS}
          />
          <SelectField
            label="Number of employees"
            value={form.numberOfEmployees}
            onChange={(v) => set("numberOfEmployees", v)}
            options={EMPLOYEE_COUNT_OPTIONS}
          />
          <SelectField
            label="Hours available per week"
            value={form.hoursAvailablePerWeek}
            onChange={(v) => set("hoursAvailablePerWeek", v)}
            options={HOURS_PER_WEEK_OPTIONS}
          />
          <SelectField
            label="Website status"
            value={form.websiteStatus}
            onChange={(v) => set("websiteStatus", v)}
            options={WEBSITE_STATUS_OPTIONS}
          />
          <SelectField
            label="Business registration status"
            value={form.registrationStatus}
            onChange={(v) => set("registrationStatus", v)}
            options={REGISTRATION_STATUS_OPTIONS}
          />
        </div>
        <div>
          <Label htmlFor="crmUsed">CRM used</Label>
          <Input
            id="crmUsed"
            value={form.crmUsed}
            onChange={(e) => set("crmUsed", e.target.value)}
            placeholder="e.g. HubSpot, none yet"
          />
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-navy-100 pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-400">
          What you&apos;re building
        </h2>
        <div>
          <Label htmlFor="primaryProductOrService">
            Primary product or service
          </Label>
          <Textarea
            id="primaryProductOrService"
            value={form.primaryProductOrService}
            onChange={(e) => set("primaryProductOrService", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="idealCustomer">Ideal customer</Label>
          <Textarea
            id="idealCustomer"
            value={form.idealCustomer}
            onChange={(e) => set("idealCustomer", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="primaryChallenge">Primary challenge</Label>
          <Textarea
            id="primaryChallenge"
            value={form.primaryChallenge}
            onChange={(e) => set("primaryChallenge", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="primaryGoal">Primary goal</Label>
          <Textarea
            id="primaryGoal"
            value={form.primaryGoal}
            onChange={(e) => set("primaryGoal", e.target.value)}
          />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save Business Profile"}
        </Button>
        {business && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => router.push("/dashboard")}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
