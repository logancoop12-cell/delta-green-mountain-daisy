import type { FactorKey } from "./model";

export type SectorProfileId =
  | "technology"
  | "financials"
  | "utilities"
  | "energy"
  | "healthcare"
  | "defensive"
  | "cyclical";

export type SectorProfile = {
  id: SectorProfileId;
  name: string;
  /** Asset-light: book value and buybacks distort price-to-book. */
  assetLight: boolean;
  summary: string;
  weights: Record<FactorKey, number>;
  skipped: Partial<Record<FactorKey, string>>;
};

const skipFcf =
  "Free cash flow is turned off for banks and insurers. Deposits, loans, and insurance float make the ratio look like a business yield when it is not.";
const skipMargin =
  "Gross margin is turned off for banks and insurers. They do not have a merchandise margin that measures pricing power.";
const skipDebt =
  "Net debt to EBITDA and the Altman Z-score are turned off for banks and insurers. Their liabilities are the product, not a capital-structure choice.";

function profile(
  partial: Omit<SectorProfile, "weights" | "skipped"> & {
    weights: Record<FactorKey, number>;
    skipped?: SectorProfile["skipped"];
  },
): SectorProfile {
  const sum = Object.values(partial.weights).reduce((total, weight) => total + weight, 0);
  if (Math.abs(sum - 1) > 0.001) {
    throw new Error(`Weights for ${partial.id} sum to ${sum}`);
  }
  return { skipped: {}, ...partial };
}

