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
} from "lucide-react";

/** Clean up literal \n sequences from transcript text */
function cleanText(text: string): string {
  return text.replace(/\\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

type TranscriptViewerProps = {
  ticker: string;
  companyName: string;
};

export function TranscriptViewer({ ticker, companyName }: TranscriptViewerProps) {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [preparedOpen, setPreparedOpen] = useState(true);
  const [qaOpen, setQaOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadTranscript = useCallback(async () => {
    if (transcript || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/transcripts/${ticker}.json`);
      if (!res.ok) throw new Error("Transcript not available");
      const data: Transcript = await res.json();
      if (data.totalTurns === 0) {
        setError("No transcript data available for this company.");
      } else {
        setTranscript(data);
      }
    } catch {
      setError("Transcript not available for this company.");
    } finally {
      setLoading(false);
    }
  }, [ticker, transcript, loading]);

  const handleToggle = () => {
    if (!expanded && !transcript && !error) {
      loadTranscript();
    }
    setExpanded((e) => !e);
  };

  // Search functionality
  useEffect(() => {
    if (!searchTerm || !transcript) {
      setMatchCount(0);
      setCurrentMatch(0);
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
    setCurrentMatch(count > 0 ? 1 : 0);
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
    if (!transcript) return { total: 0, analysts: 0, mgmt: 0 };
    const allTurns = [...transcript.preparedRemarks, ...transcript.qAndA];
    const speakers = new Set(allTurns.map((t) => t.speaker));
    // Operator/Moderator don't count
    speakers.delete("Operator");
    speakers.delete("Conference Moderator");
    return {
      total: speakers.size,
      analysts: 0,
      mgmt: 0,
    };
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
    a.download = `${ticker}_earnings_transcript_${transcript.period.replace(" ", "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const speakerStats = getSpeakerStats();

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
            </h2>
            <span className="text-[10px] text-muted-foreground">
              {transcript
                ? `${transcript.period} · ${transcript.totalTurns} turns · ${transcript.preparedRemarks.length} prepared · ${transcript.qAndA.length} Q&A`
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

          {transcript && transcript.totalTurns > 0 && (
            <>
              {/* Toolbar */}
              <div className="px-4 py-2 bg-muted/20 border-b border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mic className="w-3 h-3" />
                    {transcript.period}
                  </span>
                  <span className="text-border">|</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {speakerStats.total} speakers
                  </span>
                  <span className="text-border">|</span>
                  <span>{transcript.eventDate}</span>
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
                <span>{transcript.totalTurns} TOTAL TURNS</span>
              </div>
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
  // Group consecutive turns by speaker for more readable display
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
