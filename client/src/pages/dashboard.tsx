import { useState, useMemo } from "react";
import { Link } from "wouter";
import companiesData from "@/data/enriched.json";
import pricesData from "@/data/prices.json";
import type { Company } from "@shared/schema";
import {
  Search,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  Quote as QuoteIcon,
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

const STANCE_ORDER: Record<string, number> = {
  offensive: 0,
  "offensive-defensive": 1,
  "defensive-offensive": 2,
  defensive: 3,
  neutral: 4,
  silent: 5,
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

type SortField = "rank" | "ticker" | "marketCap" | "stance" | "quotes" | "price" | "change";
type SortDir = "asc" | "desc";

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [stanceFilter, setStanceFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const categories = useMemo(() => {
    const cats = new Set(companies.map((c) => c.category));
    return Array.from(cats).sort();
  }, []);

  const stanceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    companies.forEach((c) => {
      counts[c.stance] = (counts[c.stance] || 0) + 1;
    });
    return counts;
  }, []);

  const totalQuotes = useMemo(
    () => companies.reduce((s, c) => s + c.quotes.length, 0),
    []
  );

  const filtered = useMemo(() => {
    let result = [...companies];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.ticker.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
      );
    }
    if (stanceFilter !== "all") {
      result = result.filter((c) => c.stance === stanceFilter);
    }
    if (categoryFilter !== "all") {
      result = result.filter((c) => c.category === categoryFilter);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "rank":
          cmp = a.rank - b.rank;
          break;
        case "ticker":
          cmp = a.ticker.localeCompare(b.ticker);
          break;
        case "marketCap": {
          const aMcap = prices[a.ticker]?.marketCap ?? parseFloat(a.marketCap || "0");
          const bMcap = prices[b.ticker]?.marketCap ?? parseFloat(b.marketCap || "0");
          cmp = bMcap - aMcap;
          break;
        }
        case "stance":
          cmp =
            (STANCE_ORDER[a.stance] ?? 99) - (STANCE_ORDER[b.stance] ?? 99);
          break;
        case "quotes":
          cmp = b.quotes.length - a.quotes.length;
          break;
        case "price": {
          const aPrice = prices[a.ticker]?.price ?? 0;
          const bPrice = prices[b.ticker]?.price ?? 0;
          cmp = bPrice - aPrice;
          break;
        }
        case "change": {
          const aChg = prices[a.ticker]?.changePercent ?? 0;
          const bChg = prices[b.ticker]?.changePercent ?? 0;
          cmp = bChg - aChg;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [search, stanceFilter, categoryFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header bar */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <TerminalLogo />
          <div>
            <h1 className="text-sm font-bold tracking-wider text-primary glow-amber">
              SAASPOCALYPSE TRACKER
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
              System of Record · Earnings Intelligence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-muted-foreground hover:text-primary border border-border rounded hover:border-primary/30 transition-colors tracking-wider"
            data-testid="nav-quote-search"
          >
            <QuoteIcon className="w-3 h-3" />
            QUOTE SEARCH
          </Link>
          <Link
            href="/compare"
            className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-muted-foreground hover:text-primary border border-border rounded hover:border-primary/30 transition-colors tracking-wider"
            data-testid="nav-compare"
          >
            <GitCompareArrows className="w-3 h-3" />
            COMPARE
          </Link>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground tracking-wider ml-2">
            <span>
              {companies.length} COMPANIES · {totalQuotes} QUOTES
            </span>
            <span className="text-primary tabular-nums">
              {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </header>

      {/* KPI strip */}
      <div className="border-b border-border bg-card/50 px-4 py-2 flex gap-4 overflow-x-auto flex-shrink-0">
        {Object.entries(STANCE_LABELS).map(([key, label]) => {
          const count = stanceCounts[key] || 0;
          if (!count) return null;
          return (
            <button
              key={key}
              data-testid={`filter-stance-${key}`}
              onClick={() =>
                setStanceFilter(stanceFilter === key ? "all" : key)
              }
              className={`flex items-center gap-2 px-3 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                stanceFilter === key
                  ? STANCE_CLASSES[key] + " ring-1 ring-current"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="tabular-nums font-bold text-sm">{count}</span>
              <span>{label}</span>
            </button>
          );
        })}
        {stanceFilter !== "all" && (
          <button
            onClick={() => setStanceFilter("all")}
            className="text-[10px] text-muted-foreground hover:text-foreground px-2"
            data-testid="clear-stance-filter"
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Search + Filters */}
      <div className="px-4 py-3 flex gap-3 items-center border-b border-border flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search ticker, company, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-card border border-border rounded font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            data-testid="search-input"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3 h-3 text-muted-foreground" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-card border border-border rounded px-2 py-1.5 font-mono text-foreground focus:outline-none focus:border-primary cursor-pointer"
            data-testid="category-filter"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {filtered.length} / {companies.length}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-card border-b border-border">
            <tr>
              <SortHeader
                label="#"
                field="rank"
                current={sortField}
                dir={sortDir}
                onSort={toggleSort}
                className="w-10 text-center"
              />
              <SortHeader
                label="TICKER"
                field="ticker"
                current={sortField}
                dir={sortDir}
                onSort={toggleSort}
                className="w-20"
              />
              <th className="px-3 py-2 text-left text-muted-foreground font-medium tracking-wider">
                COMPANY
              </th>
              <th className="px-3 py-2 text-left text-muted-foreground font-medium tracking-wider hidden xl:table-cell">
                CATEGORY
              </th>
              <SortHeader
                label="PRICE"
                field="price"
                current={sortField}
                dir={sortDir}
                onSort={toggleSort}
                className="text-right w-20"
              />
              <SortHeader
                label="CHG%"
                field="change"
                current={sortField}
                dir={sortDir}
                onSort={toggleSort}
                className="text-right w-16"
              />
              <SortHeader
                label="MKT CAP"
                field="marketCap"
                current={sortField}
                dir={sortDir}
                onSort={toggleSort}
                className="text-right w-24"
              />
              <th className="px-2 py-2 text-center text-muted-foreground font-medium tracking-wider w-24 hidden lg:table-cell">
                52W RANGE
              </th>
              <SortHeader
                label="STANCE"
                field="stance"
                current={sortField}
                dir={sortDir}
                onSort={toggleSort}
                className="text-center w-24"
              />
              <SortHeader
                label="QTS"
                field="quotes"
                current={sortField}
                dir={sortDir}
                onSort={toggleSort}
                className="text-center w-12"
              />
              <th className="px-3 py-2 text-left text-muted-foreground font-medium tracking-wider max-w-xs hidden 2xl:table-cell">
                KEY QUOTE
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((company) => (
              <CompanyRow key={company.ticker} company={company} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            No companies match your filters
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground flex items-center justify-between flex-shrink-0">
        <span>
          Data sourced from latest earnings call transcripts via{" "}
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

function CompanyRow({ company }: { company: Company }) {
  const bestQuote = company.quotes[0];
  const truncatedQuote = bestQuote
    ? bestQuote.text.length > 100
      ? bestQuote.text.slice(0, 100) + "..."
      : bestQuote.text
    : company.notes || "—";

  const price = prices[company.ticker];
  const yearRange =
    price && price.yearHigh > price.yearLow
      ? ((price.price - price.yearLow) / (price.yearHigh - price.yearLow)) * 100
      : 0;

  return (
    <tr
      className="border-b border-border/50 hover:bg-card/80 transition-colors group"
      data-testid={`company-row-${company.ticker}`}
    >
      <td className="px-3 py-2.5 text-center tabular-nums text-muted-foreground">
        {company.rank}
      </td>
      <td className="px-3 py-2.5">
        <Link
          href={`/company/${company.ticker}`}
          className="font-bold text-primary hover:underline tracking-wide"
          data-testid={`link-${company.ticker}`}
        >
          {company.ticker}
        </Link>
      </td>
      <td className="px-3 py-2.5 text-foreground">{company.name}</td>
      <td className="px-3 py-2.5 text-muted-foreground text-[10px] tracking-wider uppercase hidden xl:table-cell">
        {company.category}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums font-medium">
        {price ? `$${price.price.toFixed(2)}` : "—"}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-[10px]">
        {price ? (
          <span
            className={
              price.changePercent > 0
                ? "text-[#00ff41]"
                : price.changePercent < 0
                ? "text-[#ff3b30]"
                : "text-muted-foreground"
            }
          >
            {price.changePercent > 0 ? "+" : ""}
            {price.changePercent.toFixed(2)}%
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums font-medium">
        ${price ? `${price.marketCap}B` : `${company.marketCap}B`}
      </td>
      <td className="px-2 py-2.5 hidden lg:table-cell">
        {price ? (
          <div className="w-full px-1">
            <div className="relative h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-primary/60 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, yearRange))}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="text-center block text-muted-foreground text-[10px]">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-center">
        <span
          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
            STANCE_CLASSES[company.stance] || "stance-neutral"
          }`}
        >
          {STANCE_LABELS[company.stance] || company.stance.toUpperCase()}
        </span>
      </td>
      <td className="px-3 py-2.5 text-center tabular-nums">
        {company.quotes.length || "—"}
      </td>
      <td className="px-3 py-2.5 text-muted-foreground text-[11px] max-w-xs hidden 2xl:table-cell">
        <span className="line-clamp-2 italic opacity-80">
          "{truncatedQuote}"
        </span>
        {bestQuote?.speaker && (
          <span className="text-[10px] text-muted-foreground/60 ml-1">
            — {bestQuote.speaker}
          </span>
        )}
      </td>
    </tr>
  );
}

function SortHeader({
  label,
  field,
  current,
  dir,
  onSort,
  className = "",
}: {
  label: string;
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
  className?: string;
}) {
  const active = current === field;
  return (
    <th
      className={`px-3 py-2 text-muted-foreground font-medium tracking-wider cursor-pointer hover:text-foreground select-none ${className}`}
      onClick={() => onSort(field)}
      data-testid={`sort-${field}`}
    >
      <span className="flex items-center gap-1">
        {label}
        {active && (
          <span className="text-primary text-[9px]">
            {dir === "asc" ? "▲" : "▼"}
          </span>
        )}
      </span>
    </th>
  );
}

function TerminalLogo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-label="SaaSpocalypse Tracker"
    >
      <rect
        x="1"
        y="1"
        width="26"
        height="26"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-primary"
      />
      <path
        d="M7 10l4 4-4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />
      <line
        x1="14"
        y1="18"
        x2="21"
        y2="18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-primary"
      />
    </svg>
  );
}
