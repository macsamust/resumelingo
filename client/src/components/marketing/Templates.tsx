import { useEffect, useState } from "react";
import { catalogApi } from "../../api";
import { TemplateDefinition } from "../../types";

const FALLBACK_TEMPLATES = [
  "Executive", "Modern", "Classic", "Government", "Federal", "Technical", "Creative",
  "Minimalist", "Consulting", "Military Transition", "Corporate", "Startup",
  "Healthcare", "Academic", "Government Contractor",
];

export function Templates() {
  const [templates, setTemplates] = useState<TemplateDefinition[] | null>(null);

  useEffect(() => {
    catalogApi
      .listTemplates()
      .then((res) => setTemplates(res.templates))
      .catch(() => setTemplates(null));
  }, []);

  return (
    <section id="templates">
      <div className="wrap">
        <div className="section-head">
          <span className="section-tag">Templates</span>
          <h2>A template for every field</h2>
          <p>Switch anytime and preview instantly — no rebuilding required.</p>
        </div>
        <div className="template-pills">
          {templates
            ? templates.map((t) => <span key={t.key} title={t.description}>{t.name}</span>)
            : FALLBACK_TEMPLATES.map((name) => <span key={name}>{name}</span>)}
        </div>
      </div>
    </section>
  );
}
