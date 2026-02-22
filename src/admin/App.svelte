<script>
  import { onMount } from "svelte";
  import { loadContent } from "../lib/content-loader.js";
  import { deepClone, defaultContent } from "../lib/default-content.js";
  import {
    createAuthConfig,
    loadAdminAuth,
    verifyPassword,
  } from "../lib/admin-auth.js";

  const fileNames = {
    site: "site.json",
    projects: "projects.json",
    skills: "skills.json",
    experience: "experience.json",
    auth: "admin-auth.json",
  };

  let baseline = deepClone(defaultContent);
  let site = deepClone(defaultContent.site);
  let projects = deepClone(defaultContent.projects);
  let skills = deepClone(defaultContent.skills);
  let experience = deepClone(defaultContent.experience);
  let authBaseline = null;
  let authConfig = null;

  let dataDirectoryHandle = null;
  let canWriteFiles = false;
  let connectedFolderName = "Not connected";

  let busy = false;
  let authReady = false;
  let authenticated = false;

  let status = "Loading content from /public/data...";
  let loginPassword = "";
  let loginError = "";

  let currentPassword = "";
  let newPassword = "";
  let confirmPassword = "";
  let passwordStatus = "";

  onMount(async () => {
    canWriteFiles =
      typeof window !== "undefined" && "showDirectoryPicker" in window;
    await reloadFromFiles();

    if (!canWriteFiles) {
      status =
        "Content loaded. Browser file-writing is unavailable here, so use download fallback.";
    }
  });

  function deepEqual(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function linesToArray(text) {
    return text
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  function publicationsToLines(items) {
    return (items || []).map((item) => `${item.title} | ${item.url}`).join("\n");
  }

  function linesToPublications(text) {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [title, url] = line.split("|").map((value) => value.trim());
        return {
          title: title || "",
          url: url || "",
        };
      })
      .filter((item) => item.title);
  }

  function getCurrentSection(section) {
    switch (section) {
      case "site":
        return site;
      case "projects":
        return projects;
      case "skills":
        return skills;
      case "experience":
        return experience;
      case "auth":
        return authConfig;
      default:
        return null;
    }
  }

  async function reloadFromFiles() {
    busy = true;
    const [content, auth] = await Promise.all([loadContent(), loadAdminAuth()]);
    const normalizedSite = {
      defaultTheme: "dark",
      headerImageSrc: "",
      headerImageAlt: "Developer profile visual",
      ...content.site,
    };
    const normalizedContent = {
      ...content,
      site: normalizedSite,
    };

    baseline = deepClone(normalizedContent);
    site = deepClone(normalizedSite);
    projects = deepClone(content.projects);
    skills = deepClone(content.skills);
    experience = deepClone(content.experience);
    authBaseline = deepClone(auth);
    authConfig = deepClone(auth);

    authReady = true;
    busy = false;
    status = authenticated
      ? "Loaded latest JSON from /public/data."
      : "Content loaded. Enter password to unlock Portfolio Studio.";
  }

  function resetEdits() {
    site = deepClone(baseline.site);
    projects = deepClone(baseline.projects);
    skills = deepClone(baseline.skills);
    experience = deepClone(baseline.experience);
    authConfig = deepClone(authBaseline);
    passwordStatus = "";
    status = "Unsaved edits were reset.";
  }

  function downloadJson(filename, data) {
    const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function downloadSection(section) {
    const data = getCurrentSection(section);
    if (!data) {
      status = `Could not download ${fileNames[section]}.`;
      return;
    }

    downloadJson(fileNames[section], data);
    status = `Downloaded ${fileNames[section]}.`;
  }

  function downloadChangedFiles() {
    if (!changedSections.length) {
      status = "No changes detected. Nothing to download.";
      return;
    }

    for (const section of changedSections) {
      downloadJson(fileNames[section], getCurrentSection(section));
    }

    status = `Downloaded ${changedFiles.join(", ")}.`;
  }

  async function connectDataFolder() {
    if (!canWriteFiles) {
      status =
        "This browser does not support direct file writes. Use download fallback.";
      return;
    }

    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      const permission = await handle.requestPermission({ mode: "readwrite" });
      if (permission !== "granted") {
        status = "Write permission was denied for the selected folder.";
        return;
      }

      dataDirectoryHandle = handle;
      connectedFolderName = handle.name || "Connected folder";
      status = `Connected data folder: ${connectedFolderName}.`;
    } catch (_error) {
      status = "Folder selection cancelled.";
    }
  }

  async function ensureWritableFolder() {
    if (!canWriteFiles) {
      return false;
    }

    if (!dataDirectoryHandle) {
      await connectDataFolder();
      if (!dataDirectoryHandle) {
        return false;
      }
    }

    const permission = await dataDirectoryHandle.requestPermission({
      mode: "readwrite",
    });

    return permission === "granted";
  }

  async function writeJsonFile(filename, data) {
    const fileHandle = await dataDirectoryHandle.getFileHandle(filename, {
      create: true,
    });

    const writable = await fileHandle.createWritable();
    await writable.write(`${JSON.stringify(data, null, 2)}\n`);
    await writable.close();
  }

  async function saveAllChanges() {
    if (!changedSections.length) {
      status = "No changes detected. Nothing to save.";
      return;
    }

    if (!(await ensureWritableFolder())) {
      status =
        "Could not save directly. Connect /public/data and allow write access, or use download fallback.";
      return;
    }

    busy = true;

    try {
      for (const section of changedSections) {
        await writeJsonFile(fileNames[section], getCurrentSection(section));
      }

      baseline = {
        site: deepClone(site),
        projects: deepClone(projects),
        skills: deepClone(skills),
        experience: deepClone(experience),
      };
      authBaseline = deepClone(authConfig);

      status = `Saved ${changedFiles.join(", ")} to ${connectedFolderName}.`;
    } catch (_error) {
      status = "Save failed. Check folder permission and try again.";
    }

    busy = false;
  }

  async function unlockStudio() {
    loginError = "";
    if (!loginPassword.trim()) {
      loginError = "Enter password first.";
      return;
    }

    busy = true;
    const verified = await verifyPassword(loginPassword, authConfig);
    busy = false;

    if (!verified) {
      loginError = "Incorrect password.";
      return;
    }

    authenticated = true;
    loginPassword = "";
    status = "Portfolio Studio unlocked.";
  }

  function lockStudio() {
    authenticated = false;
    loginPassword = "";
    loginError = "";
    status = "Portfolio Studio locked.";
  }

  async function changePassword() {
    passwordStatus = "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      passwordStatus = "Enter current password and the new password fields.";
      return;
    }

    if (newPassword !== confirmPassword) {
      passwordStatus = "New password and confirmation do not match.";
      return;
    }

    if (newPassword.length < 10) {
      passwordStatus = "Use at least 10 characters for the new password.";
      return;
    }

    busy = true;
    const currentVerified = await verifyPassword(currentPassword, authConfig);
    if (!currentVerified) {
      busy = false;
      passwordStatus = "Current password is incorrect.";
      return;
    }

    authConfig = await createAuthConfig(
      newPassword,
      authConfig?.iterations || 210000
    );

    busy = false;
    currentPassword = "";
    newPassword = "";
    confirmPassword = "";
    passwordStatus =
      "Password updated. Click Save all changes to write admin-auth.json.";
    status = "Admin password changed in editor memory.";
  }

  function setProjectPreviewFromFile(index, event) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      status = "Please upload an image or GIF file.";
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      projects = projects.map((project, currentIndex) => {
        if (currentIndex !== index) {
          return project;
        }

        return {
          ...project,
          previewSrc: dataUrl,
          previewAlt: project.previewAlt || `${project.title || "Project"} preview`,
        };
      });
      status = `Added preview for project ${index + 1}.`;
    };

    reader.readAsDataURL(file);
    input.value = "";
  }

  function clearProjectPreview(index) {
    projects = projects.map((project, currentIndex) =>
      currentIndex === index
        ? {
            ...project,
            previewSrc: "",
          }
        : project
    );
  }

  function setHeaderImageFromFile(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      status = "Please upload an image file for the header visual.";
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      site = {
        ...site,
        headerImageSrc: dataUrl,
        headerImageAlt: site.headerImageAlt || "Developer profile visual",
      };
      status = "Header visual uploaded.";
    };

    reader.readAsDataURL(file);
    input.value = "";
  }

  function addProject() {
    projects = [
      ...projects,
      {
        title: "",
        type: "",
        summary: "",
        outcome: "",
        previewSrc: "",
        previewAlt: "",
        appUrl: "",
        repoUrl: "",
      },
    ];
  }

  function removeProject(index) {
    projects = projects.filter((_entry, current) => current !== index);
  }

  function addSkill() {
    skills = [...skills, ""];
  }

  function removeSkill(index) {
    skills = skills.filter((_entry, current) => current !== index);
  }

  function addExperience() {
    experience = [
      ...experience,
      {
        role: "",
        company: "",
        period: "",
        detail: "",
      },
    ];
  }

  function removeExperience(index) {
    experience = experience.filter((_entry, current) => current !== index);
  }

  $: changedBySection = {
    site: !deepEqual(site, baseline.site),
    projects: !deepEqual(projects, baseline.projects),
    skills: !deepEqual(skills, baseline.skills),
    experience: !deepEqual(experience, baseline.experience),
    auth: authConfig && authBaseline ? !deepEqual(authConfig, authBaseline) : false,
  };

  $: changedSections = Object.keys(changedBySection).filter(
    (section) => changedBySection[section]
  );

  $: changedFiles = changedSections.map((section) => fileNames[section]);
