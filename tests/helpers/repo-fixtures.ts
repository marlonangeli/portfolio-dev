import fs from "fs";
import os from "os";
import path from "path";
import { saveYamlFile } from "../../scripts/lib/yaml-lite.ts";

type LocaleText = string | Record<string, string>;

type CurriculumDraft = {
  root: {
    id: string;
    schema_version: string;
    default_locale: string;
    supported_locales: string[];
    profile_mode: string;
    updated: string;
    sections: Record<string, string>;
    exports: { json_resume: boolean; json_resume_path?: string };
  };
  enums: Record<string, string[]>;
  sections: {
    profile: {
      profile: {
        id: string;
        name: LocaleText;
        title: LocaleText;
        location: { country_code: string; region: LocaleText };
        contact: { email: string; picture_url: string };
        links: string[];
        availability: { work_model: string[] };
      };
    };
    summary: {
      summary: {
        id: string;
        professional_summary: LocaleText;
        objective: LocaleText;
      };
    };
    links: {
      links: Array<{
        id: string;
        kind: string;
        url: string;
        label: LocaleText;
        visibility: "public" | "private";
      }>;
    };
    projects: {
      projects: Array<{
        id: string;
        name: LocaleText;
        description: LocaleText;
        links: string[];
        technologies: string[];
      }>;
    };
    experience: {
      experience: Array<{
        id: string;
        company: { name: LocaleText; website: string };
        role: LocaleText;
        start: string;
        end: string;
        achievements: LocaleText[];
        related_links: string[];
        technologies: string[];
      }>;
    };
    education: {
      education: Array<{
        id: string;
        institution: { name: LocaleText; short_name: string; website: string };
        degree: LocaleText;
        study_type: LocaleText;
        start: string;
        end: string;
        status: string;
      }>;
    };
    skills: {
      skills: Array<{
        id: string;
        name: LocaleText;
        level: string;
        category: string;
        references: string[];
      }>;
    };
    languages: {
      languages: Array<{
        id: string;
        code: string;
        name: LocaleText;
        level: string;
      }>;
    };
  };
};

