import { deepClone, defaultContent } from "./default-content.js";

const sectionFiles = {
  site: "site.json",
  projects: "projects.json",
  skills: "skills.json",
  experience: "experience.json",
};

async function fetchSection(section) {
  try {
    const response = await fetch(`/data/${sectionFiles[section]}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to load ${section}`);
    }

    return await response.json();
  } catch (_error) {
    return deepClone(defaultContent[section]);
  }
}

export async function loadContent() {
  const [site, projects, skills, experience] = await Promise.all([
    fetchSection("site"),
    fetchSection("projects"),
    fetchSection("skills"),
    fetchSection("experience"),
  ]);

  return {
    site,
    projects,
    skills,
    experience,
  };
}
