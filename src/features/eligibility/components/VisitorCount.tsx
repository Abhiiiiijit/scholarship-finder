"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { visitorCount } from "../api/visits-client";

// S01: "N people have visited Paatra". Shows nothing until the number arrives, or if it can't.
export function VisitorCount() {
  const t = useTranslations("landing");
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    visitorCount().then((n) => live && setCount(n));
    return () => {
      live = false;
    };
  }, []);
  if (count === null || count < 1) return null;
  return <span>{t("visitors", { count })}</span>;
}
