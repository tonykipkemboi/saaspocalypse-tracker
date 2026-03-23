import { useParams, Link } from "wouter";
import companiesData from "@/data/enriched.json";
import pricesData from "@/data/prices.json";
import type { Company, Quote } from "@shared/schema";
import {
  ArrowLeft,
  ExternalLink,
  Quote as QuoteIcon,
  Building2,
  Globe,
  Tag,
  FileText,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Share2,
} from "lucide-react";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

const companies = companiesData as Company[];
const prices = pricesData as Record<
  string,
  {
    price: number;
    change: number;
    changePercent: number;
    marketCap: number;
    yearHigh: number;
    yearLow: number;
  }
>;

const STANCE_LABELS: Record<string, string> = {
  offensive: "OFFENSIVE",
  "offensive-defensive": "OFF/DEF",
  "defensive-offensive": "DEF/OFF",
  defensive: "DEFENSIVE",
  neutral: "NEUTRAL",
  silent: "SILENT",
};

const STANCE_CLASSES: Record<string, string> = {
  offensive: "stance-offensive",
  "offensive-defensive": "stance-offensive-defensive",
  "defensive-offensive": "stance-defensive-offensive",
  defensive: "stance-defensive",
  neutral: "stance-neutral",
  silent: "stance-silent",
};

function shareToX(quote: Quote, company: Company) {
  const text = `"${quote.text.length > 200 ? quote.text.slice(0, 200) + "..." : quote.text}"\n\n— ${quote.speaker}, ${company.name} (${company.ticker}) ${company.quarter}\n\n🔥 SaaSpocalypse Tracker`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer,width=550,height=420");
}

