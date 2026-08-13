import "server-only";

import {
  EMPTY_ACCOUNTABILITY,
  EMPTY_ACTION_PLAN,
  EMPTY_BLUEPRINT,
  EMPTY_BUSINESS_MODEL_CANVAS,
  EMPTY_LEGACY,
  EMPTY_MY_STORY,
  EMPTY_MY_WHY,
  EMPTY_RESOURCES,
  accountabilitySectionSchema,
  actionPlanSectionSchema,
  blueprintSectionSchema,
  businessModelCanvasSectionSchema,
  legacySectionSchema,
  myStorySectionSchema,
  myWhySectionSchema,
  parseSection,
  resourcesSectionSchema,
} from "@/lib/validations/vision-board-data";

import type { Next90DaysRow, VisionBoardProfileValues } from "./vision-board-form";

/** Minimal shape this needs from a VisionBoardProfile row — just its Json columns. */
type ProfileJsonColumns = {
  myStory: unknown;
  myWhy: unknown;
  legacy: unknown;
  blueprint: unknown;
  actionPlan: unknown;
  resources: unknown;
  businessModelCanvas: unknown;
  vibes: unknown;
  affirmations: unknown;
  accountability: unknown;
} | null;

const lines = (arr: string[]) => arr.join("\n");

/**
 * Converts a stored `VisionBoardProfile` (or none yet) into the form's
 * flat-string editing state — the inverse of the form's submit-time
 * `toLines`/`toNullable` reshape. Shared by both the member and admin
 * Vision Board Profile pages so the mapping only lives in one place.
 */
export function toFormValues(profile: ProfileJsonColumns): {
  initial: VisionBoardProfileValues;
  initialNext90Days: Next90DaysRow[];
} {
  const myStory = parseSection(myStorySectionSchema, profile?.myStory, EMPTY_MY_STORY);
  const myWhy = parseSection(myWhySectionSchema, profile?.myWhy, EMPTY_MY_WHY);
  const legacy = parseSection(legacySectionSchema, profile?.legacy, EMPTY_LEGACY);
  const blueprint = parseSection(blueprintSectionSchema, profile?.blueprint, EMPTY_BLUEPRINT);
  const actionPlan = parseSection(actionPlanSectionSchema, profile?.actionPlan, EMPTY_ACTION_PLAN);
  const resources = parseSection(resourcesSectionSchema, profile?.resources, EMPTY_RESOURCES);
  const bmc = parseSection(businessModelCanvasSectionSchema, profile?.businessModelCanvas, EMPTY_BUSINESS_MODEL_CANVAS);
  const accountability = parseSection(accountabilitySectionSchema, profile?.accountability, EMPTY_ACCOUNTABILITY);
  const vibes = Array.isArray(profile?.vibes) ? (profile.vibes as string[]) : [];
  const affirmations = Array.isArray(profile?.affirmations) ? (profile.affirmations as string[]) : [];

  return {
    initial: {
      myStoryName: myStory.name ?? "",
      myStoryBusinesses: lines(myStory.businesses),
      myStoryPassionStatement: myStory.passionStatement ?? "",
      myStorySuperpowers: lines(myStory.superpowers),
      myWhyStatement: myWhy.whyStatement ?? "",
      myWhyProblemToSolve: myWhy.problemToSolve ?? "",
      myWhyPeopleToHelp: lines(myWhy.peopleToHelp),
      legacyStatement: legacy.legacyStatement ?? "",
      legacyImpactGroups: lines(legacy.impactGroups),
      blueprintPriorities: lines(blueprint.priorities),
      actionPlanThisWeek: lines(actionPlan.thisWeek),
      actionPlanThisMonth: lines(actionPlan.thisMonth),
      actionPlanFirstStep: actionPlan.firstStep ?? "",
      resourcesHave: lines(resources.have),
      resourcesNeed: lines(resources.need),
      bmcKeyPartners: lines(bmc.keyPartners),
      bmcKeyActivities: lines(bmc.keyActivities),
      bmcValue: lines(bmc.value),
      bmcCustomers: lines(bmc.customers),
      bmcChannels: lines(bmc.channels),
      bmcRevenueStreams: lines(bmc.revenueStreams),
      bmcCostStructure: lines(bmc.costStructure),
      vibes: lines(vibes),
      affirmations: lines(affirmations),
      accountabilityPartnerName: accountability.partnerName ?? "",
      accountabilityPartnerContact: accountability.partnerContact ?? "",
      accountabilityFrequency: accountability.frequency ?? "",
      accountabilityMethod: accountability.method ?? "",
      accountabilityCommitment: accountability.commitment ?? "",
    },
    initialNext90Days: blueprint.next90Days.map((item) => ({
      goal: item.goal,
      actionSteps: lines(item.actionSteps),
    })),
  };
}
