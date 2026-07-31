import { prisma } from "./prisma";

export async function getBaseCurrency(userId: string): Promise<string> {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  return settings?.baseCurrency ?? "USD";
}

export async function convertToBase(userId: string, amount: number, currency: string): Promise<number> {
  const base = await getBaseCurrency(userId);
  if (currency === base) return amount;
  const rate = await prisma.exchangeRate.findUnique({
    where: { userId_currency: { userId, currency } },
  });
  if (!rate) return amount;
  return amount * rate.rateToBase;
}