export default function CompanyDetail() {
  const { ticker } = useParams<{ ticker: string }>();
  const company = companies.find(
    (c) => c.ticker.toUpperCase() === ticker?.toUpperCase()
  );

  if (!company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary mb-2">
            TICKER NOT FOUND
          </p>
          <p className="text-muted-foreground text-sm mb-4">
            {ticker} is not in the SoR tracker
          </p>
          <Link
            href="/"
            className="text-primary text-sm hover:underline flex items-center gap-1 justify-center"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const price = prices[company.ticker];

  // Find adjacent companies for navigation
  const idx = companies.findIndex((c) => c.ticker === company.ticker);
  const prev = idx > 0 ? companies[idx - 1] : null;
  const next = idx < companies.length - 1 ? companies[idx + 1] : null;

  const yearRange =
    price && price.yearHigh > price.yearLow
      ? ((price.price - price.yearLow) / (price.yearHigh - price.yearLow)) * 100
      : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <header className="border-b border-border bg-card px-4 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-xs"
            data-testid="back-to-dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="tracking-wider">DASHBOARD</span>
          </Link>
          <span className="text-border">/</span>
          <span className="text-sm font-bold text-primary tracking-wider glow-amber">
            {company.ticker}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {prev && (
            <Link
              href={`/company/${prev.ticker}`}
              className="text-[10px] text-muted-foreground hover:text-foreground tracking-wider px-2 py-1 border border-border rounded hover:border-primary/30 transition-colors"
              data-testid="nav-prev"
            >
              ← {prev.ticker}
            </Link>
          )}
          {next && (
            <Link
              href={`/company/${next.ticker}`}
              className="text-[10px] text-muted-foreground hover:text-foreground tracking-wider px-2 py-1 border border-border rounded hover:border-primary/30 transition-colors"
              data-testid="nav-next"
            >
              {next.ticker} →
            </Link>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          {/* Company header card */}
          <div className="border border-border rounded bg-card p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-lg font-bold tracking-wide">
                    {company.name}
                  </h1>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                      STANCE_CLASSES[company.stance] || "stance-neutral"
                    }`}
                  >
                    {STANCE_LABELS[company.stance] ||
                      company.stance.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {company.ticker} · {company.exchange}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {company.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {company.country}
                  </span>
                </div>
              </div>
              {/* Price card */}
              <div className="text-right">
                {price ? (
                  <div>
                    <div className="text-lg font-bold tabular-nums">
                      ${price.price.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <span
                        className={`text-xs tabular-nums font-medium flex items-center gap-0.5 ${
                          price.changePercent > 0
                            ? "text-[#00ff41]"
                            : price.changePercent < 0
                            ? "text-[#ff3b30]"
                            : "text-muted-foreground"
                        }`}
                      >
                        {price.changePercent > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : price.changePercent < 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : (
                          <Minus className="w-3 h-3" />
                        )}
                        {price.changePercent > 0 ? "+" : ""}
                        {price.changePercent.toFixed(2)}%
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        (${price.change > 0 ? "+" : ""}{price.change.toFixed(2)})
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground tracking-wider mt-1">
                      MKT CAP ${price.marketCap}B
                    </div>
                    {/* 52-week range bar */}
                    <div className="mt-2 w-40 ml-auto">
                      <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full bg-primary rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, yearRange))}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5 tabular-nums">
                        <span>${price.yearLow.toFixed(0)}</span>
                        <span className="text-[8px]">52W</span>
                        <span>${price.yearHigh.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-lg font-bold tabular-nums">
                      ${company.marketCap}B
                    </div>
                    <div className="text-[10px] text-muted-foreground tracking-wider">
                      MKT CAP
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description + What is the record */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-[10px] text-muted-foreground tracking-wider mb-1 uppercase font-medium">
                  Description
                </div>
                <p className="text-foreground/80 leading-relaxed">
                  {company.description}
                </p>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground tracking-wider mb-1 uppercase font-medium">
                  System of Record
                </div>
                <p className="text-foreground/80 leading-relaxed">
                  {company.whatIsRecord}
                </p>
              </div>
            </div>

            {/* Perplexity Finance link */}
            <div className="mt-3 pt-3 border-t border-border/50">
              <a
                href={`https://perplexity.ai/finance/${company.ticker}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
                data-testid="perplexity-finance-link"
              >
                <ExternalLink className="w-3 h-3" />
                View on Perplexity Finance →
              </a>
            </div>
          </div>

          {/* AI Summary */}
          <div className="border border-border rounded bg-card p-5">
            <h2 className="text-xs font-bold tracking-wider text-primary mb-3 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              SAASPOCALYPSE ANALYSIS — {company.quarter}
            </h2>
            <p className="text-xs text-foreground/85 leading-relaxed">
              {company.summary}
            </p>
            {company.notes && (
              <p className="text-[11px] text-muted-foreground mt-3 italic border-t border-border/50 pt-3">
                {company.notes}
              </p>
            )}
          </div>

          {/* Themes */}
          {company.themes.length > 0 && (
            <div className="border border-border rounded bg-card p-5">
              <h2 className="text-xs font-bold tracking-wider text-primary mb-3">
                THEMES
              </h2>
              <div className="flex flex-wrap gap-2">
                {company.themes.map((theme, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded text-[11px] bg-muted text-foreground/80 border border-border/50"
                    data-testid={`theme-${i}`}
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quotes */}
          <div className="border border-border rounded bg-card p-5">
            <h2 className="text-xs font-bold tracking-wider text-primary mb-4 flex items-center gap-2">
              <QuoteIcon className="w-3.5 h-3.5" />
              TRANSCRIPT QUOTES ({company.quotes.length})
            </h2>
            {company.quotes.length > 0 ? (
              <div className="space-y-4">
                {company.quotes.map((quote, i) => (
                  <QuoteCard
                    key={i}
                    quote={quote}
                    index={i}
                    company={company}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No direct quotes extracted for this company.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground flex items-center justify-between flex-shrink-0">
        <span>
          Earnings data via{" "}
          <a
            href="https://perplexity.ai/finance"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Perplexity Finance
          </a>
        </span>
        <PerplexityAttribution />
      </footer>
    </div>
  );
}

function QuoteCard({
  quote,
  index,
  company,
}: {
  quote: Quote;
  index: number;
  company: Company;
}) {
  return (
    <div
      className="border-l-2 border-primary/40 pl-4 py-1 group"
      data-testid={`quote-${index}`}
    >
      <p className="text-xs text-foreground/90 leading-relaxed italic mb-2">
        "{quote.text}"
      </p>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="font-medium text-foreground/70">{quote.speaker}</span>
        {quote.timestamp && (
          <span className="flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {quote.timestamp}
          </span>
        )}
        <button
          onClick={() => shareToX(quote, company)}
          className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 opacity-0 group-hover:opacity-100 transition-all"
          data-testid={`share-quote-${index}`}
          title="Share on X"
        >
          <XLogo className="w-3 h-3" />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-label="X (formerly Twitter)"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
