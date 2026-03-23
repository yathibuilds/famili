export const visibilityOptions = [
  { value: "only_me", label: "Only me" },
  { value: "family", label: "Family" },
  { value: "circle", label: "Selected people / Circle" },
] as const;

export const busyOptions = [
  { value: "busy", label: "Show as busy" },
  { value: "free", label: "Show as free" },
] as const;

export function visibilityLabel(value?: string | null) {
  return visibilityOptions.find((item) => item.value === value)?.label ?? "Only me";
}

export function busyLabel(value?: string | null) {
  return busyOptions.find((item) => item.value === value)?.label ?? "Show as busy";
}

export const relationTypeMap: Record<string, string> = {
  self: "self",
  me: "self",

  husband: "spouse",
  wife: "spouse",
  spouse: "spouse",
  partner: "spouse",

  father: "parent",
  mother: "parent",
  dad: "parent",
  mom: "parent",
  parent: "parent",

  son: "child",
  daughter: "child",
  kid: "child",
  child: "child",

  brother: "sibling",
  sister: "sibling",
  sibling: "sibling",

  "father-in-law": "in_law",
  "mother-in-law": "in_law",
  "brother-in-law": "in_law",
  "sister-in-law": "in_law",
  "in-law": "in_law",

  cousin: "extended_family",
  uncle: "extended_family",
  aunt: "extended_family",
  grandparent: "extended_family",
  grandchild: "extended_family",
  relative: "extended_family",

  friend: "friend",
  coworker: "coworker",
  colleague: "coworker",
  flatmate: "flatmate",
  roommate: "flatmate",
  neighbor: "neighbor",
};

export function normalizeRelationType(input: string) {
  const key = input.trim().toLowerCase();
  return relationTypeMap[key] ?? "other";
}
