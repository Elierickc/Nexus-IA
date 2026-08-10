import { Helmet } from "react-helmet-async";

const SITE_URL = "https://nexusia.pro";
const DEFAULT_OG_IMAGE =
  "https://nexusia.pro/__l5e/assets-v1/d942adc1-34b7-4095-9572-1fbfff68e1f5/og-nexus-ia.jpg";

interface SEOProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
}

export function SEO({ title, description, path, image, type = "website" }: SEOProps) {
  const url = `${SITE_URL}${path}`;
  const ogImage = image ?? DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Nexus IA" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
