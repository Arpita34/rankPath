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

/** Colleges this rank can realistically reach, best first. */
export function findColleges(opts: {
  exam: Exam;
  rank: number;
  category: Category;
  branch?: string;
}): { options: CollegeOption[]; out_of_reach_examples: string[]; data_note: string } {
  const mult = data.category_multipliers[opts.category] ?? 1;
  const rows = data.rows.filter(
    (r: Row) =>
      r.exam === opts.exam &&
      (!opts.branch || r.branch.toUpperCase() === opts.branch.toUpperCase()),
  );

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
  options.sort((a, b) => a.estimated_closing_rank - b.estimated_closing_rank);
  return {
    options: options.slice(0, 8),
    out_of_reach_examples: outOfReach.slice(-3),
    data_note: `${data._meta.year} closing ranks, approximate (seed dataset). Tell the user to verify on the official counselling site.`,
  };
}
