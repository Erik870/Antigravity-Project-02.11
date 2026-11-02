"use client";

import React, { useState, useRef } from "react";
import type { CvProfile, AnalyzeResponse, JobSearchResponse, HardSkill, SoftSkill } from "@/lib/types";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [profile, setProfile] = useState<CvProfile | null>(null);
  const [droppedSkills, setDroppedSkills] = useState<{ skill: string; reason: string }[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Job search state
  const [isSearchingJobs, setIsSearchingJobs] = useState(false);
  const [jobsData, setJobsData] = useState<JobSearchResponse | null>(null);
  const [newSkillText, setNewSkillText] = useState("");
  const [newSkillType, setNewSkillType] = useState<"hard" | "soft">("hard");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a CV file (PDF or DOCX).");
      return;
    }

    setIsUploading(true);
    setError(null);
    setProfile(null);
    setJobsData(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/cv/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze CV.");
      }

      const resData = data as AnalyzeResponse;
      setProfile(resData.profile);
      setDroppedSkills(resData.droppedSkills || []);
      setWarnings(resData.warnings || []);

      // Auto-trigger job search
      triggerJobSearch(resData.profile);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsUploading(false);
    }
  };

  const triggerJobSearch = async (currentProfile: CvProfile) => {
    setIsSearchingJobs(true);
    try {
      const payload = {
        titles: currentProfile.suggestedJobTitles,
        skills: currentProfile.hardSkills.map((s) => s.skill),
        keywords: currentProfile.searchKeywords,
        location: currentProfile.location,
      };

      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Could not fetch jobs");
      const jobsRes = await res.json();
      setJobsData(jobsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingJobs(false);
    }
  };

  // Skill management (user edit)
  const removeHardSkill = (index: number) => {
    if (!profile) return;
    const updated = {
      ...profile,
      hardSkills: profile.hardSkills.filter((_, i) => i !== index),
    };
    setProfile(updated);
  };

  const removeSoftSkill = (index: number) => {
    if (!profile) return;
    const updated = {
      ...profile,
      softSkills: profile.softSkills.filter((_, i) => i !== index),
    };
    setProfile(updated);
  };

  const addSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newSkillText.trim()) return;

    if (newSkillType === "hard") {
      const newSkill: HardSkill = {
        skill: newSkillText.trim(),
        level: "intermediate",
        evidence: "Added manually by candidate",
        source: "user",
      };
      setProfile({ ...profile, hardSkills: [...profile.hardSkills, newSkill] });
    } else {
      const newSkill: SoftSkill = {
        skill: newSkillText.trim(),
        evidence: "Added manually by candidate",
        source: "user",
      };
      setProfile({ ...profile, softSkills: [...profile.softSkills, newSkill] });
    }

    setNewSkillText("");
  };

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8">
      {/* Navigation / Header */}
      <header className="flex justify-between items-center mb-8 border-b border-[#163300]/10 pb-4 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#163300] flex items-center justify-center text-[#9fe870] font-black text-xl">
            T
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#163300]">TALIO</h1>
            <p className="text-xs text-[#6a6c6a]">Intelligence meets opportunity</p>
          </div>
        </div>
        <div className="flex gap-2">
          {profile && (
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-[#ffffff] border border-[#163300] text-[#163300] rounded-full text-xs font-semibold hover:bg-gray-50 transition"
            >
              Print / Save PDF
            </button>
          )}
        </div>
      </header>

      {/* Upload Screen (if no profile yet) */}
      {!profile && (
        <section className="bg-white rounded-2xl p-6 sm:p-10 shadow-sm border border-gray-200/80 mb-8 max-w-2xl mx-auto text-center">
          <div className="inline-block px-3 py-1 bg-[#e2f6d5] text-[#163300] text-xs font-semibold rounded-full mb-4">
            TALIO LITE MVP
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#163300] mb-3">
            Upload your CV. Reveal your true skills.
          </h2>
          <p className="text-sm text-[#6a6c6a] mb-6 max-w-md mx-auto">
            Extract verified hard and soft skills with evidence quotes, generate a simplified CV, and instantly discover open vacancies.
          </p>

          <form onSubmit={handleUpload} className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#163300]/30 hover:border-[#163300] rounded-xl p-8 cursor-pointer transition bg-[#e8ebe6]/40 flex flex-col items-center justify-center gap-2"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx,.txt"
                className="hidden"
              />
              <svg className="w-10 h-10 text-[#163300]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div className="text-sm font-semibold text-[#163300]">
                {file ? file.name : "Click to select CV (PDF or DOCX)"}
              </div>
              <span className="text-xs text-[#868685]">Max 5 MB · Text-based PDF or Word document</span>
            </div>

            {error && (
              <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading || !file}
              className="w-full py-3 px-6 bg-[#9fe870] hover:bg-[#8de05a] text-[#163300] font-bold rounded-full text-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex justify-center items-center gap-2"
            >
              {isUploading ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-[#163300] border-t-transparent rounded-full" />
                  Analyzing with Gemini AI...
                </>
              ) : (
                "Analyse CV & Find Jobs"
              )}
            </button>
          </form>
        </section>
      )}

      {/* Profile & Results View */}
      {profile && (
        <div className="space-y-8">
          {/* Alerts / Warnings */}
          {warnings.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-1 no-print">
              {warnings.map((w, idx) => (
                <p key={idx}>⚠️ {w}</p>
              ))}
            </div>
          )}

          {/* SIMPLIFIED CV CARD */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm print-card">
            <div className="border-b border-gray-200 pb-6 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <h2 className="text-2xl font-black text-[#163300]">{profile.name || "Candidate Profile"}</h2>
                  <p className="text-sm font-semibold text-[#6a6c6a]">{profile.headline || "Professional"}</p>
                  <p className="text-xs text-[#868685] mt-1">{profile.location || "Location not specified"}</p>
                </div>
                <button
                  onClick={() => {
                    setProfile(null);
                    setFile(null);
                  }}
                  className="no-print px-3 py-1.5 text-xs text-[#163300] hover:underline"
                >
                  ← Upload another CV
                </button>
              </div>
              {profile.summary && (
                <p className="mt-4 text-xs sm:text-sm text-[#454745] leading-relaxed bg-[#e8ebe6]/40 p-3 rounded-lg border border-gray-200/50">
                  {profile.summary}
                </p>
              )}
            </div>

            {/* HARD SKILLS */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold tracking-wide uppercase text-[#163300] flex items-center gap-2">
                  <span>Hard Skills</span>
                  <span className="text-xs font-normal lowercase bg-[#163300] text-[#9fe870] px-2 py-0.5 rounded-full">
                    {profile.hardSkills.length} verified
                  </span>
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.hardSkills.map((skill, idx) => (
                  <div
                    key={idx}
                    className="group relative inline-flex items-center gap-1.5 bg-[#e2f6d5] border border-[#9fe870]/60 px-3 py-1 rounded-full text-xs font-medium text-[#163300]"
                    title={`Evidence: "${skill.evidence}"`}
                  >
                    <span>{skill.skill}</span>
                    {skill.level && (
                      <span className="text-[10px] text-gray-500 capitalize">({skill.level})</span>
                    )}
                    <button
                      onClick={() => removeHardSkill(idx)}
                      className="no-print text-gray-400 hover:text-red-600 font-bold ml-1 text-sm leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* SOFT SKILLS */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold tracking-wide uppercase text-[#163300] flex items-center gap-2">
                  <span>Soft Skills</span>
                  <span className="text-xs font-normal lowercase bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                    Action-proven
                  </span>
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.softSkills.map((skill, idx) => (
                  <div
                    key={idx}
                    className="group relative inline-flex items-center gap-1.5 bg-[#e8ebe6] border border-gray-300 px-3 py-1 rounded-full text-xs font-medium text-[#163300]"
                    title={`Evidence: "${skill.evidence}"`}
                  >
                    <span>{skill.skill}</span>
                    <button
                      onClick={() => removeSoftSkill(idx)}
                      className="no-print text-gray-400 hover:text-red-600 font-bold ml-1 text-sm leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Skill form */}
            <form onSubmit={addSkill} className="no-print flex gap-2 items-center pt-2 border-t border-gray-100">
              <input
                type="text"
                placeholder="Add missing skill..."
                value={newSkillText}
                onChange={(e) => setNewSkillText(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-full focus:outline-none focus:border-[#163300]"
              />
              <select
                value={newSkillType}
                onChange={(e) => setNewSkillType(e.target.value as "hard" | "soft")}
                className="text-xs border border-gray-300 rounded-full px-2 py-1.5 bg-white text-gray-700"
              >
                <option value="hard">Hard Skill</option>
                <option value="soft">Soft Skill</option>
              </select>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#163300] text-white rounded-full text-xs font-semibold hover:bg-[#054d28] transition"
              >
                + Add
              </button>
            </form>

            {/* EXPERIENCE & EDUCATION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-200">
              <div>
                <h4 className="text-xs font-bold uppercase text-[#163300] mb-3">Experience</h4>
                <div className="space-y-3">
                  {profile.experience.map((exp, idx) => (
                    <div key={idx} className="text-xs border-l-2 border-[#163300]/30 pl-3">
                      <div className="font-bold text-[#163300]">{exp.role}</div>
                      <div className="text-gray-600">{exp.company} ({exp.from || "?"} - {exp.to || "Present"})</div>
                      {exp.highlights?.length > 0 && (
                        <ul className="list-disc list-inside text-gray-500 mt-1 space-y-0.5">
                          {exp.highlights.map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase text-[#163300] mb-3">Education & Languages</h4>
                <div className="space-y-3 text-xs">
                  {profile.education.map((edu, idx) => (
                    <div key={idx} className="border-l-2 border-gray-300 pl-3">
                      <div className="font-bold text-[#163300]">{edu.title}</div>
                      <div className="text-gray-600">{edu.institution} {edu.year && `(${edu.year})`}</div>
                    </div>
                  ))}
                  <div className="pt-2">
                    <span className="font-semibold text-gray-700">Languages: </span>
                    {profile.languages.map((l) => `${l.language} (${l.level || "fluent"})`).join(", ")}
                  </div>
                </div>
              </div>
            </div>

            {/* DROPPED SKILLS AUDIT */}
            {droppedSkills.length > 0 && (
              <div className="no-print mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                <span className="font-bold text-gray-700">Audit & Integrity Guard:</span>
                <p className="text-gray-500 mt-1">
                  The AI suggested {droppedSkills.length} skills that were <b>dropped</b> because exact evidence quotes could not be verified in the CV:
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {droppedSkills.map((d, i) => (
                    <span key={i} className="line-through text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-200" title={d.reason}>
                      {d.skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* MATCHING JOBS SECTION */}
          <section className="no-print space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-xl font-extrabold text-[#163300]">Matching Job Vacancies</h3>
                <p className="text-xs text-gray-600">
                  Ranked by matching your verified skills & keywords
                </p>
              </div>
              <button
                onClick={() => triggerJobSearch(profile)}
                disabled={isSearchingJobs}
                className="px-3 py-1.5 bg-[#ffffff] border border-gray-300 hover:border-[#163300] rounded-full text-xs font-semibold text-[#163300] transition"
              >
                {isSearchingJobs ? "Refreshing..." : "↻ Refresh Jobs"}
              </button>
            </div>

            {/* Recruiter Deep Links */}
            {jobsData?.links && (
              <div className="bg-[#163300] p-4 rounded-xl text-white flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-bold text-[#9fe870]">Direct Portal Search:</span> Click to view live postings for your roles on top platforms:
                </div>
                <div className="flex flex-wrap gap-2">
                  {jobsData.links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-white/10 hover:bg-[#9fe870] hover:text-[#163300] text-xs font-semibold rounded-full transition"
                    >
                      {link.label} ↗
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Jobs List */}
            {isSearchingJobs ? (
              <div className="bg-white p-8 rounded-xl border border-gray-200 text-center">
                <span className="animate-spin inline-block w-6 h-6 border-2 border-[#163300] border-t-transparent rounded-full mb-2" />
                <p className="text-xs text-gray-600">Searching live job boards...</p>
              </div>
            ) : jobsData && jobsData.jobs.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {jobsData.jobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white p-5 rounded-xl border border-gray-200/90 hover:border-[#9fe870] shadow-sm transition flex flex-col sm:flex-row justify-between items-start gap-4"
                  >
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-[#e2f6d5] text-[#163300] font-bold text-[10px] rounded-full">
                          {job.score}% MATCH
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{job.source}</span>
                      </div>
                      <h4 className="text-base font-bold text-[#163300]">{job.title}</h4>
                      <p className="text-xs text-gray-600">
                        {job.company} · {job.location} {job.remote && "(Remote)"}
                      </p>

                      {job.matchedSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          <span className="text-[10px] text-gray-400 self-center mr-1">Matched skills:</span>
                          {job.matchedSkills.map((sk, i) => (
                            <span key={i} className="text-[10px] bg-[#e8ebe6] text-[#163300] px-2 py-0.5 rounded-full font-medium">
                              ✓ {sk}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-gray-500 line-clamp-2 pt-1">{job.description}</p>
                    </div>

                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="self-start sm:self-center px-4 py-2 bg-[#163300] hover:bg-[#054d28] text-[#9fe870] font-semibold text-xs rounded-full transition whitespace-nowrap"
                    >
                      Apply / View ↗
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-xs text-gray-500">
                No automatic job board matches found for this specific title. Use the direct portal links above to search live on LinkedIn, Indeed, and CV.lv.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
