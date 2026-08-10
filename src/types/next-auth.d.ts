import type { Role } from "@/generated/prisma/enums";
import type { DefaultSession } from "next-auth";

// Module augmentation: Blueprint's session/JWT carry the DB user id, role,
// and name parts everywhere in the app that reads `useSession()` /
// `getServerSession()` needs them (nav, RBAC, dashboard greeting).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      firstName: string;
      lastName: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
    firstName: string;
    lastName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    firstName: string;
    lastName: string;
  }
}
