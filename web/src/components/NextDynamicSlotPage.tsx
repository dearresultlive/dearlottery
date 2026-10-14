import type { Metadata, ResolvingMetadata } from 'next';
import React from 'react';
import ResultPage, { DrawRecord } from './ResultPage';

export interface DynamicSlotPageProps {
  params: Promise<{
    date: string;
    slot: string; // e.g. "1pm", "6pm", "8pm"
  }>;
}

/**
 * Technical SEO: Dynamic slot metadata generator for Next.js 14+ App Router
 * Route: /results/[date]/[slot]
 */
export async function generateMetadata(
  { params }: DynamicSlotPageProps,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { date, slot } = await params;
  const slotClean = slot.toUpperCase().replace(/[^0-9A-Z]/g, '');
  const slotFormatted = slotClean.includes('6') ? '6 PM' : slotClean.includes('8') ? '8 PM' : '1 PM';
  
  const title = `Dear Lottery Result Today ${slotFormatted} Live - ${date} | 1st Prize Winning Number`;
  const description = `Dear Lottery Result Today ${slotFormatted} Live on ${date}. Check 1st Prize ₹1 Crore winning ticket, consolation prize, 2nd, 3rd, 4th, and 5th prize numbers. Official gazette PDF & sheet download.`;
  const canonicalUrl = `https://dearresultlive.in/results/${date}/${slot.toLowerCase()}`;

  return {
    title,
    description,
    keywords: [
      `dear lottery result ${slotFormatted.toLowerCase()}`,
      `dear lottery result today ${date}`,
      `lottery sambad ${slotFormatted.toLowerCase()}`,
      'nagaland state lottery',
      '1st prize winning ticket',
      'dear result live'
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Dear Result Live',
      images: [
        {
          url: 'https://dearresultlive.in/og-image.jpg',
          width: 1200,
          height: 630,
          alt: `Dear Lottery Result ${slotFormatted} - ${date}`,
        },
      ],
      locale: 'en_IN',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://dearresultlive.in/og-image.jpg'],
    },
  };
}

/**
 * Server Component Route Handler for Next.js App Router (/results/[date]/[slot])
 * Injects NewsArticle & Table JSON-LD schemas with exact publication timestamps
 */
export default async function NextDynamicSlotPage({ params }: DynamicSlotPageProps) {
  const { date, slot } = await params;
  const slotClean = slot.toUpperCase().replace(/[^0-9A-Z]/g, '');
  const slotFormatted = slotClean.includes('6') ? '6 PM' : slotClean.includes('8') ? '8 PM' : '1 PM';
  
  // Exact publication timestamp in IST (+05:30)
  const pubHour = slotClean.includes('6') ? '18:00:00+05:30' : slotClean.includes('8') ? '20:00:00+05:30' : '13:00:00+05:30';
  const canonicalUrl = `https://dearresultlive.in/results/${date}/${slot.toLowerCase()}`;

  // Fetch initial draws from API
  let initialDraws: DrawRecord[] = [];
  try {
    const res = await fetch(`https://dearresultlive.in/api/draws?date=${date}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      initialDraws = await res.json();
    }
  } catch (err) {
    // Fallback gracefully to default initialDraws
    initialDraws = [];
  }

  // JSON-LD NewsArticle Schema
  const jsonLdNewsArticle = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: `Dear Lottery Result Today ${slotFormatted} Live - ${date} | 1st Prize Winning Number`,
    description: `Official Dear Lottery ${slotFormatted} winning numbers and ₹1 Crore 1st prize ticket for ${date}.`,
    datePublished: `${date}T${pubHour}`,
    dateModified: new Date().toISOString(),
    mainEntityOfPage: canonicalUrl,
    author: {
      '@type': 'Organization',
      name: 'Dear Result Live',
      url: 'https://dearresultlive.in',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Dear Result Live',
      logo: {
        '@type': 'ImageObject',
        url: 'https://dearresultlive.in/favicon.svg',
      },
    },
  };

  // JSON-LD Table & Dataset Schema
  const jsonLdTable = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `Dear Lottery Official Winning Numbers & Prize Table - ${date} ${slotFormatted}`,
    description: `Structured prize breakdown table and winning numbers for Dear Lottery draws on ${date}.`,
    url: canonicalUrl,
    creator: {
      '@type': 'Organization',
      name: 'Dear Result Live',
      url: 'https://dearresultlive.in',
    },
    mainEntity: {
      '@type': 'Table',
      about: `Prize Tier Distribution and Winning Ticket List for ${date} ${slotFormatted}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdNewsArticle) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdTable) }}
      />
      <ResultPage date={date} slot={slot} initialDraws={initialDraws} />
    </>
  );
}
