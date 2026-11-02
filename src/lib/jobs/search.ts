import "server-only";
import { normalizeForMatch } from "@/lib/cv/evidence";
import type { Job, JobSearchRequest, RankedJob } from "@/lib/types";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>?/gm, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Fetch jobs from Arbeitnow (Free API, mostly EU / Remote) */
async function fetchArbeitnow(): Promise<Job[]> {
  try {
    const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.data)) return [];

    return data.data.slice(0, 50).map((item: any) => ({
      id: `arbeitnow-${item.slug || Math.random().toString(36).substring(7)}`,
      source: "Arbeitnow" as const,
      title: item.title || "Untitled Role",
      company: item.company_name || "Unknown Company",
      location: item.location || (item.remote ? "Remote" : "Not specified"),
      remote: Boolean(item.remote),
      url: item.url,
      tags: Array.isArray(item.tags) ? item.tags : [],
      postedAt: item.created_at ? new Date(item.created_at * 1000).toISOString() : null,
      salary: null,
      description: stripHtml(item.description || "").slice(0, 1000),
    }));
  } catch (err) {
    console.error("[jobs] Arbeitnow fetch error:", err);
    return [];
  }
}

/** Fetch jobs from Remotive (Free API, Worldwide Remote) */
async function fetchRemotive(searchCategory?: string): Promise<Job[]> {
  try {
    const url = "https://remotive.com/api/remote-jobs?limit=50";
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.jobs)) return [];

    return data.jobs.slice(0, 50).map((item: any) => ({
      id: `remotive-${item.id}`,
      source: "Remotive" as const,
      title: item.title || "Untitled Role",
      company: item.company_name || "Unknown Company",
      location: item.candidate_required_location || "Remote",
      remote: true,
      url: item.url,
      tags: Array.isArray(item.tags) ? item.tags : [],
      postedAt: item.publication_date || null,
      salary: item.salary || null,
      description: stripHtml(item.description || "").slice(0, 1000),
    }));
  } catch (err) {
    console.error("[jobs] Remotive fetch error:", err);
    return [];
  }
}

/**
 * Score and rank jobs based on overlap with candidate's skills, titles, and keywords.
 */
export function rankJobs(jobs: Job[], req: JobSearchRequest): RankedJob[] {
  const normalizedSkills = req.skills.map((s) => ({
    original: s,
    norm: normalizeForMatch(s),
  }));
  const normalizedKeywords = req.keywords.map((k) => normalizeForMatch(k));
  const normalizedTitles = req.titles.map((t) => normalizeForMatch(t));

  const ranked: RankedJob[] = [];

  for (const job of jobs) {
    const content = normalizeForMatch(
      `${job.title} ${job.company} ${job.location} ${job.tags.join(" ")} ${job.description}`
    );
    const matchedSkills: string[] = [];
    let score = 0;

    // Check title matches (high weight)
    for (const title of normalizedTitles) {
      if (title.length > 2 && content.includes(title)) {
        score += 35;
        break;
      }
    }

    // Check skills
    for (const { original, norm } of normalizedSkills) {
      if (norm.length > 2 && content.includes(norm)) {
        matchedSkills.push(original);
        score += 15;
      }
    }

    // Check keywords
    for (const kw of normalizedKeywords) {
      if (kw.length > 2 && content.includes(kw)) {
        score += 5;
      }
    }

    // Boost remote if relevant or local matches
    if (req.location && content.includes(normalizeForMatch(req.location))) {
      score += 20;
    }

    // Normalise score (0 - 100)
    const finalScore = Math.min(100, score);

    // Only include if there is some baseline match or title relevance
    if (finalScore > 10 || matchedSkills.length > 0) {
      ranked.push({
        ...job,
        score: finalScore,
        matchedSkills: Array.from(new Set(matchedSkills)),
      });
    }
  }

  // Sort descending by match score
  return ranked.sort((a, b) => b.score - a.score);
}

/** Generate pre-filled search URLs for popular recruitment portals */
export function generateRecruiterLinks(titles: string[], location?: string | null) {
  const query = encodeURIComponent(titles[0] || "job");
  const loc = encodeURIComponent(location || "");

  return [
    {
      label: "LinkedIn Jobs",
      url: `https://www.linkedin.com/jobs/search/?keywords=${query}${loc ? `&location=${loc}` : ""}`,
    },
    {
      label: "Indeed",
      url: `https://www.indeed.com/jobs?q=${query}${loc ? `&l=${loc}` : ""}`,
    },
    {
      label: "CV.lv (Latvia)",
      url: `https://cv.lv/lv/search?q=${query}`,
    },
    {
      label: "Google Jobs",
      url: `https://www.google.com/search?q=${query}+jobs+${loc}&ibp=htl;jobs`,
    },
  ];
}

export async function searchJobs(req: JobSearchRequest) {
  const [arbeitnowJobs, remotiveJobs] = await Promise.all([
    fetchArbeitnow(),
    fetchRemotive(),
  ]);

  const allJobs = [...arbeitnowJobs, ...remotiveJobs];
  const ranked = rankJobs(allJobs, req);
  const links = generateRecruiterLinks(req.titles, req.location);

  return {
    jobs: ranked.slice(0, 25), // top 25 matches
    links,
    sources: [
      { name: "Arbeitnow", ok: arbeitnowJobs.length > 0, count: arbeitnowJobs.length },
      { name: "Remotive", ok: remotiveJobs.length > 0, count: remotiveJobs.length },
    ],
    query: req.titles.join(", ") || "General",
  };
}