export const PROFILES: Record<SectorProfileId, SectorProfile> = {
  technology: profile({
    id: "technology",
    name: "Technology and communication",
    assetLight: true,
    summary:
      "Book value is only 3% here. Buybacks and intangible assets make price-to-book a poor anchor for software and platforms, so return on capital, growth, and a published moat score take more of the rating. A premium to peers fades out instead of going straight to zero.",
    weights: {
      peVsIndustry: 0.12,
      peg: 0.12,
      pbVsIndustry: 0.03,
      netIncomeGrowth: 0.14,
      forwardPeVsIndustry: 0.1,
      shareholderYield: 0.03,
      fcfYield: 0.08,
      returnOnCapital: 0.14,
      grossMarginQuality: 0.08,
      balanceSheet: 0.04,
      moat: 0.12,
    },
  }),
  financials: profile({
    id: "financials",
    name: "Financials",
    assetLight: false,
    summary:
      "Banks and insurers are scored as balance-sheet businesses. Price-to-book and earnings multiples carry more of the rating, quality is return on equity, and free cash flow, gross margin, and corporate leverage ratios are turned off.",
    weights: {
      peVsIndustry: 0.22,
      peg: 0.08,
      pbVsIndustry: 0.18,
      netIncomeGrowth: 0.12,
      forwardPeVsIndustry: 0.14,
      shareholderYield: 0.08,
      fcfYield: 0,
      returnOnCapital: 0.1,
      grossMarginQuality: 0,
      balanceSheet: 0,
      moat: 0.08,
    },
    skipped: {
      fcfYield: skipFcf,
      grossMarginQuality: skipMargin,
      balanceSheet: skipDebt,
    },
  }),
  utilities: profile({
    id: "utilities",
    name: "Utilities and real estate",
    assetLight: false,
    summary:
      "Regulated and asset-heavy models are judged more on cash paid out and debt carried than on fast earnings growth. Leverage is 14% of the rating.",
    weights: {
      peVsIndustry: 0.12,
      peg: 0.04,
      pbVsIndustry: 0.08,
      netIncomeGrowth: 0.06,
      forwardPeVsIndustry: 0.1,
      shareholderYield: 0.16,
      fcfYield: 0.12,
      returnOnCapital: 0.08,
      grossMarginQuality: 0.04,
      balanceSheet: 0.14,
      moat: 0.06,
    },
  }),
  energy: profile({
    id: "energy",
    name: "Energy and materials",
    assetLight: false,
    summary:
      "Cyclical earnings get a lower weight and a smoothed growth rate, so one peak year does not set the rating. Free cash flow and leverage count more.",
    weights: {
      peVsIndustry: 0.14,
      peg: 0.06,
      pbVsIndustry: 0.08,
      netIncomeGrowth: 0.08,
      forwardPeVsIndustry: 0.12,
      shareholderYield: 0.08,
      fcfYield: 0.14,
      returnOnCapital: 0.08,
      grossMarginQuality: 0.06,
      balanceSheet: 0.12,
      moat: 0.04,
    },
  }),
  healthcare: profile({
    id: "healthcare",
    name: "Healthcare",
    assetLight: true,
    summary:
      "Patents, brands, and switching costs are a large part of the price. Return on capital, margin stability, and moat sit beside valuation, and price-to-book stays small.",
    weights: {
      peVsIndustry: 0.12,
      peg: 0.1,
      pbVsIndustry: 0.04,
      netIncomeGrowth: 0.12,
      forwardPeVsIndustry: 0.1,
      shareholderYield: 0.04,
      fcfYield: 0.08,
      returnOnCapital: 0.12,
      grossMarginQuality: 0.1,
      balanceSheet: 0.06,
      moat: 0.12,
    },
  }),
  defensive: profile({
    id: "defensive",
    name: "Consumer defensive",
    assetLight: false,
    summary:
      "Staples are scored for steady margins, cash returned to owners, and a reasonable multiple. Explosive growth is not required.",
    weights: {
      peVsIndustry: 0.14,
      peg: 0.08,
      pbVsIndustry: 0.06,
      netIncomeGrowth: 0.1,
      forwardPeVsIndustry: 0.12,
      shareholderYield: 0.1,
      fcfYield: 0.1,
      returnOnCapital: 0.1,
      grossMarginQuality: 0.1,
      balanceSheet: 0.05,
      moat: 0.05,
    },
  }),
  cyclical: profile({
    id: "cyclical",
    name: "Balanced",
    assetLight: false,
    summary:
      "Industrials and other mixed businesses use the balanced book: valuation, smoothed growth, return on capital, and a balance-sheet check, with a modest weight on published moat research.",
    weights: {
      peVsIndustry: 0.16,
      peg: 0.1,
      pbVsIndustry: 0.06,
      netIncomeGrowth: 0.14,
      forwardPeVsIndustry: 0.1,
      shareholderYield: 0.05,
      fcfYield: 0.08,
      returnOnCapital: 0.12,
      grossMarginQuality: 0.07,
      balanceSheet: 0.06,
      moat: 0.06,
    },
  }),
};

export const PROFILE_ORDER: SectorProfileId[] = [
  "technology",
  "financials",
  "utilities",
  "energy",
  "healthcare",
  "defensive",
  "cyclical",
];

export function profileFor(sector: string | null, industry: string | null): SectorProfile {
  const blob = `${sector ?? ""} ${industry ?? ""}`.toLowerCase();
  if (/bank|insurance|insurer|capital markets|asset management|credit service|financial service/.test(blob)) {
    return PROFILES.financials;
  }
  if (/telecom/.test(blob)) return PROFILES.utilities;
  if (/real estate|reit|utilit/.test(blob)) return PROFILES.utilities;
  if (/energy|basic material|mining|chemical|metal|gold|oil|gas/.test(blob) && !/gas utility/.test(blob)) {
    return PROFILES.energy;
  }
  if (/health|drug|biotech|pharma|medical/.test(blob)) return PROFILES.healthcare;
  if (/consumer defensive|beverage|household|packaged|tobacco|grocery/.test(blob)) return PROFILES.defensive;
  if (/technology|communication|software|semiconductor|internet/.test(blob)) return PROFILES.technology;
  return PROFILES.cyclical;
}
