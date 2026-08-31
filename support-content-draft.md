# ResumeLingo Support Content — Draft

Draft for review. Once approved, this becomes real `/help`, `/faq`, and `/quick-start` pages in the app. Nothing here is live yet.

**Setup step needed before this can go live:** `support@resumelingo.com` needs an actual inbox behind it. Since `resumelingo.com`'s DNS already has Cloudflare Email Routing configured (the `route1/2/3.mx.cloudflare.net` records we saw earlier), the fastest path is adding a routing rule in Cloudflare (Email → Email Routing) that forwards `support@resumelingo.com` to whichever inbox you actually check. Takes a couple of minutes, no new infrastructure needed.

---

## Support page

**Need help?**

Email us at support@resumelingo.com and we'll get back to you. For the fastest answer, check the FAQ below first — most common questions are answered there.

---

## FAQ

**I made changes to my resume but I don't see them when I view it. What happened?**

Most of the resume editor autosaves automatically — when you click or tab out of a field, it saves within a second or two. You'll see "All changes saved" near the top of the page when it's caught up, or "Couldn't autosave — click Save changes to retry" if something went wrong (usually a connection hiccup). There's also a "Save changes" button at the top of the editor you can click any time to save immediately, rather than waiting for autosave.

One section works differently: the **Generated Summary & Bullets** section has its own **"Save summary"** button, separate from the rest of the form. If you edited your summary or bullet text and don't see it reflected, check that you clicked "Save summary" specifically — that section doesn't autosave with everything else.

If you edited a resume and the change still isn't showing on your public link, try a hard refresh (Cmd+Shift+R / Ctrl+Shift+R) — browsers sometimes cache the public resume page.

**How do I share my resume with someone?**

Open the resume in the editor and go to the **Sharing** section. You'll find your public link there (resumelingo.com/r/your-link), which you can copy and send directly, or open in a new tab to preview exactly what a viewer will see.

**Who can see my resume link?**

Depends on your plan and what you choose under **Link visibility** in the Sharing section: **Public** (anyone with the link can view it — available on every plan), **Private** (only you can view it while logged in — Professional and above), or **Password-protected** (anyone with the link needs a password you set — Premium only).

**How many resumes can I create?**

Depends on your plan — check the Pricing page for current limits. If you're at your limit, the "Create resume" flow will tell you before you start filling out a new one, rather than after.

**Can I edit the AI-generated summary and bullet points?**

Yes. In the **Generated Summary & Bullets** section of the editor, both the Summary and Bullets fields are directly editable text — type your own version and click **Save summary**. If you'd rather have it rewritten again automatically, there's a **Regenerate** button in the same section.

**I want to change my email address or password.**

Go to your Profile page (click your name in the sidebar). Email changes require re-verifying the new address — check your inbox for a confirmation link after saving. To reset a forgotten password, use "Forgot password" on the login page instead.

**How do I cancel or change my subscription?**

From your Dashboard, click **Manage billing** — this opens a secure Stripe page where you can update your card, switch plans, or cancel. Downgrading to the free tier can also be done directly in the app without going through Stripe.

**Is my resume data private?**

See our [Privacy Policy](/privacy) for the full details on what we store and how it's used. Short version: your resume content is yours, visible only per the link visibility setting you choose, and never sold to third parties.

---

## Quick Start — creating your first resume

**1. Create your account.** Sign up with your name, email, and a password. You'll get a verification email — click the link to confirm your address (this doesn't block you from using the app right away, it's just a nudge).

**2. Start a new resume.** From your Dashboard, click **New Resume**. Pick the profession that's closest to your field — this shapes some of the guided questions you'll get later — and choose a template. Don't worry about the template choice being permanent; it can be changed later from the editor.

**3. Fill in your basics.** Name, contact info (email, phone, LinkedIn — all optional except what you want shown), and a professional title.

**4. Add your work experience and education.** Enter your job history and schooling. If you already have a resume as a PDF or Word doc, try **Import an existing resume** instead — it reads the file and pre-fills these sections for you, which you can then review and adjust.

**5. Add achievements or highlights.** These are the specific, results-oriented bullet points that make a resume stand out — think "increased X by Y%" rather than a plain duty description. If you're not sure what to write, the achievement generator can help draft one from a short description of what you did.

**6. Review your AI-generated summary.** Once you've filled in enough of the above, ResumeLingo writes a professional summary and bullet points for you automatically. You can use it as-is, edit it directly, or click Regenerate for a different version.

**7. Create the resume.** Click **Create my resume** at the bottom of the form. This takes you into the full editor, where every section above (and a few more — Skills & Tools, Awards, Additional Details) can be revisited and refined any time.

**8. Share it.** In the editor's **Sharing** section, copy your public link and choose who can see it (public, private, or password-protected, depending on your plan).

That's the core loop — from here, most of what you'll do is revisit sections in the editor as your experience changes, using the autosave (or the Save changes button) to keep it current.

---

## Marketing — where to start

*Not app copy — this section is strategic input for you, not something published on the site.*

**Where the built-in advantages already point:** the app already has a natural SEO/content-marketing foundation in the **Career Center** (resume tips, interview tips, salary negotiation) — that's exactly the kind of content that ranks in search for "how to write a resume for [X]" queries and pulls in free organic traffic before someone's even decided to sign up. Doubling down on that (more profession-specific guides, more long-tail keyword coverage) is usually the highest-leverage, lowest-cost channel for a product like this, because it compounds over time instead of needing continuous ad spend.

**A genuinely underused signal:** the profession list already includes Military and Government Contractor as first-class options, distinct from generic "other." That's not a coincidence-shaped feature — it suggests transitioning service members are already a considered audience. That's a real, underserved niche: military transition programs (base transition assistance offices, veteran service organizations) actively look for tools to recommend, and veterans translating military experience into civilian resume language is a hard, specific problem this app is already positioned to solve.

**Who to target, roughly in order of effort-to-payoff:**

Individual job seekers directly, via the content/SEO path above — highest volume, slowest individual conversion, but free and compounding.

University career centers and coding bootcamps — they're actively looking for tools to hand students, often willing to link out or even pay for cohort licenses if the price is right; a warm intro or a simple partnership page ("for career centers") can open this door cheaper than paid ads.

Staffing and recruiting agencies — a plausible B2B angle since they place candidates constantly and could white-label or bulk-recommend a tool like this, but it's a longer sales cycle and probably not worth chasing until the product has more proof (real usage numbers, testimonials) to point to.

Veteran transition programs specifically, given the existing Military/Government Contractor support — likely the best "targeted, low-competition" niche to test first, since it's a natural fit rather than a stretch.

Worth being honest about the two things not covered here: this is general guidance based on common patterns for tools like this, not something backed by ResumeLingo's own traffic/conversion data (there isn't any real usage data yet), and paid acquisition (search/social ads) isn't recommended as a starting point given there's no existing signal on what converts — that's usually where budget gets wasted first for a pre-revenue-scale product.
