import { useMemo } from "react";

export type PasswordStrengthLevel = "weak" | "fair" | "strong" | "excellent";
type PasswordRequirementId = "length" | "symbol";

export interface PasswordRequirement {
  id: PasswordRequirementId;
  label: string;
  test: (password: string) => boolean;
}

export interface PasswordRequirementDisplay {
  id: PasswordRequirementId;
  label: string;
  isMet: boolean;
}

export interface PasswordStrengthResult {
  score: number;
  level: PasswordStrengthLevel;
  label: string;
  unmetRequirementIds: PasswordRequirementId[];
}

export interface UsePasswordStrengthReturn extends PasswordStrengthResult {
  requirements: PasswordRequirementDisplay[];
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: "length",
    label: "At least 6 characters",
    test: (password) => password.length >= 6,
  },
  {
    id: "symbol",
    label: "Contains a special character",
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
];

const SCORE_BY_MET_REQUIREMENTS = [0, 1, 2] satisfies number[];

const LEVEL_LABELS: Record<PasswordStrengthLevel, string> = {
  weak: "Weak password",
  fair: "Fair password",
  strong: "Strong password",
  excellent: "Excellent password",
};

interface StrengthLevelThreshold {
  level: PasswordStrengthLevel;
  minScore: number;
}

const LEVEL_THRESHOLDS: StrengthLevelThreshold[] = [
  { level: "weak", minScore: 0 },
  { level: "fair", minScore: 1 },
  { level: "strong", minScore: 2 },
];

function evaluatePasswordRequirements(password: string): PasswordRequirementDisplay[] {
  return PASSWORD_REQUIREMENTS.map((requirement) => ({
    id: requirement.id,
    label: requirement.label,
    isMet: requirement.test(password),
  }));
}

function deriveScore(metRequirementCount: number): number {
  const boundedCount = Math.max(0, Math.min(metRequirementCount, SCORE_BY_MET_REQUIREMENTS.length - 1));
  return SCORE_BY_MET_REQUIREMENTS[boundedCount];
}

function deriveLevel(score: number): PasswordStrengthLevel {
  const threshold = LEVEL_THRESHOLDS.reduce((current, candidate) => {
    if (score >= candidate.minScore) {
      return candidate;
    }

    return current;
  });

  return threshold.level;
}

export function usePasswordStrength(password: string): UsePasswordStrengthReturn {
  return useMemo(() => {
    const normalizedPassword = password ?? "";
    const requirements = evaluatePasswordRequirements(normalizedPassword);
    const metRequirementCount = requirements.filter((requirement) => requirement.isMet).length;
    const score = deriveScore(metRequirementCount);
    const level = deriveLevel(score);

    return {
      score,
      level,
      label: LEVEL_LABELS[level],
      unmetRequirementIds: requirements
        .filter((requirement) => !requirement.isMet)
        .map((requirement) => requirement.id),
      requirements,
    };
  }, [password]);
}

export const passwordRequirementLabels = PASSWORD_REQUIREMENTS.map((requirement) => ({
  id: requirement.id,
  label: requirement.label,
}));