</script>

<div class="ambient ambient-a" aria-hidden="true"></div>
<div class="ambient ambient-b" aria-hidden="true"></div>

<main class="studio">
  <header class="top">
    <div>
      <p class="kicker">Admin Frontend</p>
      <h1>Portfolio Studio</h1>
      <p class="summary">
        Edit your portfolio data and save JSON to a selected local folder.
        Browser apps cannot write directly to your cloud host filesystem.
      </p>
    </div>
    <a class="back-link" href="/">Open portfolio</a>
  </header>

  {#if !authenticated}
    <section class="panel login-panel">
      <h2>Unlock Studio</h2>
      <p class="summary">Enter your admin password to access editing controls.</p>
      <label class="stacked">
        Password
        <input
          type="password"
          bind:value={loginPassword}
          placeholder="Enter admin password"
          on:keydown={(event) => event.key === "Enter" && unlockStudio()}
        />
      </label>
      {#if loginError}
        <p class="feedback error">{loginError}</p>
      {/if}
      <div class="inline-downloads">
        <button class="primary" on:click={unlockStudio} disabled={busy || !authReady}>
          Unlock Portfolio Studio
        </button>
      </div>
      <p class="feedback">{status}</p>
    </section>
  {:else}
    <section class="toolbar">
      <button on:click={connectDataFolder} disabled={busy || !canWriteFiles}>
        Connect data folder
      </button>
      <button class="primary" on:click={saveAllChanges} disabled={busy}>
        Save all changes
      </button>
      <button on:click={reloadFromFiles} disabled={busy}>Reload from JSON</button>
      <button on:click={resetEdits} disabled={busy}>Reset unsaved edits</button>
      <button on:click={lockStudio}>Lock studio</button>
      {#if !canWriteFiles}
        <button on:click={downloadChangedFiles} disabled={busy}>Download changed (fallback)</button>
      {/if}
    </section>

    <section class="status-card">
      <p><strong>Status:</strong> {status}</p>
      <p><strong>Connected folder:</strong> {connectedFolderName}</p>
      <p>
        <strong>Changed files:</strong>
        {#if changedFiles.length}
          {changedFiles.join(", ")}
        {:else}
          none
        {/if}
      </p>
      {#if changedSections.length}
        <div class="inline-downloads">
          {#each changedSections as section}
            <button on:click={() => downloadSection(section)}>
              Download {fileNames[section]}
            </button>
          {/each}
        </div>
      {/if}
    </section>

    <section class="panel">
      <h2>Admin Access (<code>admin-auth.json</code>)</h2>
      <p class="summary">Change password, then click Save all changes.</p>
      <div class="field-grid two-col">
        <label>
          Current Password
          <input type="password" bind:value={currentPassword} />
        </label>
        <label>
          New Password
          <input type="password" bind:value={newPassword} />
        </label>
        <label>
          Confirm New Password
          <input type="password" bind:value={confirmPassword} />
        </label>
      </div>
      <div class="inline-downloads">
        <button class="primary" on:click={changePassword} disabled={busy}>
          Update password
        </button>
      </div>
      {#if passwordStatus}
        <p class="feedback">{passwordStatus}</p>
      {/if}
    </section>

    <section class="panel">
      <h2>Site Content (<code>site.json</code>)</h2>

      <div class="field-grid two-col">
        <label>
          Brand
          <input bind:value={site.brand} />
        </label>
        <label>
          Default Theme
          <select bind:value={site.defaultTheme}>
            <option value="dark">Black Orange (Dark)</option>
            <option value="light">Classic Light</option>
          </select>
        </label>
        <label>
          Top CTA Label
          <input bind:value={site.topCtaLabel} />
        </label>
        <label>
          Hero Eyebrow
          <input bind:value={site.eyebrow} />
        </label>
        <label>
          Work Eyebrow
          <input bind:value={site.workEyebrow} />
        </label>
        <label>
          Work Title
          <input bind:value={site.workTitle} />
        </label>
        <label>
          Stack Eyebrow
          <input bind:value={site.stackEyebrow} />
        </label>
        <label>
          Stack Title
          <input bind:value={site.stackTitle} />
        </label>
        <label>
          Timeline Eyebrow
          <input bind:value={site.timelineEyebrow} />
        </label>
        <label>
          Timeline Title
          <input bind:value={site.timelineTitle} />
        </label>
        <label>
          Contact Eyebrow
          <input bind:value={site.contactEyebrow} />
        </label>
        <label>
          Contact Title
          <input bind:value={site.contactTitle} />
        </label>
        <label>
          Hero Primary Label
          <input bind:value={site.heroPrimary.label} />
        </label>
        <label>
          Hero Primary Link
          <input bind:value={site.heroPrimary.href} />
        </label>
        <label>
          Hero Secondary Label
          <input bind:value={site.heroSecondary.label} />
        </label>
        <label>
          Hero Secondary Link
          <input bind:value={site.heroSecondary.href} />
        </label>
        <label>
          Contact Primary Label
          <input bind:value={site.contactPrimary.label} />
        </label>
        <label>
          Contact Primary Link
          <input bind:value={site.contactPrimary.href} />
        </label>
        <label>
          Contact Secondary Label
          <input bind:value={site.contactSecondary.label} />
        </label>
        <label>
          Contact Secondary Link
          <input bind:value={site.contactSecondary.href} />
        </label>
        <label>
          Twitter URL
          <input bind:value={site.socialTwitter} placeholder="https://x.com/..." />
        </label>
        <label>
          Medium URL
          <input bind:value={site.socialMedium} placeholder="https://medium.com/@..." />
        </label>
        <label>
          LinkedIn URL
          <input bind:value={site.socialLinkedin} placeholder="https://www.linkedin.com/in/..." />
        </label>
        <label>
          GitHub URL
          <input bind:value={site.socialGithub} placeholder="https://github.com/..." />
        </label>
        <label>
          Language Proficiency
          <input bind:value={site.languageProficiency} />
        </label>
        <label>
          Footer Text
          <input bind:value={site.footerText} />
        </label>
      </div>

      <label class="stacked">
        Hero Title
        <textarea rows="2" bind:value={site.heroTitle}></textarea>
      </label>
      <label class="stacked">
        Hero Description
        <textarea rows="3" bind:value={site.heroLede}></textarea>
      </label>
      <label class="stacked">
        Header Image/GIF URL
        <input
          bind:value={site.headerImageSrc}
          placeholder="https://... or data:image/..."
        />
      </label>
      <label class="stacked">
        Header Image Alt Text
        <input bind:value={site.headerImageAlt} />
      </label>
      <label class="stacked">
        Upload Header Image/GIF
        <input type="file" accept="image/*,image/gif" on:change={setHeaderImageFromFile} />
      </label>
      {#if site.headerImageSrc}
        <div class="project-preview-admin-wrap">
          <img class="project-preview-admin" src={site.headerImageSrc} alt={site.headerImageAlt || "Header preview"} />
          <button
            type="button"
            on:click={() => (site = { ...site, headerImageSrc: "" })}
          >
            Remove header image
          </button>
        </div>
      {/if}
      <label class="stacked">
        iOS Focus Summary
        <textarea rows="3" bind:value={site.focusSummary}></textarea>
      </label>
      <label class="stacked">
        Contact Description
        <textarea rows="3" bind:value={site.contactLede}></textarea>
      </label>
      <label class="stacked">
        Additional Skills (one per line)
        <textarea
          rows="6"
          value={(site.additionalSkills || []).join("\n")}
          on:input={(event) =>
            (site.additionalSkills = linesToArray(event.currentTarget.value))}
        ></textarea>
      </label>
      <label class="stacked">
        Certifications (one per line)
        <textarea
          rows="6"
          value={(site.certifications || []).join("\n")}
          on:input={(event) =>
            (site.certifications = linesToArray(event.currentTarget.value))}
        ></textarea>
      </label>
      <label class="stacked">
        Publications (format: title | url, one per line)
        <textarea
          rows="8"
          value={publicationsToLines(site.publications)}
          on:input={(event) =>
            (site.publications = linesToPublications(event.currentTarget.value))}
        ></textarea>
      </label>
    </section>

    <section class="panel">
      <div class="sub-head">
        <h2>Projects (<code>projects.json</code>)</h2>
        <button on:click={addProject}>Add project</button>
      </div>
      <div class="stack-list">
        {#each projects as project, index}
          <article class="list-item">
            <div class="field-grid">
              <label>
                Title
                <input bind:value={project.title} />
              </label>
              <label>
                Type
                <input bind:value={project.type} />
              </label>
              <label>
                App URL
                <input bind:value={project.appUrl} placeholder="https://..." />
              </label>
              <label>
                Repo URL
                <input bind:value={project.repoUrl} placeholder="https://github.com/..." />
              </label>
              <label class="wide">
                Preview Image/GIF URL
                <input bind:value={project.previewSrc} placeholder="https://... or data:image/..." />
              </label>
              <label>
                Preview Alt Text
                <input bind:value={project.previewAlt} />
              </label>
              <label>
                Upload Preview (Image/GIF)
                <input
                  type="file"
                  accept="image/*,image/gif"
                  on:change={(event) => setProjectPreviewFromFile(index, event)}
                />
              </label>
              <label class="wide">
                Summary
                <textarea rows="2" bind:value={project.summary}></textarea>
              </label>
              <label class="wide">
                Outcome
                <textarea rows="2" bind:value={project.outcome}></textarea>
              </label>
            </div>

            <div class="project-preview-admin-wrap">
              {#if project.previewSrc}
                <img
                  class="project-preview-admin"
                  src={project.previewSrc}
                  alt={project.previewAlt || `${project.title || "Project"} preview`}
                />
                <button on:click={() => clearProjectPreview(index)}>Remove preview</button>
              {:else}
                <div class="project-preview-admin placeholder">No preview selected</div>
              {/if}
            </div>

            <button class="danger" on:click={() => removeProject(index)}>
              Remove project
            </button>
          </article>
        {/each}
      </div>
    </section>

    <section class="panel">
      <div class="sub-head">
        <h2>Skills (<code>skills.json</code>)</h2>
        <button on:click={addSkill}>Add skill</button>
      </div>
      <div class="stack-list">
        {#each skills as skill, index}
          <article class="list-item compact">
            <label class="stacked">
              Skill
              <input bind:value={skills[index]} />
            </label>
            <button class="danger" on:click={() => removeSkill(index)}>Remove skill</button>
          </article>
        {/each}
      </div>
    </section>

    <section class="panel">
      <div class="sub-head">
        <h2>Experience (<code>experience.json</code>)</h2>
        <button on:click={addExperience}>Add experience</button>
      </div>
      <div class="stack-list">
        {#each experience as item, index}
          <article class="list-item">
            <div class="field-grid">
              <label>
                Role
                <input bind:value={item.role} />
              </label>
              <label>
                Company
                <input bind:value={item.company} />
              </label>
              <label>
                Period
                <input bind:value={item.period} />
              </label>
              <label class="wide">
                Detail
                <textarea rows="3" bind:value={item.detail}></textarea>
              </label>
            </div>
            <button class="danger" on:click={() => removeExperience(index)}>
              Remove entry
            </button>
          </article>
        {/each}
      </div>
    </section>
  {/if}
</main>
