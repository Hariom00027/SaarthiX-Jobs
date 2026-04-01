/**
 * Maps industry UI format labels (HackathonForm) to allowed file extensions.
 * PPT = slide decks only (not PDF) when PPT alone is selected.
 */
const LINK_LABELS = new Set(["Repository Link", "Website Link", "Google Drive Link"]);

const FORMAT_EXTENSIONS = {
  PDF: [".pdf"],
  PPT: [".ppt", ".pptx"],
  DOC: [".doc", ".docx", ".txt"],
  Video: [".mp4", ".avi", ".mov", ".mkv", ".webm"],
  "ZIP File": [".zip", ".rar", ".7z", ".tar", ".gz"],
};

const LEGACY_LOWER_EXT = {
  image: [".jpg", ".jpeg", ".png", ".gif"],
};

function extensionsForLabel(label) {
  if (!label) return [];
  if (FORMAT_EXTENSIONS[label]) return FORMAT_EXTENSIONS[label];
  const low = String(label).toLowerCase();
  if (LEGACY_LOWER_EXT[low]) return LEGACY_LOWER_EXT[low];
  return [];
}

/** Legacy single-key uploadFormat from older clients */
const LEGACY_UPLOAD_FORMAT = {
  document: ["PDF", "DOC"],
  presentation: ["PPT"],
  video: ["Video"],
  image: [".jpg"], // not used as label; map to common image ext via synthetic
  code: ["ZIP File", "Repository Link"],
  any: ["PDF", "PPT", "DOC", "Video", "ZIP File", "Repository Link", "Website Link"],
  link: ["Website Link"],
};

export function parsePhaseFormatLabels(phase) {
  if (!phase) return [];
  let labels = [];
  if (Array.isArray(phase.formats) && phase.formats.length) {
    labels = phase.formats.map((f) => String(f).trim()).filter(Boolean);
  } else if (phase.uploadFormat) {
    labels = String(phase.uploadFormat)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (labels.length === 1) {
    const key = labels[0].toLowerCase();
    if (LEGACY_UPLOAD_FORMAT[key]) {
      return [...LEGACY_UPLOAD_FORMAT[key]];
    }
  }
  return labels;
}

/**
 * @param {string[]} formatLabels
 */
export function phaseSubmissionRules(formatLabels) {
  const labels = formatLabels || [];
  const fileLabels = labels.filter((l) => extensionsForLabel(l).length > 0);
  const linkLabels = labels.filter((l) => LINK_LABELS.has(l));
  const needsFile = fileLabels.length > 0;
  const needsLink = linkLabels.length > 0;
  const allExtensions = [
    ...new Set(fileLabels.flatMap((l) => extensionsForLabel(l))),
  ];
  const acceptAttr = allExtensions.length ? allExtensions.join(",") : "*";
  const summary =
    labels.length === 0
      ? "No formats configured"
      : labels.join(", ");
  return {
    needsFile,
    needsLink,
    allExtensions,
    acceptAttr,
    labels,
    summary,
  };
}

export function fileMatchesAllowedExtensions(fileName, allExtensions) {
  if (!fileName || !allExtensions?.length) return false;
  const lower = fileName.toLowerCase();
  const ext = "." + lower.split(".").pop();
  return allExtensions.some((a) => a.toLowerCase() === ext);
}

export function describeAllowedFormatsForUi(formatLabels) {
  const { allExtensions, needsLink, labels } = phaseSubmissionRules(formatLabels);
  const parts = [];
  if (allExtensions.length) {
    parts.push(
      `Files: ${allExtensions.map((e) => e.replace(".", "").toUpperCase()).join(", ")}`
    );
  }
  if (needsLink) {
    parts.push(`Link required (${labels.filter((l) => LINK_LABELS.has(l)).join(", ")})`);
  }
  return parts.length ? parts.join(" · ") : labels.join(", ") || "Any";
}
