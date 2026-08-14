"use client";

interface VideoSchemaProps {
  title: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  embedUrl: string;
  duration?: string;
  seriesTitle?: string;
}

export function VideoObjectSchema({
  title,
  description,
  thumbnailUrl,
  uploadDate,
  embedUrl,
  duration = "PT15M",
  seriesTitle = "Sri Explainer"
}: VideoSchemaProps) {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": title,
    "description": description || `Watch ${title} on Sri Explainer - High Quality Anime & Explainer Series.`,
    "thumbnailUrl": [thumbnailUrl || "https://sriexplainer.com/logo.png"],
    "uploadDate": uploadDate || new Date().toISOString(),
    "duration": duration,
    "embedUrl": embedUrl,
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": { "@type": "WatchAction" },
      "userInteractionCount": 1250
    },
    "publisher": {
      "@type": "Organization",
      "name": "Sri Explainer",
      "logo": {
        "@type": "ImageObject",
        "url": "https://sriexplainer.com/logo.png"
      }
    },
    "partOfSeries": {
      "@type": "TVSeries",
      "name": seriesTitle
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}

interface SeriesSchemaProps {
  title: string;
  description: string;
  imageUrl: string;
  genre?: string;
  year?: number | string;
}

export function TVSeriesSchema({
  title,
  description,
  imageUrl,
  genre = "Anime & Explainer",
  year = 2026
}: SeriesSchemaProps) {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    "name": title,
    "description": description || `Stream ${title} full recap series on Sri Explainer.`,
    "image": imageUrl || "https://sriexplainer.com/logo.png",
    "genre": genre,
    "startDate": `${year}-01-01`,
    "publisher": {
      "@type": "Organization",
      "name": "Sri Explainer",
      "logo": {
        "@type": "ImageObject",
        "url": "https://sriexplainer.com/logo.png"
      }
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}
