import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "member";
      familyId: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: "admin" | "member";
    familyId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "admin" | "member";
    familyId: string;
  }
}
