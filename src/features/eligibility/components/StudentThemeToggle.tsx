"use client";

import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/ui/Theme";

// The theme button in the student headers, labelled in the student's language.
export function StudentThemeToggle() {
  const t = useTranslations("common");
  return <ThemeToggle toDark={t("themeDark")} toLight={t("themeLight")} />;
}
