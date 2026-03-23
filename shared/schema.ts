// No database needed — static data app
export type Company = {
  ticker: string;
  name: string;
  rank: number;
  exchange: string;
  marketCap: string;
  category: string;
  whatIsRecord: string;
  country: string;
  description: string;
  quarter: string;
  stance: string;
  themes: string[];
  summary: string;
  quotes: Quote[];
  notes: string;
};

export type Quote = {
  speaker: string;
  timestamp: string;
  text: string;
  url: string;
};
