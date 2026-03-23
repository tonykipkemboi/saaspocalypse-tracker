# SaaSpocalypse Tracker

A Bloomberg-terminal-style dashboard tracking how 42 publicly traded System of Record (SoR) SaaS companies are responding to the AI-driven "SaaSpocalypse" narrative in their latest earnings calls.

## What is this?

The "SaaSpocalypse" thesis argues that AI coding tools (vibe coding, AI agents) will commoditize SaaS by making it trivial to build custom alternatives. This tracker monitors how the incumbents — the companies that own the actual systems of record — are responding.

We extracted **332 quotes** from earnings call transcripts across **42 companies** and classified each company's stance:

| Stance | Count | Meaning |
|--------|-------|---------|
| **Offensive** | 13 | "AI helps us, we're the disruptor" |
| **Off/Def** | 16 | "We're leaning in on AI but also fortifying our moat" |
| **Def/Off** | 5 | "Our data gravity protects us, and we're adding AI too" |
| **Defensive** | 6 | "We're adopting AI to stay competitive" |
| **Neutral** | 1 | Minimal AI/SaaSpocalypse commentary |
| **Silent** | 1 | No relevant commentary found |

## Notable quotes

> "I'll say a few words about the reported SaaS apocalypse... I don't agree with that at all." — **Mike Sicilia, Oracle**

> "There are some vendors out there, including some of our peers, that I would consider them at some level, parasites on Workday." — **Aneel Bhusri, Workday**

> "This is not our first SaaSpocalypse. We have been through many SaaSpocalypses." — **Marc Benioff, Salesforce**

> "Like in every platform shift, all software is being rewritten." — **Satya Nadella, Microsoft**

## Companies tracked

ERP (Microsoft, Oracle, SAP, Intuit, Xero, Sage), CRM (Salesforce, HubSpot), HCM/Payroll (Workday, ADP, Paychex, Paycom, Paylocity, Dayforce, Paycor), ITSM (ServiceNow, Atlassian), and 25 more across insurance, banking, healthcare, construction, property management, education, and other verticals.

## Tech stack

- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- JetBrains Mono (terminal aesthetic)
- Data sourced via [Perplexity Finance](https://perplexity.ai/finance) earnings transcripts

## Development

```bash
npm install
npm run dev
```

## Deploy to Vercel

Connect this repo to Vercel — it will auto-detect the Vite config. The `vercel.json` handles SPA routing.

## Data

All earnings data is in `client/src/data/enriched.json`. Each company entry includes:
- Ticker, name, market cap, SoR category
- Stance classification
- Key themes extracted from the earnings call
- AI-generated analysis summary
- Verbatim quotes with speaker attribution and timestamps

---

Built with [Perplexity Computer](https://www.perplexity.ai/computer)
