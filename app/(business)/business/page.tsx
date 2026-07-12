"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BusinessIndexPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/business/companies");
      const companies = res.ok ? await res.json() : [];
      if (companies.length === 0) {
        router.replace("/business/onboarding");
        return;
      }
      const lastId = localStorage.getItem("pundi-business-last-company");
      const target =
        companies.find((c: { _id: string }) => c._id === lastId) ?? companies[0];
      router.replace(`/business/${target._id}/dashboard`);
    })();
  }, [router]);

  return null;
}
