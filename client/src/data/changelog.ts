export interface ChangelogEntry {
  date: string;
  title: string;
  description: string;
}

/**
 * Customer-facing "What's New" content — see ChangelogPage.tsx. Curated by
 * hand from docs/ops/session-log.md's user-relevant entries (CJ, Sep 2026:
 * wanted a changelog instead of a versioned "2.0" relaunch, since the
 * product's own pitch is continuous improvement — see the Full Circle
 * loop's "Stay current" stage). Internal-only work (security reviews,
 * admin tooling, ops runbooks) is deliberately left out — this is what a
 * subscriber would actually notice, not an engineering log. Newest first;
 * add new entries to the top as user-facing changes ship.
 *
 * Inclusion bar (CJ, Sep 2026, after questioning a tablet-layout fix that
 * didn't belong here): an entry only qualifies if a subscriber reading it
 * would think "oh nice, that's better for me" or "good, I don't have to
 * work around that anymore." A fix for a bug most subscribers never
 * noticed or hit doesn't clear that bar — announcing it adds nothing and
 * risks reading as "wait, was something broken?", which undercuts the
 * whole point of this page (proof of active, positive momentum). When in
 * doubt, leave it out rather than padding the list.
 */
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    date: "2026-10-01",
    title: "A tidier, searchable Help page",
    description:
      "Help & Support now groups its answers into collapsible topics and has a search box that highlights what it finds, so you can get to an answer without scrolling a long list.",
  },
  {
    date: "2026-10-01",
    title: "New answers in the Help center",
    description:
      "We added help articles for pausing your resume link, adding references, restoring earlier versions, the resume check-in emails, and the Full Circle checklist, and refreshed the Recruiter Mode answer.",
  },
  {
    date: "2026-09-27",
    title: "See which keyword each drafted bullet came from",
    description:
      "When you draft several resume bullets from a check-in email, each one is now labeled with the keyword it was built from, so it's easy to tell them apart before you save.",
  },
  {
    date: "2026-09-22",
    title: "Smarter keywords on your resume check-in",
    description:
      "The keyword suggestions in your resume check-in email are now generated from your resume's actual title, not just a generic list for your profession — so they line up better with the role you're targeting.",
  },
  {
    date: "2026-09-22",
    title: "Draft more than one bullet per check-in",
    description:
      "After drafting a resume bullet from a check-in email, you can now go straight into another one instead of the window just closing. The bullet text box also expands if you need more room to write.",
  },
  {
    date: "2026-09-22",
    title: "Phone numbers format themselves",
    description: "Enter your 10-digit phone number on your resume and it now formats automatically as 555-123-4567.",
  },
  {
    date: "2026-09-22",
    title: "Upgrading unlocks a template with more room to work with",
    description:
      "Upgrading your plan now automatically switches a default-template resume to one built for your new tier, so features like Skills & Tools are ready to use right away instead of needing a manual template change.",
  },
  {
    date: "2026-09-22",
    title: "Clearer explanation when sharing is limited",
    description:
      "If your account hasn't verified its email yet, your resume's sharing status now explains why — and the verification email says up front that sharing stays off until you confirm your address.",
  },
];
