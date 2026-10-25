import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

// Any unknown student URL shows the not-found page in the student's language.
export async function generateMetadata() {
  return { title: (await getTranslations("meta"))("notFound") };
}

export default function CatchAll() {
  notFound();
}