type MetaDraft = {
  categories: Array<{
    id: string;
    name: string;
    description: string;
    aliases: string[];
  }>;
  priorities: Array<{
    id: string;
    name: string;
    description: string;
    aliases: string[];
    rank: number;
  }>;
  statuses: Array<{
    id: string;
    name: string;
    description: string;
    aliases: string[];
  }>;
  meta: {
    id: string;
    title: string;
    doc_type: string;
    category: string;
    priority: string;
    status: string;
    created: string;
    updated: string;
    version: string;
    changelog: string[];
    relates: string[];
  };
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createTempRepo(prefix = "portfolio-fixture-"): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function randToken(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function writeCurriculumFixture(
  repoRoot: string,
  mutate?: (draft: CurriculumDraft) => void,
): void {
  const personToken = randToken("person");
  const companyToken = randToken("company");
  const projectToken = randToken("project");
  const firstName = randToken("first");
  const lastName = randToken("last");
  const fullName = `${firstName} ${lastName}`;
  const email = `${personToken}@example.test`;
  const pictureUrl = `https://${personToken}.example.test/avatar.png`;
  const companyUrl = `https://${companyToken}.example.test`;
  const projectUrl = `https://${projectToken}.example.test`;
  const githubUrl = `https://github.com/${personToken}`;
  const linkedinUrl = `https://linkedin.com/in/${personToken}`;

  const draft: CurriculumDraft = {
    root: {
      id: "cv-main",
      schema_version: "1.0.0",
      default_locale: "pt-BR",
      supported_locales: ["pt-BR", "en"],
      profile_mode: "private",
      updated: "2026-02-19",
      sections: {
        profile: "curriculum/profile.yaml",
        summary: "curriculum/summary.yaml",
        experience: "curriculum/experience.yaml",
        projects: "curriculum/projects.yaml",
        education: "curriculum/education.yaml",
        skills: "curriculum/skills.yaml",
        languages: "curriculum/languages.yaml",
        links: "curriculum/links.yaml",
      },
      exports: {
        json_resume: true,
        json_resume_path: "dist/cv.resume.json",
      },
    },
    enums: {
      profile_mode: ["public", "private"],
      work_model: ["remote", "hybrid", "on-site"],
      language_level: ["native", "c2", "c1", "b2", "b1", "a2", "a1"],
      skill_level: ["beginner", "intermediate", "advanced", "expert"],
      education_status: ["in-progress", "completed", "paused"],
      link_kind: [
        "portfolio",
        "github",
        "linkedin",
        "company",
        "repo",
        "article",
        "certificate",
        "talk",
        "demo",
        "contact",
      ],
    },
    sections: {
      profile: {
        profile: {
          id: "profile-main",
          name: { "pt-BR": fullName, en: fullName },
          title: {
            "pt-BR": "Desenvolvedor de Software",
            en: "Software Developer",
          },
          location: {
            country_code: "BR",
            region: { "pt-BR": "Regiao Teste", en: "Test Region" },
          },
          contact: { email, picture_url: pictureUrl },
          links: ["linkedin-main", "github-main", "portfolio-main"],
          availability: { work_model: ["remote"] },
        },
      },
      summary: {
        summary: {
          id: "summary-main",
          professional_summary: { "pt-BR": "Resumo", en: "Summary" },
          objective: { "pt-BR": "Objetivo", en: "Objective" },
        },
      },
      links: {
        links: [
          {
            id: "linkedin-main",
            kind: "linkedin",
            url: linkedinUrl,
            label: { "pt-BR": "LinkedIn", en: "LinkedIn" },
            visibility: "public",
          },
          {
            id: "github-main",
            kind: "github",
            url: githubUrl,
            label: { "pt-BR": "GitHub", en: "GitHub" },
            visibility: "public",
          },
          {
            id: "portfolio-main",
            kind: "portfolio",
            url: projectUrl,
            label: { "pt-BR": "Portfólio", en: "Portfolio" },
            visibility: "public",
          },
          {
            id: "lar-company",
            kind: "company",
            url: companyUrl,
            label: { "pt-BR": "Empresa", en: "Company" },
            visibility: "public",
          },
          {
            id: "project-main",
            kind: "repo",
            url: `${githubUrl}/${projectToken}`,
            label: { "pt-BR": "Projeto", en: "Project" },
            visibility: "public",
          },
        ],
      },
      projects: {
        projects: [
          {
            id: "project-1",
            name: { "pt-BR": "Projeto A", en: "Project A" },
            description: { "pt-BR": "Descricao A", en: "Description A" },
            links: ["project-main"],
            technologies: ["dotnet"],
          },
        ],
      },
      experience: {
        experience: [
          {
            id: "exp-1",
            company: {
              name: { "pt-BR": "Empresa", en: "Company" },
              website: "lar-company",
            },
            role: { "pt-BR": "Desenvolvedor", en: "Developer" },
            start: "2024-01",
            end: "present",
            achievements: [{ "pt-BR": "Feito X", en: "Did X" }],
            related_links: ["lar-company"],
            technologies: ["dotnet"],
          },
        ],
      },
      education: {
        education: [
          {
            id: "edu-1",
            institution: {
              name: { "pt-BR": "Universidade", en: "University" },
              short_name: "U",
              website: "https://uni.example.com",
            },
            degree: { "pt-BR": "Computacao", en: "Computer Science" },
            study_type: { "pt-BR": "Bacharelado", en: "Bachelor" },
            start: "2020-01",
            end: "2025-01",
            status: "completed",
          },
        ],
      },
      skills: {
        skills: [
          {
            id: "skill-1",
            name: { "pt-BR": ".NET", en: ".NET" },
            level: "advanced",
            category: "backend",
            references: ["exp-1", "project-1"],
          },
        ],
      },
      languages: {
        languages: [
          {
            id: "lang-1",
            code: "pt-BR",
            name: { "pt-BR": "Português", en: "Portuguese" },
            level: "native",
          },
        ],
      },
    },
  };

  if (typeof mutate === "function") mutate(draft);

  fs.mkdirSync(path.join(repoRoot, "curriculum/_registry"), {
    recursive: true,
  });
  saveYamlFile(path.join(repoRoot, "curriculum/cv.yaml"), draft.root);
  saveYamlFile(path.join(repoRoot, "curriculum/_registry/enums.yaml"), draft.enums);
  saveYamlFile(path.join(repoRoot, "curriculum/profile.yaml"), draft.sections.profile);
  saveYamlFile(path.join(repoRoot, "curriculum/summary.yaml"), draft.sections.summary);
  saveYamlFile(path.join(repoRoot, "curriculum/experience.yaml"), draft.sections.experience);
  saveYamlFile(path.join(repoRoot, "curriculum/projects.yaml"), draft.sections.projects);
  saveYamlFile(path.join(repoRoot, "curriculum/education.yaml"), draft.sections.education);
  saveYamlFile(path.join(repoRoot, "curriculum/skills.yaml"), draft.sections.skills);
  saveYamlFile(path.join(repoRoot, "curriculum/languages.yaml"), draft.sections.languages);
  saveYamlFile(path.join(repoRoot, "curriculum/links.yaml"), draft.sections.links);
}

export function writeMetaFixture(repoRoot: string, mutate?: (draft: MetaDraft) => void): void {
  const docToken = randToken("doc");
  const draft: MetaDraft = {
    categories: [
      {
        id: "workflow",
        name: "Workflow",
        description: "Workflow docs",
        aliases: ["flow"],
      },
      {
        id: "documentation",
        name: "Documentation",
        description: "Docs",
        aliases: ["docs"],
      },
    ],
    priorities: [
      {
        id: "low",
        name: "Low",
        description: "Low priority",
        aliases: ["minor"],
        rank: 1,
      },
      {
        id: "high",
        name: "High",
        description: "High priority",
        aliases: ["major"],
        rank: 3,
      },
    ],
    statuses: [
      { id: "draft", name: "Draft", description: "Draft", aliases: ["wip"] },
      {
        id: "approved",
        name: "Approved",
        description: "Approved",
        aliases: ["done"],
      },
    ],
    meta: {
      id: "doc-main",
      title: `Main ${docToken}`,
      doc_type: "guide",
      category: "workflow",
      priority: "high",
      status: "approved",
      created: "2026-02-19",
      updated: "2026-02-19",
      version: "1.0.0",
      changelog: ["Initial version"],
      relates: ["specs/doc-main.md"],
    },
  };

  if (typeof mutate === "function") mutate(draft);

  fs.mkdirSync(path.join(repoRoot, "specs/_registry"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "specs"), { recursive: true });
  saveYamlFile(path.join(repoRoot, "specs/_registry/categories.yaml"), draft.categories);
  saveYamlFile(path.join(repoRoot, "specs/_registry/priorities.yaml"), draft.priorities);
  saveYamlFile(path.join(repoRoot, "specs/_registry/statuses.yaml"), draft.statuses);
  fs.writeFileSync(path.join(repoRoot, "specs/doc-main.md"), "# Doc\n", "utf8");
  saveYamlFile(path.join(repoRoot, "specs/doc-main.meta.yaml"), draft.meta);
}
