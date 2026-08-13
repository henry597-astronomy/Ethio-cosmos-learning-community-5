import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(str: string): string {
  if (!str) return "";
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove all non-word chars except space and hyphen
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with a single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading and trailing hyphens
}
