import * as cheerio from "cheerio";
import { SEOAuditReport, AuditItem } from "./seo-types";

export async function parseAndAuditSEO(targetUrl: string): Promise<SEOAuditReport> {
  const startTime = Date.now();

  let formattedUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = `https://${formattedUrl}`;
  }

  const parsedUrlObj = new URL(formattedUrl);
  const domain = parsedUrlObj.hostname;
  const isHttps = parsedUrlObj.protocol === "https:";

  // Fetch target HTML page
  const response = await fetch(formattedUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SriExplainerSEOBot/1.0",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    signal: AbortSignal.timeout(12000)
  });

  const responseTimeMs = Date.now() - startTime;
  const html = await response.text();
  const pageSizeBytes = Buffer.byteLength(html, "utf8");

  const $ = cheerio.load(html);

  // Extract Meta Elements
  const title = $("title").first().text().trim() || "";
  const description = $('meta[name="description" i]').attr("content")?.trim() ||
                      $('meta[property="og:description" i]').attr("content")?.trim() || "";
  const canonical = $('link[rel="canonical" i]').attr("href")?.trim() || "";
  const robots = $('meta[name="robots" i]').attr("content")?.trim() || "";
  const viewport = $('meta[name="viewport" i]').attr("content")?.trim() || "";
  const charset = $('meta[charset="utf-8" i]').attr("charset") || $('meta[http-equiv="Content-Type" i]').attr("content") || "utf-8";
  const favicon = $('link[rel="icon" i]').attr("href") || $('link[rel="shortcut icon" i]').attr("href") || "/favicon.ico";

  // OpenGraph & Social Media Tags
  const ogTitle = $('meta[property="og:title" i]').attr("content")?.trim() || title;
  const ogDescription = $('meta[property="og:description" i]').attr("content")?.trim() || description;
  const ogImage = $('meta[property="og:image" i]').attr("content")?.trim() || "";
  const ogUrl = $('meta[property="og:url" i]').attr("content")?.trim() || formattedUrl;
  const twitterCard = $('meta[name="twitter:card" i]').attr("content")?.trim() || "";

  // Extract Headings
  const h1s: string[] = [];
  $("h1").each((_, el) => {
    const txt = $(el).text().trim();
    if (txt) h1s.push(txt);
  });

  const h2s: string[] = [];
  $("h2").each((_, el) => {
    const txt = $(el).text().trim();
    if (txt) h2s.push(txt);
  });

  const h3s: string[] = [];
  $("h3").each((_, el) => {
    const txt = $(el).text().trim();
    if (txt) h3s.push(txt);
  });

  // Extract Images
  let totalImages = 0;
  let missingAltCount = 0;
  $("img").each((_, el) => {
    totalImages++;
    const alt = $(el).attr("alt");
    if (!alt || alt.trim() === "") {
      missingAltCount++;
    }
  });

  // Technical checks (robots.txt & sitemap.xml)
  let hasRobotsTxt = false;
  let hasSitemap = false;

  try {
    const robotsRes = await fetch(`${parsedUrlObj.origin}/robots.txt`, { method: "HEAD", signal: AbortSignal.timeout(4000) });
    hasRobotsTxt = robotsRes.ok;
  } catch {
    hasRobotsTxt = false;
  }

  try {
    const sitemapRes = await fetch(`${parsedUrlObj.origin}/sitemap.xml`, { method: "HEAD", signal: AbortSignal.timeout(4000) });
    hasSitemap = sitemapRes.ok;
  } catch {
    hasSitemap = false;
  }

  // Audit Evaluations & Scoring Rules
  const auditItems: AuditItem[] = [];

  // 1. Meta Title Audit
  if (!title) {
    auditItems.push({
      id: "title-missing",
      category: "meta",
      title: "Meta Title Tag",
      status: "fail",
      score: 0,
      details: "No `<title>` tag was found on the page.",
      recommendation: "Add a descriptive `<title>` tag between 50 and 60 characters long.",
      snippet: "<title>Sri Explainer | Story Explainers & Recaps</title>"
    });
  } else if (title.length < 30) {
    auditItems.push({
      id: "title-short",
      category: "meta",
      title: "Meta Title Tag Length",
      status: "warning",
      score: 65,
      details: `Title is short (${title.length} chars). Ideal length is 50-60 characters.`,
      recommendation: "Expand your title tag to include main target keywords.",
      snippet: `<title>${title}</title>`
    });
  } else if (title.length > 65) {
    auditItems.push({
      id: "title-long",
      category: "meta",
      title: "Meta Title Tag Length",
      status: "warning",
      score: 75,
      details: `Title is long (${title.length} chars) and may be truncated by Google.`,
      recommendation: "Keep your title tag under 60 characters.",
      snippet: `<title>${title}</title>`
    });
  } else {
    auditItems.push({
      id: "title-pass",
      category: "meta",
      title: "Meta Title Tag",
      status: "pass",
      score: 100,
      details: `Title tag length is optimal (${title.length} characters).`,
      snippet: `<title>${title}</title>`
    });
  }

  // 2. Meta Description Audit
  if (!description) {
    auditItems.push({
      id: "desc-missing",
      category: "meta",
      title: "Meta Description",
      status: "fail",
      score: 0,
      details: "No meta description tag found.",
      recommendation: "Add a compelling meta description between 120 and 160 characters long.",
      snippet: '<meta name="description" content="Watch story explainers and recaps..." />'
    });
  } else if (description.length < 70) {
    auditItems.push({
      id: "desc-short",
      category: "meta",
      title: "Meta Description Length",
      status: "warning",
      score: 70,
      details: `Meta description is short (${description.length} chars). Ideal length is 120-160 chars.`,
      recommendation: "Provide a detailed summary of page content to increase search click-through rate.",
      snippet: `<meta name="description" content="${description}" />`
    });
  } else {
    auditItems.push({
      id: "desc-pass",
      category: "meta",
      title: "Meta Description",
      status: "pass",
      score: 100,
      details: `Meta description is optimal (${description.length} characters).`,
      snippet: `<meta name="description" content="${description}" />`
    });
  }

  // 3. Heading H1 Audit
  if (h1s.length === 0) {
    auditItems.push({
      id: "h1-missing",
      category: "content",
      title: "H1 Heading Tag",
      status: "fail",
      score: 0,
      details: "No `<h1>` heading tag found on the page.",
      recommendation: "Include exactly one main `<h1>` tag containing primary keywords.",
      snippet: "<h1>Demon Hunter S1 Story Explainer</h1>"
    });
  } else if (h1s.length > 1) {
    auditItems.push({
      id: "h1-multiple",
      category: "content",
      title: "H1 Heading Count",
      status: "warning",
      score: 70,
      details: `Found ${h1s.length} H1 tags. Best practice is to use exactly one H1 per page.`,
      recommendation: "Convert secondary H1 tags into H2 or H3 tags.",
      snippet: `<h1>${h1s[0]}</h1>`
    });
  } else {
    auditItems.push({
      id: "h1-pass",
      category: "content",
      title: "H1 Heading Tag",
      status: "pass",
      score: 100,
      details: `Page contains 1 primary H1 heading: "${h1s[0]}".`,
      snippet: `<h1>${h1s[0]}</h1>`
    });
  }

  // 4. OpenGraph & Social Cards
  if (!ogTitle || !ogImage) {
    auditItems.push({
      id: "og-missing",
      category: "social",
      title: "OpenGraph Social Cards",
      status: "warning",
      score: 50,
      details: "Missing OpenGraph social tags (`og:image` or `og:title`).",
      recommendation: "Add OpenGraph meta tags so links display rich preview cards when shared on WhatsApp, Telegram, and Facebook.",
      snippet: '<meta property="og:image" content="https://sriexplainer.in/banner.jpg" />'
    });
  } else {
    auditItems.push({
      id: "og-pass",
      category: "social",
      title: "OpenGraph Social Cards",
      status: "pass",
      score: 100,
      details: "OpenGraph social preview card tags are present.",
      snippet: `<meta property="og:image" content="${ogImage}" />`
    });
  }

  // 5. Image Alt Attributes
  if (totalImages > 0 && missingAltCount > 0) {
    const altScore = Math.max(0, Math.round(((totalImages - missingAltCount) / totalImages) * 100));
    auditItems.push({
      id: "img-alt-missing",
      category: "images",
      title: "Image Alt Attributes",
      status: altScore > 80 ? "warning" : "fail",
      score: altScore,
      details: `${missingAltCount} out of ${totalImages} images are missing descriptive \`alt\` text.`,
      recommendation: "Add alt attributes to all image tags so search engines can index image content.",
      snippet: '<img src="poster.jpg" alt="Demon Hunter S1 Poster" />'
    });
  } else if (totalImages > 0) {
    auditItems.push({
      id: "img-alt-pass",
      category: "images",
      title: "Image Alt Attributes",
      status: "pass",
      score: 100,
      details: `All ${totalImages} images contain descriptive alt text.`
    });
  } else {
    auditItems.push({
      id: "img-none",
      category: "images",
      title: "Image Assets",
      status: "pass",
      score: 100,
      details: "No images detected on target page."
    });
  }

  // 6. HTTPS SSL Security
  if (!isHttps) {
    auditItems.push({
      id: "ssl-missing",
      category: "technical",
      title: "SSL HTTPS Security",
      status: "fail",
      score: 0,
      details: "Website is served over insecure HTTP.",
      recommendation: "Redirect all HTTP traffic to HTTPS with an active SSL certificate.",
      snippet: "https://" + domain
    });
  } else {
    auditItems.push({
      id: "ssl-pass",
      category: "technical",
      title: "SSL HTTPS Security",
      status: "pass",
      score: 100,
      details: "Website is secured with HTTPS."
    });
  }

  // 7. Robots.txt & Sitemap
  if (!hasRobotsTxt) {
    auditItems.push({
      id: "robots-missing",
      category: "technical",
      title: "Robots.txt File",
      status: "warning",
      score: 50,
      details: "No `robots.txt` file detected at domain root.",
      recommendation: "Create a robots.txt file to guide search engine crawlers.",
      snippet: "User-agent: *\nAllow: /"
    });
  } else {
    auditItems.push({
      id: "robots-pass",
      category: "technical",
      title: "Robots.txt File",
      status: "pass",
      score: 100,
      details: "Active `robots.txt` file detected."
    });
  }

  if (!hasSitemap) {
    auditItems.push({
      id: "sitemap-missing",
      category: "technical",
      title: "XML Sitemap",
      status: "warning",
      score: 50,
      details: "No `sitemap.xml` file detected.",
      recommendation: "Generate an XML sitemap and submit it to Google Search Console.",
      snippet: "https://" + domain + "/sitemap.xml"
    });
  } else {
    auditItems.push({
      id: "sitemap-pass",
      category: "technical",
      title: "XML Sitemap",
      status: "pass",
      score: 100,
      details: "Active `sitemap.xml` file detected."
    });
  }

  // Category Scores Calculation
  const calcCatScore = (cat: string) => {
    const items = auditItems.filter(i => i.category === cat);
    if (items.length === 0) return 100;
    return Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length);
  };

  const categoryScores = {
    meta: calcCatScore("meta"),
    content: calcCatScore("content"),
    social: calcCatScore("social"),
    technical: calcCatScore("technical"),
    images: calcCatScore("images")
  };

  // Weighted Overall Score
  const overallScore = Math.round(
    categoryScores.meta * 0.3 +
    categoryScores.content * 0.25 +
    categoryScores.technical * 0.25 +
    categoryScores.social * 0.1 +
    categoryScores.images * 0.1
  );

  let grade: "A+" | "A" | "B" | "C" | "D" | "F" = "F";
  if (overallScore >= 95) grade = "A+";
  else if (overallScore >= 85) grade = "A";
  else if (overallScore >= 75) grade = "B";
  else if (overallScore >= 65) grade = "C";
  else if (overallScore >= 50) grade = "D";

  return {
    url: formattedUrl,
    normalizedUrl: formattedUrl,
    domain,
    timestamp: new Date().toISOString(),
    overallScore,
    grade,
    metrics: {
      responseTimeMs,
      pageSizeBytes,
      titleLength: title.length,
      descriptionLength: description.length,
      totalHeadings: h1s.length + h2s.length + h3s.length,
      h1Count: h1s.length,
      totalImages,
      missingAltCount
    },
    meta: {
      title,
      description,
      canonical,
      robots,
      viewport,
      charset,
      favicon,
      ogTitle,
      ogDescription,
      ogImage,
      ogUrl,
      twitterCard
    },
    headings: {
      h1s,
      h2s,
      h3s
    },
    technical: {
      isHttps,
      hasRobotsTxt,
      hasSitemap,
      hasViewport: !!viewport
    },
    categoryScores,
    auditItems
  };
}
