import { useState, useEffect, useRef, useCallback } from "react";
import type { Transcript, TranscriptTurn } from "@shared/schema";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  MessageSquare,
  Search,
  X,
  Download,
  Users,
  Mic,
  Copy,
  Check,
  Calendar,
} from "lucide-react";

/** Clean up literal \n sequences from transcript text */
function cleanText(text: string): string {
  return text.replace(/\\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

type ManifestEntry = {
  period: string;
  eventDate: string;
  file: string;
  turns: number;
  prepared: number;
  qa: number;
};

type ManifestData = Record<string, ManifestEntry[]>;

type TranscriptViewerProps = {
  ticker: string;
  companyName: string;
};

// Module-level manifest cache — shared across all TranscriptViewer instances
let manifestCache: ManifestData | null = null;
let manifestPromise: Promise<ManifestData | null> | null = null;

async function fetchManifest(): Promise<ManifestData | null> {
  if (manifestCache) return manifestCache;
  if (manifestPromise) return manifestPromise;
  manifestPromise = fetch("/transcripts/manifest.json")
    .then((res) => {
      if (!res.ok) return null;
      return res.json() as Promise<ManifestData>;
    })
    .then((data) => {
      manifestCache = data;
      return data;
    })
    .catch(() => null);
  return manifestPromise;
}

export function TranscriptViewer({ ticker, companyName }: TranscriptViewerProps) {
  const [quarters, setQuarters] = useState<ManifestEntry[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [preparedOpen, setPreparedOpen] = useState(true);
  const [qaOpen, setQaOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cache of loaded transcripts by file path
  const transcriptCacheRef = useRef<Record<string, Transcript>>({});

  // Load manifest and set available quarters for this ticker
  useEffect(() => {
    fetchManifest().then((data) => {
      if (data && data[ticker]) {
        setQuarters(data[ticker]);
      } else {
        setQuarters([]);
      }
    });
  }, [ticker]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [dropdownOpen]);

  const currentQuarter = quarters[selectedIdx] || null;

  const loadTranscript = useCallback(
    async (entry: ManifestEntry) => {
      // Check cache first
      if (transcriptCacheRef.current[entry.file]) {
        setTranscript(transcriptCacheRef.current[entry.file]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/transcripts/${entry.file}`);
        if (!res.ok) throw new Error("Transcript not available");
        const data: Transcript = await res.json();
        if (data.totalTurns === 0) {
          setError("No transcript data available for this quarter.");
        } else {
          transcriptCacheRef.current[entry.file] = data;
          setTranscript(data);
        }
      } catch {
        setError("Transcript not available for this quarter.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleToggle = () => {
    if (!expanded && !transcript && !error && currentQuarter) {
      loadTranscript(currentQuarter);
    }
    setExpanded((e) => !e);
  };

  const handleQuarterSelect = (idx: number) => {
    setSelectedIdx(idx);
    setDropdownOpen(false);
    // Reset state for new quarter
    setSearchTerm("");
    setSearchOpen(false);
    setPreparedOpen(true);
    setQaOpen(false);
    // Load the new transcript
    const entry = quarters[idx];
    if (entry) {
      setTranscript(null);
      setError(null);
      loadTranscript(entry);
    }
  };

  // Search functionality
  useEffect(() => {
    if (!searchTerm || !transcript) {
      setMatchCount(0);
      return;
    }
    const lower = searchTerm.toLowerCase();
    let count = 0;
    const allTurns = [...transcript.preparedRemarks, ...transcript.qAndA];
    allTurns.forEach((turn) => {
      if (turn.text.toLowerCase().includes(lower) || turn.speaker.toLowerCase().includes(lower)) {
        count++;
      }
    });
    setMatchCount(count);
  }, [searchTerm, transcript]);

  const toggleSearch = () => {
    setSearchOpen((s) => {
      if (!s) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      } else {
        setSearchTerm("");
      }
      return !s;
    });
  };

  const copyTurn = (turn: TranscriptTurn, idx: number) => {
    const text = `[${turn.speaker}]: ${cleanText(turn.text)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  // Count unique speakers
  const getSpeakerStats = () => {
    if (!transcript) return { total: 0 };
    const allTurns = [...transcript.preparedRemarks, ...transcript.qAndA];
    const speakers = new Set(allTurns.map((t) => t.speaker));
    speakers.delete("Operator");
    speakers.delete("Conference Moderator");
    return { total: speakers.size };
  };

  const downloadTranscript = () => {
    if (!transcript) return;
    const lines: string[] = [];
    lines.push(`${companyName} (${ticker}) — ${transcript.period} Earnings Call`);
    lines.push(`Date: ${transcript.eventDate}`);
    lines.push(`${"=".repeat(60)}\n`);
    lines.push("PREPARED REMARKS");
    lines.push(`${"-".repeat(40)}\n`);
    transcript.preparedRemarks.forEach((t) => {
      lines.push(`[${t.speaker}]:`);
      lines.push(`${cleanText(t.text)}\n`);
    });
    if (transcript.qAndA.length > 0) {
      lines.push(`\nQUESTIONS & ANSWERS`);
      lines.push(`${"-".repeat(40)}\n`);
      transcript.qAndA.forEach((t) => {
        lines.push(`[${t.speaker}]:`);
        lines.push(`${cleanText(t.text)}\n`);
      });
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ticker}_earnings_transcript_${transcript.period.replace(/ /g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const speakerStats = getSpeakerStats();
  const hasQuarters = quarters.length > 0;

  // Format date for display: "Oct 29, 2025"
  function fmtDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div
      className="border border-border rounded bg-card overflow-hidden"
      data-testid="transcript-viewer"
      ref={containerRef}
    >
      {/* Header — always visible */}
      <button
        onClick={handleToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors group"
        data-testid="transcript-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <h2 className="text-xs font-bold tracking-wider text-primary flex items-center gap-2">
              FULL EARNINGS TRANSCRIPT
              {hasQuarters && (
                <span className="text-[10px] text-muted-foreground font-normal">
                  · {quarters.length} {quarters.length === 1 ? "quarter" : "quarters"} available
                </span>
              )}
            </h2>
            <span className="text-[10px] text-muted-foreground">
              {transcript
                ? `${transcript.period} · ${transcript.totalTurns} turns · ${transcript.preparedRemarks.length} prepared · ${transcript.qAndA.length} Q&A`
                : hasQuarters
                ? `Latest: ${quarters[0].period} · Click to load`
                : "Click to load transcript"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-[10px] text-primary animate-pulse tracking-wider">
              LOADING...
            </span>
          )}
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border">
          {!hasQuarters && !loading && (
            <div className="px-5 py-8 text-center">
              <div className="text-muted-foreground text-xs">
                No transcripts available for this company.
              </div>
            </div>
          )}

          {error && (
            <div className="px-5 py-8 text-center">
              <div className="text-muted-foreground text-xs">{error}</div>
            </div>
          )}

          {loading && !transcript && (
            <div className="px-5 py-8 text-center">
              <div className="inline-flex items-center gap-2 text-primary text-xs">
                <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                <span className="tracking-wider animate-pulse">FETCHING TRANSCRIPT...</span>
              </div>
            </div>
          )}

          {hasQuarters && (transcript || (!loading && !error)) && (
            <>
              {/* Toolbar with quarter selector */}
              <div className="px-4 py-2 bg-muted/20 border-b border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  {/* Quarter dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDropdownOpen((d) => !d);
                      }}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                        dropdownOpen
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border bg-background hover:border-primary/30 text-foreground"
                      }`}
                      data-testid="quarter-selector"
                    >
                      <Calendar className="w-3 h-3" />
                      <span className="tracking-wider">
                        {currentQuarter?.period || "SELECT"}
                      </span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {dropdownOpen && quarters.length > 1 && (
                      <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded shadow-lg z-50 overflow-hidden">
                        {quarters.map((q, i) => (
                          <button
                            key={q.file}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuarterSelect(i);
                            }}
                            className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-muted/30 transition-colors ${
                              i === selectedIdx
                                ? "bg-primary/10 border-l-2 border-primary"
                                : "border-l-2 border-transparent"
                            }`}
                            data-testid={`quarter-option-${i}`}
                          >
                            <div>
                              <div className={`text-[11px] font-medium tracking-wider ${
                                i === selectedIdx ? "text-primary" : "text-foreground"
                              }`}>
                                {q.period}
                                {i === 0 && (
                                  <span className="ml-1.5 text-[9px] text-primary/60 font-normal">
                                    LATEST
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] text-muted-foreground">
                                {fmtDate(q.eventDate)} · {q.turns} turns
                              </div>
                            </div>
                            <div className="text-[9px] text-muted-foreground tabular-nums">
                              {q.prepared > 0 && <span>{q.prepared}P</span>}
                              {q.qa > 0 && <span className="ml-1">{q.qa}Q</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {transcript && (
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="text-border">|</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {speakerStats.total} speakers
                      </span>
                      <span className="text-border">|</span>
                      <span>{currentQuarter ? fmtDate(currentQuarter.eventDate) : transcript.eventDate}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {searchOpen && (
                    <div className="flex items-center gap-1 bg-background border border-border rounded px-2 py-0.5">
                      <Search className="w-3 h-3 text-muted-foreground" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search transcript..."
                        className="bg-transparent text-xs text-foreground outline-none w-40 placeholder:text-muted-foreground/50"
                        data-testid="transcript-search-input"
                      />
                      {searchTerm && (
                        <span className="text-[9px] text-muted-foreground tabular-nums">
                          {matchCount} found
                        </span>
                      )}
                      <button
                        onClick={() => { setSearchTerm(""); setSearchOpen(false); }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={toggleSearch}
                    className={`p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors ${searchOpen ? "text-primary bg-primary/10" : ""}`}
                    data-testid="transcript-search-toggle"
                    title="Search transcript"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={downloadTranscript}
                    className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    data-testid="transcript-download"
                    title="Download as text"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {transcript && transcript.totalTurns > 0 && (
                <>
                  {/* Prepared Remarks section */}
                  {transcript.preparedRemarks.length > 0 && (
                    <TranscriptSection
                      title="PREPARED REMARKS"
                      turns={transcript.preparedRemarks}
                      isOpen={preparedOpen}
                      onToggle={() => setPreparedOpen((p) => !p)}
                      searchTerm={searchTerm}
                      copiedIdx={copiedIdx}
                      onCopy={copyTurn}
                      idPrefix="prepared"
                    />
                  )}

                  {/* Q&A section */}
                  {transcript.qAndA.length > 0 && (
                    <TranscriptSection
                      title="QUESTIONS & ANSWERS"
                      turns={transcript.qAndA}
                      isOpen={qaOpen}
                      onToggle={() => setQaOpen((q) => !q)}
                      searchTerm={searchTerm}
                      copiedIdx={copiedIdx}
                      onCopy={copyTurn}
                      idPrefix="qa"
                    />
                  )}

                  {/* Bottom info */}
                  <div className="px-5 py-2 border-t border-border bg-muted/10 text-[9px] text-muted-foreground tracking-wider flex items-center justify-between">
                    <span>SOURCE: PERPLEXITY FINANCE</span>
                    <span>
                      {transcript.period} · {transcript.totalTurns} TOTAL TURNS
                    </span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

type TranscriptSectionProps = {
  title: string;
  turns: TranscriptTurn[];
  isOpen: boolean;
  onToggle: () => void;
  searchTerm: string;
  copiedIdx: number | null;
  onCopy: (turn: TranscriptTurn, idx: number) => void;
  idPrefix: string;
};

function TranscriptSection({
  title,
  turns,
  isOpen,
  onToggle,
  searchTerm,
  copiedIdx,
  onCopy,
  idPrefix,
}: TranscriptSectionProps) {
  return (
    <div className="border-t border-border" data-testid={`section-${idPrefix}`}>
      <button
        onClick={onToggle}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
        data-testid={`toggle-${idPrefix}`}
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-primary" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span className="text-[11px] font-bold tracking-wider text-foreground">
            {title}
          </span>
          <span className="text-[10px] text-muted-foreground">
            ({turns.length} turns)
          </span>
        </div>
        {title.includes("QUESTIONS") && (
          <span className="text-[10px] text-primary/60">
            <MessageSquare className="w-3 h-3 inline mr-1" />
            ANALYST Q&A
          </span>
        )}
      </button>

      {isOpen && (
        <div className="px-5 pb-4 max-h-[600px] overflow-y-auto scroll-smooth">
          <div className="space-y-0.5">
            {turns.map((turn, i) => {
              const isHighlighted =
                searchTerm &&
                (turn.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  turn.speaker.toLowerCase().includes(searchTerm.toLowerCase()));
              const isOperator = turn.speaker === "Operator" || turn.speaker === "Conference Moderator";
              const globalIdx = idPrefix === "qa" ? 10000 + i : i;

              return (
                <div
                  key={i}
                  className={`group rounded px-3 py-2 transition-colors ${
                    isHighlighted
                      ? "bg-primary/10 border-l-2 border-primary"
                      : isOperator
                      ? "bg-muted/10 border-l-2 border-muted-foreground/20"
                      : "hover:bg-muted/10"
                  }`}
                  data-testid={`turn-${idPrefix}-${i}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-[10px] font-bold tracking-wider inline-block mb-0.5 ${
                          isOperator
                            ? "text-muted-foreground/60"
                            : "text-primary/80"
                        }`}
                      >
                        {turn.speaker}
                      </span>
                      <p
                        className={`text-xs leading-relaxed whitespace-pre-line ${
                          isOperator
                            ? "text-muted-foreground/60 italic"
                            : "text-foreground/85"
                        }`}
                      >
                        {searchTerm ? (
                          <HighlightedText
                            text={cleanText(turn.text)}
                            highlight={searchTerm}
                          />
                        ) : (
                          cleanText(turn.text)
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => onCopy(turn, globalIdx)}
                      className="mt-1 p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all flex-shrink-0"
                      title="Copy this turn"
                    >
                      {copiedIdx === globalIdx ? (
                        <Check className="w-3 h-3 text-[#00ff41]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight) return <>{text}</>;

  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-primary/30 text-foreground rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
