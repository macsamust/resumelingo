-- The template picker's tooltip is built from templates.description (see
-- ResumeEditPage.tsx/ResumeBuilderPage.tsx's `title={...t.description}`).
-- worker/src/config/templates.ts's copy had already been rewritten without
-- hyphens at some point, but that static file is documentation only — the
-- live picker reads from this table (see 0021/0022/0025's same note), and
-- nothing had ever pushed that rewrite into D1. So the on-screen tooltips
-- were still showing the original hyphenated wording (public-sector,
-- USAJobs-ready, Skills-forward, etc.) the whole time. This brings every
-- row's description in line with templates.ts's current (hyphen-free) text.
UPDATE templates SET description = 'Polished layout for senior leadership roles.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'executive';
UPDATE templates SET description = 'Clean, contemporary layout with accent color.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'modern';
UPDATE templates SET description = 'Traditional, conservative resume format.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'classic';
UPDATE templates SET description = 'Formatted for public sector applications.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'government';
UPDATE templates SET description = 'Detailed federal resume format (USAJobs ready).', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'federal';
UPDATE templates SET description = 'Skills forward layout for engineering roles.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'technical';
UPDATE templates SET description = 'Expressive layout for design and creative fields.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'creative';
UPDATE templates SET description = 'Distraction free, whitespace forward layout.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'minimalist';
UPDATE templates SET description = 'Achievement and metrics driven format.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'consulting';
UPDATE templates SET description = 'Translates military experience to civilian roles.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'military-transition';
UPDATE templates SET description = 'Formal layout suited to large organizations.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'corporate';
UPDATE templates SET description = 'Fast paced, impact driven layout.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'startup';
UPDATE templates SET description = 'Clinical experience and licensure forward.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'healthcare';
UPDATE templates SET description = 'CV style layout for education and research.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'academic';
UPDATE templates SET description = 'Highlights clearance and contract vehicles.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'government-contractor';
UPDATE templates SET description = 'Full width name banner over a contact and skills sidebar, with an icon marker career timeline.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'timeline';
UPDATE templates SET description = 'Colored photo banner over badge marked work history, with a skills and volunteer work sidebar.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'portrait';
UPDATE templates SET description = 'Bold circular photo with an accent color corner block, a contact and education sidebar, and bar style section headers.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'designer';
UPDATE templates SET description = 'Grayscale photo beside a light gray sidebar for contact, education, and skills, with clean underlined section headers.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'monochrome';
UPDATE templates SET description = 'Photo header over a grid of bordered cards, each tagged with a colorful pill style section label.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'showcase';
UPDATE templates SET description = 'Circular photo beside a bordered name box on a solid navy header, with a light Contact/Education/Skills sidebar.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'framed';
UPDATE templates SET description = 'Full width navy header with a centered gold monogram and bordered name box, over a Contact/Education/Skills sidebar.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'emblem';
UPDATE templates SET description = 'Circular photo beside the name on a colored banner header, with Hard Skills/Soft Skills and Workshops & Training sections.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'spotlight';
UPDATE templates SET description = 'Full width navy and gold banner header with a bold serif name, for senior and board level roles. Single column and ATS friendly.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'boardroom';
UPDATE templates SET description = 'Single column, plain section headers, and no photos or graphics, built to parse cleanly through applicant tracking systems.', updatedAt = '2026-08-30T00:00:00.000Z' WHERE "key" = 'ats-optimized';
