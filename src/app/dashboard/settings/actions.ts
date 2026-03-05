"use server";

import { compare, hash } from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const BCRYPT_ROUNDS = 12;

export type ChangePasswordState = { error?: string; success?: boolean };

export async function changePassword(
    _prev: ChangePasswordState,
    payload: { currentPassword: string; newPassword: string }
): Promise<ChangePasswordState> {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: "No autorizado" };
    }

    const { currentPassword, newPassword } = payload;

    if (!currentPassword || !newPassword) {
        return { error: "Ambos campos son obligatorios" };
    }
    if (newPassword.length < 6) {
        return { error: "La nueva contraseña debe tener al menos 6 caracteres" };
    }
    if (currentPassword === newPassword) {
        return { error: "La nueva contraseña debe ser diferente a la actual" };
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { passwordHash: true },
    });
    if (!user) {
        return { error: "Usuario no encontrado" };
    }

    const valid = await compare(currentPassword, user.passwordHash);
    if (!valid) {
        return { error: "La contraseña actual es incorrecta" };
    }

    const newHash = await hash(newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({
        where: { id: session.user.id },
        data: { passwordHash: newHash },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
}

export type SaveEstablishmentState = { error?: string; success?: boolean };

export async function saveEstablishment(
    _prev: SaveEstablishmentState,
    payload: { name: string; address: string; phone: string; email: string }
): Promise<SaveEstablishmentState> {
    const session = await auth();
    if (!session?.user?.establishmentId) {
        return { error: "No autorizado" };
    }
    if (session.user.role !== "ADMIN") {
        return { error: "Solo los administradores pueden editar estos datos" };
    }

    const { name, address, phone, email } = payload;
    if (!name.trim()) {
        return { error: "El nombre es obligatorio" };
    }

    await prisma.establishment.update({
        where: { id: session.user.establishmentId },
        data: {
            name: name.trim(),
            address: address.trim() || null,
            phone: phone.trim() || null,
            email: email.trim() || null,
        },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
}

export type AdminChangePasswordState = { error?: string; success?: boolean };

export async function adminChangeUserPassword(
    _prev: AdminChangePasswordState,
    payload: { userId: string; newPassword: string }
): Promise<AdminChangePasswordState> {
    const session = await auth();
    if (!session?.user?.establishmentId || session.user.role !== "ADMIN") {
        return { error: "No autorizado" };
    }

    const { userId, newPassword } = payload;
    if (!userId || !newPassword) {
        return { error: "Datos incompletos" };
    }
    if (newPassword.length < 6) {
        return { error: "La contraseña debe tener al menos 6 caracteres" };
    }

    const user = await prisma.user.findFirst({
        where: { id: userId, establishmentId: session.user.establishmentId },
        select: { id: true },
    });
    if (!user) {
        return { error: "Usuario no encontrado" };
    }

    const newHash = await hash(newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
}
