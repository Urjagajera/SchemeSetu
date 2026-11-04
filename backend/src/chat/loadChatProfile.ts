import prisma from '../db/prisma.js';
import { profileForChat, ChatProfile } from './profileForChat.js';

/** The signed-in person's eligibility answers for SetuAI: read from Profile only, never from User (name, email). */
export async function loadChatProfile(userId: string): Promise<ChatProfile | null> {
  return profileForChat(await prisma.profile.findUnique({ where: { userId } }));
}
