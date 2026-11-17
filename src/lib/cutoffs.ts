import data from "../../data/cutoffs.json";

export const EXAMS = ["JEE_MAIN", "TG_EAPCET", "AP_EAPCET", "KCET"] as const;
export type Exam = (typeof EXAMS)[number];
export const CATEGORIES = ["OPEN", "EWS", "OBC", "SC", "ST"] as const;
export type Category = (typeof CATEGORIES)[number];

type Row = (typeof data.rows)[number];

export interface CollegeOption {
  college: string;
  city: string;
  state: string;
  type: string;
  branch: string;
  estimated_closing_rank: number;
  fee_per_year_inr: number;
  chance: "safe" | "likely" | "borderline";
}

/** Map what people type ("Computer Science", "mechanical", "AI & DS") to the dataset's branch codes. */
function normaliseBranch(input: string): { code: string; approximated: boolean } {
  const s = input.toUpperCase().replace(/[^A-Z]/g, "");
  if (/^(AI|AIML|AIDS|ML|DS|CSM|CSD|ARTIFICIAL|MACHINELEARNING|DATASCIENCE|CSEAI|CSEDS)/.test(s)) return { code: "CSE", approximated: true };
  if (/^(CSE|CS$|COMPUTER)/.test(s)) return { code: "CSE", approximated: false };
  if (/^(ECE|EC$|ELECTRONICS)/.test(s)) return { code: "ECE", approximated: false };
  if (/^(EEE|EE$|ELECTRICAL)/.test(s)) return { code: "EEE", approximated: false };
  if (/^(MECH|ME$)/.test(s)) return { code: "MECH", approximated: false };
  if (/^(IT$|INFORMATIONTECH)/.test(s)) return { code: "IT", approximated: false };
  return { code: s, approximated: false };
}

/** Colleges this rank can realistically reach, best first. */
export function findColleges(opts: {
  exam: Exam;
  rank: number;
  category: Category;
  branch?: string;
}): {
  options: CollegeOption[];
  out_of_reach_examples: string[];
  rank_beyond_dataset?: { highest_closing_rank_in_list: number; nearest_colleges: string[]; note: string };
  branch_note?: string;
  data_note: string;
} {
  const mult = data.category_multipliers[opts.category] ?? 1;
  const examRows = data.rows.filter((r: Row) => r.exam === opts.exam);
  const available = Array.from(new Set(examRows.map((r) => r.branch)));
  const wanted = opts.branch ? normaliseBranch(opts.branch) : null;

  // Asked for a branch we hold no rows for (e.g. Civil): say so instead of returning nothing.
  if (wanted && !available.includes(wanted.code)) {
    return {
      options: [],
      out_of_reach_examples: [],
      branch_note: `No ${opts.branch} rows in the dataset for this exam. Branches available: ${available.join(", ")}. Tell the family you don't have ${opts.branch} cutoffs (do not guess), and offer the available branches or the official last-rank list.`,
      data_note: `${data._meta.year} closing ranks, approximate (seed dataset).`,
    };
  }
  const rows = wanted ? examRows.filter((r) => r.branch === wanted.code) : examRows;
  const branchNote = wanted?.approximated
    ? `The dataset has no separate ${opts.branch} rows; these are CSE rows. AI/ML and Data Science branches usually close a little after CSE at the same college, so say this is an approximation.`
    : undefined;

  const options: CollegeOption[] = [];
  const outOfReach: string[] = [];
  for (const r of rows) {
    const closing = Math.round(r.closing_rank * mult);
    let chance: CollegeOption["chance"] | null = null;
    if (closing >= opts.rank * 1.15) chance = "safe";
    else if (closing >= opts.rank) chance = "likely";
    else if (closing >= opts.rank * 0.85) chance = "borderline";

    if (chance) {
      options.push({
        college: r.college,
        city: r.city,
        state: r.state,
        type: r.type,
        branch: r.branch,
        estimated_closing_rank: closing,
        fee_per_year_inr: r.fee_per_year_inr,
        chance,
      });
    } else {
      outOfReach.push(`${r.college} ${r.branch} (closed ~${closing})`);
    }
  }
  // Best realistic options first: reachable colleges with the lowest closing rank.
  options.sort((a, b) => a.estimated_closing_rank - b.estimated_closing_rank);

  const result: ReturnType<typeof findColleges> = {
    options: options.slice(0, 8),
    out_of_reach_examples: outOfReach.slice(-3),
    ...(branchNote ? { branch_note: branchNote } : {}),
    data_note: `${data._meta.year} closing ranks, approximate (seed dataset of ${rows.length} rows for this exam). Tell the user to verify on the official counselling site.`,
  };

  // Rank is higher than every closing rank in our list: say so honestly instead of returning nothing.
  if (options.length < 3 && rows.length > 0) {
    const sorted = [...rows].sort((a, b) => b.closing_rank - a.closing_rank);
    const max = Math.round(sorted[0].closing_rank * mult);
    if (opts.rank > max * 0.85) {
      result.rank_beyond_dataset = {
        highest_closing_rank_in_list: max,
        nearest_colleges: sorted.slice(0, 4).map((r) => `${r.college} ${r.branch} (closed ~${Math.round(r.closing_rank * mult)})`),
        note:
          "This rank is beyond the colleges in our list. Many more private colleges admit at this rank in counselling (especially in later rounds and for branches like CSE-AI/IT/ECE), so do NOT tell the student nothing is available. Explain this honestly, suggest checking the official last-rank list, and consider alternatives such as NIAT's partner-university path.",
      };
    }
  }
  return result;
}
