import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const OPPORTUNITY_TYPES = ["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT", "FREELANCE"];

const parseStringArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const parseProjects = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((project) => {
    if (typeof project === "string") {
      return { name: project, description: "", githubLink: "", websiteLink: "" };
    }
    return {
      name: project?.name || "",
      description: project?.description || "",
      githubLink: project?.githubLink || "",
      websiteLink: project?.websiteLink || "",
    };
  });
};

export default function JobsProfileOnboarding({ profile, onSubmit, onSkip, saving }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => ({
    skills: parseStringArray(profile?.skills),
    rolePreferences: parseStringArray(profile?.rolePreferences),
    opportunityPreferences: parseStringArray(profile?.opportunityPreferences),
    preferredLocations: parseStringArray(profile?.preferredLocations),
    linkedInUrl: profile?.linkedInUrl || "",
    portfolioUrl: profile?.portfolioUrl || "",
    githubUrl: profile?.githubUrl || "",
    workPreference: profile?.workPreference || "Remote",
    projects: parseProjects(profile?.projects),
    resumeFileName: profile?.resumeFileName || "",
    resumeFileType: profile?.resumeFileType || "",
    resumeFileSize: profile?.resumeFileSize || 0,
    resumeBase64: profile?.resumeBase64 || "",
  }));
  const [skillInput, setSkillInput] = useState("");
  const [roleInput, setRoleInput] = useState("");
  const [locationInput, setLocationInput] = useState("");

  const completion = useMemo(() => {
    const checks = [
      Boolean(draft.resumeBase64 || draft.resumeFileName),
      draft.skills.length > 0,
      draft.rolePreferences.length > 0,
      draft.opportunityPreferences.length > 0,
      draft.preferredLocations.length > 0,
      Boolean(draft.portfolioUrl),
      Boolean(draft.githubUrl),
      draft.projects.length > 0,
    ];
    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  }, [draft]);

  const addArrayItem = (key, value, setter) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setDraft((prev) => {
      if (prev[key].includes(trimmed)) return prev;
      return { ...prev, [key]: [...prev[key], trimmed] };
    });
    setter("");
  };

  const removeArrayItem = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: prev[key].filter((item) => item !== value) }));
  };

  const handleResume = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result || "").toString().split(",")[1] || "";
      setDraft((prev) => ({
        ...prev,
        resumeFileName: file.name,
        resumeFileType: file.type,
        resumeFileSize: file.size,
        resumeBase64: base64,
      }));
    };
    reader.readAsDataURL(file);
  };

  const addProject = () => {
    setDraft((prev) => ({
      ...prev,
      projects: [...prev.projects, { name: "", description: "", githubLink: "", websiteLink: "" }],
    }));
  };

  const updateProject = (index, field, value) => {
    setDraft((prev) => {
      const updated = [...prev.projects];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, projects: updated };
    });
  };

  const removeProject = (index) => {
    setDraft((prev) => ({ ...prev, projects: prev.projects.filter((_, i) => i !== index) }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Complete your Jobs profile</h2>
              <p className="mt-1 text-sm text-gray-600">
                First time in Jobs: add key details once, then apply faster.
              </p>
            </div>
            <div className="h-16 w-16 rounded-full bg-white border-4 border-blue-200 flex items-center justify-center">
              <span className="text-sm font-bold text-blue-700">{completion}%</span>
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(draft);
          }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-8 space-y-6"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Resume</label>
            <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => handleResume(e.target.files?.[0])} />
            {draft.resumeFileName && <p className="text-xs text-gray-600 mt-1">Uploaded: {draft.resumeFileName}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Skills</label>
            <div className="flex gap-2">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Add a skill"
              />
              <button type="button" onClick={() => addArrayItem("skills", skillInput, setSkillInput)} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm">
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {draft.skills.map((skill) => (
                <button type="button" key={skill} onClick={() => removeArrayItem("skills", skill)} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-200">
                  {skill} ×
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Desired role / roles</label>
            <div className="flex gap-2">
              <input
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Add role preference"
              />
              <button type="button" onClick={() => addArrayItem("rolePreferences", roleInput, setRoleInput)} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm">
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {draft.rolePreferences.map((role) => (
                <button type="button" key={role} onClick={() => removeArrayItem("rolePreferences", role)} className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs border border-indigo-200">
                  {role} ×
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Opportunity type</label>
            <div className="flex flex-wrap gap-2">
              {OPPORTUNITY_TYPES.map((type) => {
                const selected = draft.opportunityPreferences.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        opportunityPreferences: selected
                          ? prev.opportunityPreferences.filter((item) => item !== type)
                          : [...prev.opportunityPreferences, type],
                      }))
                    }
                    className={`px-3 py-1.5 rounded-full text-xs border ${selected ? "bg-green-50 text-green-700 border-green-300" : "bg-white text-gray-700 border-gray-300"}`}
                  >
                    {type.replace("_", " ")}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Location preference</label>
            <div className="flex gap-2">
              <input
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Add preferred location"
              />
              <button type="button" onClick={() => addArrayItem("preferredLocations", locationInput, setLocationInput)} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm">
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {draft.preferredLocations.map((location) => (
                <button type="button" key={location} onClick={() => removeArrayItem("preferredLocations", location)} className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs border border-purple-200">
                  {location} ×
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Portfolio link</label>
              <input
                value={draft.portfolioUrl}
                onChange={(e) => setDraft((prev) => ({ ...prev, portfolioUrl: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="https://yourportfolio.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">GitHub link</label>
              <input
                value={draft.githubUrl}
                onChange={(e) => setDraft((prev) => ({ ...prev, githubUrl: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="https://github.com/username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">LinkedIn link</label>
            <input
              value={draft.linkedInUrl}
              onChange={(e) => setDraft((prev) => ({ ...prev, linkedInUrl: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="https://linkedin.com/in/username"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700">Projects</label>
              <button type="button" onClick={addProject} className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs">
                Add project
              </button>
            </div>
            {draft.projects.length === 0 && <p className="text-xs text-gray-500">No projects added yet.</p>}
            <div className="space-y-3">
              {draft.projects.map((project, index) => (
                <div key={index} className="rounded-xl border border-gray-200 p-3 space-y-2">
                  <input
                    value={project.name}
                    onChange={(e) => updateProject(index, "name", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Project name"
                  />
                  <textarea
                    value={project.description}
                    onChange={(e) => updateProject(index, "description", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Project description"
                    rows={3}
                  />
                  <input
                    value={project.githubLink}
                    onChange={(e) => updateProject(index, "githubLink", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Project GitHub link"
                  />
                  <button type="button" onClick={() => removeProject(index)} className="text-xs text-red-600">
                    Remove project
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? "Saving..." : "Save & Continue"}
            </button>
            <button type="button" onClick={onSkip} className="rounded-lg border border-gray-300 px-5 py-2.5 text-gray-700 text-sm font-semibold">
              Skip for now
            </button>
            <button type="button" onClick={() => navigate("/build-profile")} className="rounded-lg border border-blue-300 px-5 py-2.5 text-blue-700 text-sm font-semibold">
              Edit full profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
