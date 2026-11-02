import { z } from "zod";

/** Where a skill came from. `cv` = AI-extracted with a verified quote; `user` = added manually by the user. */
export const SkillSource = z.enum(["cv", "user"]);

export const HardSkill = z.object({
  skill: z.string().min(1).max(80),
  level: z.enum(["advanced", "intermediate", "basic"]).nullable(),
  evidence: z.string().max(400),
  source: SkillSource,
});

export const SoftSkill = z.object({
  skill: z.string().min(1).max(80),
  evidence: z.string().max(400),
  source: SkillSource,
});

export const Experience = z.object({
  role: z.string(),
  company: z.string().nullable(),
  from: z.string().nullable(),
  to: z.string().nullable(),
  highlights: z.array(z.string()).max(4),
});

export const Education = z.object({
  title: z.string(),
  institution: z.string().nullable(),
  year: z.string().nullable(),
});

export const Language = z.object({
  language: z.string(),
  level: z.string().nullable(),
});

export const CvProfile = z.object({
  name: z.string().nullable(),
  headline: z.string().nullable(),
  location: z.string().nullable(),
  summary: z.string().nullable(),
  hardSkills: z.array(HardSkill),
  softSkills: z.array(SoftSkill),
  experience: z.array(Experience),
  education: z.array(Education),
  languages: z.array(Language),
  suggestedJobTitles: z.array(z.string()).max(5),
  searchKeywords: z.array(z.string()).max(12),
});

export type HardSkill = z.infer<typeof HardSkill>;
export type SoftSkill = z.infer<typeof SoftSkill>;
export type CvProfile = z.infer<typeof CvProfile>;

/** Response of POST /api/cv/analyze */
export interface AnalyzeResponse {
  profile: CvProfile;
  /** Skills the AI proposed but the server dropped because their evidence was not found in the CV. */
  droppedSkills: { skill: string; reason: string }[];
  /** Non-fatal notices, e.g. suspicious instructions removed from the CV text. */
  warnings: string[];
  meta: { fileName: string; characters: number; model: string };
}

/** Request body of POST /api/jobs/search */
export const JobSearchRequest = z.object({
  titles: z.array(z.string().min(1).max(80)).max(5),
  skills: z.array(z.string().min(1).max(80)).max(40),
  keywords: z.array(z.string().min(1).max(80)).max(12),
  location: z.string().max(120).nullable(),
});
export type JobSearchRequest = z.infer<typeof JobSearchRequest>;

export interface Job {
  id: string;
  source: "Arbeitnow" | "Remotive";
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  tags: string[];
  postedAt: string | null;
  salary: string | null;
  /** Plain-text description (HTML stripped), truncated. */
  description: string;
}

export interface RankedJob extends Job {
  score: number;
  matchedSkills: string[];
}

export interface JobSearchResponse {
  jobs: RankedJob[];
  links: { label: string; url: string }[];
  sources: { name: string; ok: boolean; count: number; error?: string }[];
  query: string;
}
