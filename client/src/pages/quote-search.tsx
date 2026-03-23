import { useState, useMemo } from "react";
import { Link } from "wouter";
import companiesData from "@/data/enriched.json";
import type { Company, Quote } from "@shared/schema";
import { Search, ArrowLeft, Quote as QuoteIcon, Filter } from "lucide-react";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

const companies = companiesData as Company[];

type SearchResult = {
  company: Company;
  quote: Quote;
  quoteIndex: number;
};

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

// Build a flat searchable index
const allQuotes: SearchResult[] = companies.flatMap((company) =>
  company.quotes.map((quote, i) => ({
    company,
    quote,
    quoteIndex: i,
  }))
);

function highlightMatch(text: string, query: string): JSX.Element {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-primary/30 text-primary rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function QuoteSearch() {
  const [query, setQuery] = useState("");
  const [speakerFilter, setSpeakerFilter] = useState("all");
  const [stanceFilter, setStanceFilter] = useState("all");

  const speakers = useMemo(() => {
    const set = new Set<string>();
    allQuotes.forEach((r) => {
      if (r.quote.speaker) set.add(r.quote.speaker);
    });
    return Array.from(set).sort();
  }, []);

  const results = useMemo(() => {
    if (!query.trim() && speakerFilter === "all" && stanceFilter === "all") return [];

    let filtered = allQuotes;

    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.quote.text.toLowerCase().includes(q) ||
          r.quote.speaker?.toLowerCase().includes(q) ||
          r.company.name.toLowerCase().includes(q) ||
          r.company.ticker.toLowerCase().includes(q)
      );
    }

    if (speakerFilter !== "all") {
      filtered = filtered.filter((r) => r.quote.speaker === speakerFilter);
    }

    if (stanceFilter !== "all") {
      filtered = filtered.filter((r) => r.company.stance === stanceFilter);
    }

    return filtered;
  }, [query, speakerFilter, stanceFilter]);

  const totalQuotes = allQuotes.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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
          <span className="text-sm font-bold text-primary tracking-wider glow-amber flex items-center gap-2">
            <QuoteIcon className="w-3.5 h-3.5" />
            QUOTE SEARCH
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground tracking-wider tabular-nums">
          {totalQuotes} QUOTES INDEXED
        </span>
      </header>

      {/* Search bar */}
      <div className="px-4 py-3 border-b border-border bg-card/50 flex-shrink-0">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search quotes... (e.g. 'agentic AI', 'system of record', 'parasites')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-card border border-border rounded font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              data-testid="quote-search-input"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-3 h-3 text-muted-foreground" />
            <select
              value={stanceFilter}
              onChange={(e) => setStanceFilter(e.target.value)}
              className="text-xs bg-card border border-border rounded px-2 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary cursor-pointer"
              data-testid="quote-stance-filter"
            >
              <option value="all">All Stances</option>
              {Object.entries(STANCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={speakerFilter}
              onChange={(e) => setSpeakerFilter(e.target.value)}
              className="text-xs bg-card border border-border rounded px-2 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary cursor-pointer max-w-[200px]"
              data-testid="quote-speaker-filter"
            >
              <option value="all">All Speakers</option>
              {speakers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        {(query.trim() || speakerFilter !== "all" || stanceFilter !== "all") && (
          <div className="mt-2 text-[10px] text-muted-foreground tracking-wider tabular-nums">
            {results.length} RESULT{results.length !== 1 ? "S" : ""} FOUND
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto px-4 py-4">
        {!query.trim() && speakerFilter === "all" && stanceFilter === "all" ? (
          <div className="flex items-center justify-center h-60 text-muted-foreground">
            <div className="text-center space-y-2">
              <QuoteIcon className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-sm">Search across {totalQuotes} earnings call quotes</p>
              <p className="text-xs opacity-60">
                Try: "agentic AI", "system of record", "vibe coding", "parasites"
              </p>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            No quotes match your search
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl">
            {results.map((result, i) => (
              <div
                key={`${result.company.ticker}-${result.quoteIndex}`}
                className="border border-border rounded bg-card p-4 hover:border-primary/30 transition-colors"
                data-testid={`search-result-${i}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Link
                    href={`/company/${result.company.ticker}`}
                    className="font-bold text-primary hover:underline tracking-wide text-xs"
                  >
                    {result.company.ticker}
                  </Link>
                  <span className="text-[10px] text-muted-foreground">
                    {result.company.name}
                  </span>
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${
                      STANCE_CLASSES[result.company.stance] || "stance-neutral"
                    }`}
                  >
                    {STANCE_LABELS[result.company.stance] || result.company.stance.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {result.company.quarter}
                  </span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed italic">
                  "{highlightMatch(result.quote.text, query)}"
                </p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span className="font-medium text-foreground/70">
                    {result.quote.speaker}
                  </span>
                  {result.quote.timestamp && (
                    <span>{result.quote.timestamp}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground flex items-center justify-between flex-shrink-0">
        <span>
          Full-text search across all SoR earnings transcripts via{" "}
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
