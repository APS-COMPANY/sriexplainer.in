export type AuditStatus = "pass" | "warning" | "fail";

export type AuditCategory = "meta" | "content" | "social" | "technical" | "images";

export type AuditItem = {
  id: string;
  category: AuditCategory;
  title: string;
  status: AuditStatus;
  score: number; // 0 to 100
  details: string;
  recommendation?: string;
  snippet?: string;
};

export type SEOAuditReport = {
  url: string;
  normalizedUrl: string;
  domain: string;
  timestamp: string;
  overallScore: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  metrics: {
    responseTimeMs: number;
    pageSizeBytes: number;
    titleLength: number;
    descriptionLength: number;
    totalHeadings: number;
    h1Count: number;
    totalImages: number;
    missingAltCount: number;
  };
  meta: {
    title: string;
    description: string;
    canonical: string;
    robots: string;
    viewport: string;
    charset: string;
    favicon: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    ogUrl: string;
    twitterCard: string;
  };
  headings: {
    h1s: string[];
    h2s: string[];
    h3s: string[];
  };
  technical: {
    isHttps: boolean;
    hasRobotsTxt: boolean;
    hasSitemap: boolean;
    hasViewport: boolean;
  };
  categoryScores: {
    meta: number;
    content: number;
    social: number;
    technical: number;
    images: number;
  };
  auditItems: AuditItem[];
};
