import { useState, useMemo } from "react";
import { Link } from "wouter";
import companiesData from "@/data/enriched.json";
import pricesData from "@/data/prices.json";
import type { Company } from "@shared/schema";
import {
  ArrowLeft,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  GitCompareArrows,
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

function PriceChange({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="text-[#00ff41] flex items-center gap-0.5">
        <TrendingUp className="w-3 h-3" />+{value.toFixed(2)}%
      </span>
    );
  if (value < 0)
    return (
      <span className="text-[#ff3b30] flex items-center gap-0.5">
        <TrendingDown className="w-3 h-3" />
        {value.toFixed(2)}%
      </span>
    );
  return (
    <span className="text-muted-foreground flex items-center gap-0.5">
      <Minus className="w-3 h-3" />
      0.00%
    </span>
  );
}

function YTDBar({ price, yearHigh, yearLow }: { price: number; yearHigh: number; yearLow: number }) {
  const range = yearHigh - yearLow;
  const pos = range > 0 ? ((price - yearLow) / range) * 100 : 50;
  return (
    <div className="w-full">
      <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-primary rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, pos))}%` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5 tabular-nums">
        <span>${yearLow.toFixed(0)}</span>
        <span>${yearHigh.toFixed(0)}</span>
      </div>
    </div>
  );
}

export default function Compare() {
  const [selected, setSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return companies
      .filter(
        (c) =>
          !selected.includes(c.ticker) &&
          (c.ticker.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [searchQuery, selected]);

  const selectedCompanies = useMemo(
    () =>
      selected
        .map((t) => companies.find((c) => c.ticker === t))
        .filter(Boolean) as Company[],
    [selected]
  );

  const addCompany = (ticker: string) => {
    if (selected.length < 4 && !selected.includes(ticker)) {
      setSelected([...selected, ticker]);
      setSearchQuery("");
    }
  };

  const removeCompany = (ticker: string) => {
    setSelected(selected.filter((t) => t !== ticker));
  };

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
            <GitCompareArrows className="w-3.5 h-3.5" />
            COMPARE
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground tracking-wider">
          UP TO 4 COMPANIES
        </span>
      </header>

      {/* Company picker */}
      <div className="px-4 py-3 border-b border-border bg-card/50 flex-shrink-0">
        <div className="flex gap-2 items-center flex-wrap">
          {selected.map((ticker) => {
            const co = companies.find((c) => c.ticker === ticker);
            return (
              <div
                key={ticker}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-card border border-primary/30 rounded text-xs"
              >
                <span className="font-bold text-primary">{ticker}</span>
                <span className="text-muted-foreground text-[10px]">
                  {co?.name}
                </span>
                <button
                  onClick={() => removeCompany(ticker)}
                  className="text-muted-foreground hover:text-destructive ml-1"
                  data-testid={`remove-${ticker}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
          {selected.length < 4 && (
            <div className="relative">
              <div className="flex items-center gap-1.5 px-2.5 py-1 border border-border rounded text-xs">
                <Plus className="w-3 h-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Add company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-mono w-32 placeholder:text-muted-foreground"
                  data-testid="compare-search-input"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded shadow-lg z-20">
                  {searchResults.map((c) => (
                    <button
                      key={c.ticker}
                      onClick={() => addCompany(c.ticker)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 flex items-center gap-2 transition-colors"
                      data-testid={`add-${c.ticker}`}
                    >
                      <span className="font-bold text-primary">{c.ticker}</span>
                      <span className="text-muted-foreground">{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Comparison content */}
      <div className="flex-1 overflow-auto px-4 py-4">
        {selectedCompanies.length === 0 ? (
          <div className="flex items-center justify-center h-60 text-muted-foreground">
            <div className="text-center space-y-2">
              <GitCompareArrows className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-sm">Select 2-4 companies to compare</p>
              <p className="text-xs opacity-60">
                Compare AI stances, quote counts, themes, and market data
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-full">
            {/* Overview comparison table */}
            <div className="border border-border rounded bg-card overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-muted-foreground font-medium tracking-wider w-32">
                      METRIC
                    </th>
                    {selectedCompanies.map((c) => (
                      <th
                        key={c.ticker}
                        className="px-3 py-2 text-center font-bold text-primary tracking-wider min-w-[180px]"
                      >
                        <Link href={`/company/${c.ticker}`} className="hover:underline">
                          {c.ticker}
                        </Link>
                        <div className="text-[10px] text-muted-foreground font-normal">
                          {c.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Stance */}
                  <tr className="border-b border-border/50">
                    <td className="px-3 py-2.5 text-muted-foreground tracking-wider">STANCE</td>
                    {selectedCompanies.map((c) => (
                      <td key={c.ticker} className="px-3 py-2.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                            STANCE_CLASSES[c.stance] || "stance-neutral"
                          }`}
                        >
                          {STANCE_LABELS[c.stance] || c.stance.toUpperCase()}
                        </span>
                      </td>
                    ))}
                  </tr>
                  {/* Category */}
                  <tr className="border-b border-border/50">
                    <td className="px-3 py-2.5 text-muted-foreground tracking-wider">CATEGORY</td>
                    {selectedCompanies.map((c) => (
                      <td key={c.ticker} className="px-3 py-2.5 text-center text-foreground/80">
                        {c.category}
                      </td>
                    ))}
                  </tr>
                  {/* Market Cap */}
                  <tr className="border-b border-border/50">
                    <td className="px-3 py-2.5 text-muted-foreground tracking-wider">MKT CAP</td>
                    {selectedCompanies.map((c) => {
                      const p = prices[c.ticker];
                      return (
                        <td key={c.ticker} className="px-3 py-2.5 text-center tabular-nums font-medium">
                          ${p ? `${p.marketCap}B` : `${c.marketCap}B`}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Price */}
                  <tr className="border-b border-border/50">
                    <td className="px-3 py-2.5 text-muted-foreground tracking-wider">PRICE</td>
                    {selectedCompanies.map((c) => {
                      const p = prices[c.ticker];
                      return (
                        <td key={c.ticker} className="px-3 py-2.5 text-center tabular-nums">
                          {p ? (
                            <div>
                              <span className="font-medium">${p.price.toFixed(2)}</span>
                              <div className="mt-0.5">
                                <PriceChange value={p.changePercent} />
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  {/* 52-Week Range */}
                  <tr className="border-b border-border/50">
                    <td className="px-3 py-2.5 text-muted-foreground tracking-wider">52W RANGE</td>
                    {selectedCompanies.map((c) => {
                      const p = prices[c.ticker];
                      return (
                        <td key={c.ticker} className="px-3 py-2.5">
                          {p ? (
                            <div className="px-2">
                              <YTDBar price={p.price} yearHigh={p.yearHigh} yearLow={p.yearLow} />
                            </div>
                          ) : (
                            <span className="text-center block text-muted-foreground">N/A</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Quotes count */}
                  <tr className="border-b border-border/50">
                    <td className="px-3 py-2.5 text-muted-foreground tracking-wider">QUOTES</td>
                    {selectedCompanies.map((c) => (
                      <td key={c.ticker} className="px-3 py-2.5 text-center tabular-nums font-medium">
                        {c.quotes.length}
                      </td>
                    ))}
                  </tr>
                  {/* Quarter */}
                  <tr className="border-b border-border/50">
                    <td className="px-3 py-2.5 text-muted-foreground tracking-wider">QUARTER</td>
                    {selectedCompanies.map((c) => (
                      <td key={c.ticker} className="px-3 py-2.5 text-center text-muted-foreground">
                        {c.quarter}
                      </td>
                    ))}
                  </tr>
                  {/* SoR */}
                  <tr className="border-b border-border/50">
                    <td className="px-3 py-2.5 text-muted-foreground tracking-wider">
                      SYSTEM OF
                      <br />
                      RECORD
                    </td>
                    {selectedCompanies.map((c) => (
                      <td
                        key={c.ticker}
                        className="px-3 py-2.5 text-center text-foreground/70 text-[11px]"
                      >
                        {c.whatIsRecord}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Themes comparison */}
            <div className="border border-border rounded bg-card p-4">
              <h3 className="text-xs font-bold tracking-wider text-primary mb-3">
                THEMES
              </h3>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedCompanies.length}, 1fr)` }}>
                {selectedCompanies.map((c) => (
                  <div key={c.ticker}>
                    <div className="text-[10px] text-muted-foreground tracking-wider mb-2 font-medium">
                      {c.ticker}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {c.themes.map((theme, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[10px] bg-muted text-foreground/70 border border-border/50"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summaries */}
            <div className="border border-border rounded bg-card p-4">
              <h3 className="text-xs font-bold tracking-wider text-primary mb-3">
                AI STRATEGY SUMMARIES
              </h3>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedCompanies.length}, 1fr)` }}>
                {selectedCompanies.map((c) => (
                  <div key={c.ticker}>
                    <div className="text-[10px] text-muted-foreground tracking-wider mb-2 font-medium">
                      {c.ticker}
                    </div>
                    <p className="text-[11px] text-foreground/80 leading-relaxed">
                      {c.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top quotes */}
            <div className="border border-border rounded bg-card p-4">
              <h3 className="text-xs font-bold tracking-wider text-primary mb-3">
                TOP QUOTES
              </h3>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedCompanies.length}, 1fr)` }}>
                {selectedCompanies.map((c) => (
                  <div key={c.ticker} className="space-y-2">
                    <div className="text-[10px] text-muted-foreground tracking-wider mb-2 font-medium">
                      {c.ticker}
                    </div>
                    {c.quotes.slice(0, 3).map((q, i) => (
                      <div key={i} className="border-l-2 border-primary/30 pl-3 py-1">
                        <p className="text-[11px] text-foreground/80 italic leading-relaxed">
                          "{q.text.length > 200 ? q.text.slice(0, 200) + "..." : q.text}"
                        </p>
                        <div className="text-[9px] text-muted-foreground mt-1">
                          — {q.speaker}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground flex items-center justify-between flex-shrink-0">
        <span>
          Comparison data via{" "}
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
