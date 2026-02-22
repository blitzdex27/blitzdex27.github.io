<script>
  import { onMount } from "svelte";
  import { loadContent } from "./lib/content-loader.js";
  import { deepClone, defaultContent } from "./lib/default-content.js";

  let site = deepClone(defaultContent.site);
  let projects = deepClone(defaultContent.projects);
  let skills = deepClone(defaultContent.skills);
  let experience = deepClone(defaultContent.experience);

  const socialIconUrls = {
    twitter: "https://cdn.simpleicons.org/x/1e2329",
    medium: "https://cdn.simpleicons.org/medium/1e2329",
    linkedin: "https://cdn.simpleicons.org/linkedin/1e2329",
    github: "https://cdn.simpleicons.org/github/1e2329",
  };

  onMount(async () => {
    const content = await loadContent();
    site = content.site;
    projects = content.projects;
    skills = content.skills;
    experience = content.experience;
  });

  $: primarySkills = skills.slice(0, 14);
  $: additionalSkills = site.additionalSkills || [];
  $: certifications = site.certifications || [];
  $: publications = site.publications || [];
  $: socials = [
    { key: "twitter", label: "Twitter", url: site.socialTwitter },
    { key: "medium", label: "Medium", url: site.socialMedium },
    { key: "linkedin", label: "LinkedIn", url: site.socialLinkedin },
    { key: "github", label: "GitHub", url: site.socialGithub },
  ].filter((entry) => Boolean(entry.url));
</script>

<div class="bg-shape bg-shape-a" aria-hidden="true"></div>
<div class="bg-shape bg-shape-b" aria-hidden="true"></div>

<main class="page">
  <header class="topbar reveal" style="--delay: 0ms;">
    <a class="brand" href="#top">{site.brand}</a>
    <a class="pill" href="#contact">{site.topCtaLabel}</a>
  </header>

  <section class="hero reveal" style="--delay: 80ms;" id="top">
    <p class="eyebrow">{site.eyebrow}</p>
    <h1>{site.heroTitle}</h1>
    <p class="lede">{site.heroLede}</p>
    <div class="hero-actions">
      <a class="cta" href={site.heroPrimary.href}>{site.heroPrimary.label}</a>
      <a class="ghost" href={site.heroSecondary.href}>{site.heroSecondary.label}</a>
    </div>
  </section>

  <section class="section split reveal" style="--delay: 140ms;">
    <article class="panel ios-focus">
      <p class="eyebrow">iOS Focus</p>
      <h2>Core Apple Platform Skills</h2>
      <p class="panel-lede">{site.focusSummary}</p>
      <ul class="skill-list primary">
        {#each primarySkills as skill}
          <li>{skill}</li>
        {/each}
      </ul>
    </article>

    <article class="panel secondary-panel">
      <p class="eyebrow">Additional</p>
      <h2>Other Technical Background</h2>
      <p class="panel-lede">
        Non-primary skills that support full product delivery when needed.
      </p>
      <ul class="skill-list secondary">
        {#each additionalSkills as skill}
          <li>{skill}</li>
        {/each}
      </ul>
      <p class="language-badge">{site.languageProficiency}</p>
    </article>
  </section>

  <section class="section reveal" style="--delay: 200ms;" id="work">
    <div class="section-head">
      <p class="eyebrow">{site.workEyebrow}</p>
      <h2>{site.workTitle}</h2>
    </div>
    <div class="grid">
      {#each projects as project}
        <article class="card">
          {#if project.previewSrc}
            <img
              class="project-preview"
              src={project.previewSrc}
              alt={project.previewAlt || `${project.title} preview`}
              loading="lazy"
            />
          {:else}
            <div class="project-preview project-preview-placeholder">
              Add project preview (image/GIF) in Portfolio Studio
            </div>
          {/if}

          <p class="project-type">{project.type}</p>
          <h3>{project.title}</h3>
          <p>{project.summary}</p>
          <p class="outcome">{project.outcome}</p>

          <div class="project-links">
            {#if project.appUrl}
              <a class="mini-cta" href={project.appUrl} target="_blank" rel="noreferrer">
                App / Demo
              </a>
            {/if}
            {#if project.repoUrl}
              <a class="mini-ghost" href={project.repoUrl} target="_blank" rel="noreferrer">
                GitHub Repo
              </a>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  </section>

  <section class="section reveal" style="--delay: 240ms;" id="experience">
    <div class="section-head">
      <p class="eyebrow">{site.timelineEyebrow}</p>
      <h2>{site.timelineTitle}</h2>
    </div>

    <div class="timeline">
      {#each experience as item}
        <article class="timeline-item">
          <p class="period">{item.period}</p>
          <h3>{item.role}</h3>
          <p class="company">{item.company}</p>
          <p>{item.detail}</p>
          {#if item.highlights && item.highlights.length}
            <ul class="highlights">
              {#each item.highlights as highlight}
                <li>{highlight}</li>
              {/each}
            </ul>
          {/if}
        </article>
      {/each}
    </div>
  </section>

  <section class="section split reveal" style="--delay: 300ms;">
    <article class="panel">
      <p class="eyebrow">Credentials</p>
      <h2>Certifications</h2>
      <ul class="resource-list">
        {#each certifications as cert}
          <li>{cert}</li>
        {/each}
      </ul>
    </article>

    <article class="panel">
      <p class="eyebrow">Writing</p>
      <h2>Technical Publications</h2>
      <ul class="resource-list links">
        {#each publications as post}
          <li>
            <a href={post.url} target="_blank" rel="noreferrer">{post.title}</a>
          </li>
        {/each}
      </ul>
    </article>
  </section>

  <section class="section contact reveal" style="--delay: 360ms;" id="contact">
    <p class="eyebrow">{site.contactEyebrow}</p>
    <h2>{site.contactTitle}</h2>
    <p>{site.contactLede}</p>
    <div class="hero-actions">
      <a class="cta" href={site.contactPrimary.href} target="_blank" rel="noreferrer">
        {site.contactPrimary.label}
      </a>
      <a class="ghost" href={site.contactSecondary.href} target="_blank" rel="noreferrer">
        {site.contactSecondary.label}
      </a>
    </div>
  </section>

  <footer class="footer reveal" style="--delay: 420ms;">
    <p>{site.footerText}</p>
    <div class="social-links">
      {#each socials as social}
        <a href={social.url} target="_blank" rel="noreferrer" aria-label={social.label}>
          <img src={socialIconUrls[social.key]} alt="" loading="lazy" />
          <span>{social.label}</span>
        </a>
      {/each}
    </div>
  </footer>
</main>
