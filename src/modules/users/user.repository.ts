import type {
    AuthUserStore,
    StoredUser,
} from "../../fourni/auth/index.js";
import { prisma } from "../../db/prisma.js";

export class UserRepository implements AuthUserStore {
    findByEmail(email: string): Promise<StoredUser | null> {
        return prisma.user.findUnique({ where: { email } });
    }

    findById(id: number): Promise<StoredUser | null> {
        return prisma.user.findUnique({ where: { id } });
    }

    create(data: {
        email: string;
        name: string;
        passwordHash: string;
        role: StoredUser["role"];
    }): Promise<StoredUser> {
        return prisma.user.create({ data });
    }
}