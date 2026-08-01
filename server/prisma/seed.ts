import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@walkthrough.app";
const DEMO_PASSWORD = "demo1234";

const EXPENSE_CATEGORIES = [
  { name: "Food & Dining", kind: "EXPENSE", color: "#eb6834", icon: "Utensils", budget: 500 },
  { name: "Transportation", kind: "EXPENSE", color: "#2a78d6", icon: "Car", budget: 200 },
  { name: "Shopping", kind: "EXPENSE", color: "#e87ba4", icon: "ShoppingBag", budget: 300 },
  { name: "Entertainment", kind: "EXPENSE", color: "#4a3aa7", icon: "Film", budget: 150 },
  { name: "Bills & Utilities", kind: "EXPENSE", color: "#e34948", icon: "Receipt", budget: 400 },
  { name: "Health", kind: "EXPENSE", color: "#008300", icon: "HeartPulse", budget: 150 },
  { name: "Travel", kind: "EXPENSE", color: "#1baf7a", icon: "Plane", budget: 250 },
  { name: "Other", kind: "EXPENSE", color: "#898781", icon: "MoreHorizontal", budget: null },
];

const INCOME_CATEGORIES = [
  { name: "Salary", kind: "INCOME", color: "#008300", icon: "Wallet", budget: null },
  { name: "Business", kind: "INCOME", color: "#2a78d6", icon: "Briefcase", budget: null },
  { name: "Freelance", kind: "INCOME", color: "#4a3aa7", icon: "Laptop", budget: null },
  { name: "Investment", kind: "INCOME", color: "#1baf7a", icon: "TrendingUp", budget: null },
  { name: "Pocket Money", kind: "INCOME", color: "#eda100", icon: "Coins", budget: null },
  { name: "Gift", kind: "INCOME", color: "#e87ba4", icon: "Gift", budget: null },
  { name: "Other Income", kind: "INCOME", color: "#898781", icon: "MoreHorizontal", budget: null },
];

const RATES = [
  { currency: "EUR", rateToBase: 1.08 },
  { currency: "GBP", rateToBase: 1.27 },
  { currency: "INR", rateToBase: 0.012 },
  { currency: "JPY", rateToBase: 0.0067 },
  { currency: "CAD", rateToBase: 0.73 },
  { currency: "AUD", rateToBase: 0.66 },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, passwordHash, name: "Demo User" },
  });

  await prisma.settings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      baseCurrency: "USD",
      monthlyBudget: 2000,
      budgetAlertsEnabled: true,
      budgetAlertThreshold: 50,
    },
  });

  for (const rate of RATES) {
    await prisma.exchangeRate.upsert({
      where: { userId_currency: { userId: user.id, currency: rate.currency } },
      update: { rateToBase: rate.rateToBase },
      create: { userId: user.id, ...rate },
    });
  }

  const createdCategories = [];
  for (const c of [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]) {
    const category = await prisma.category.upsert({
      where: { userId_name_kind: { userId: user.id, name: c.name, kind: c.kind } },
      update: {},
      create: { ...c, userId: user.id },
    });
    createdCategories.push(category);
  }

  const rateMap = new Map(RATES.map((r) => [r.currency, r.rateToBase]));
  const byName = (name: string) => createdCategories.find((c) => c.name === name)!.id;
  const today = new Date();

  const existingExpenses = await prisma.expense.count({ where: { userId: user.id } });
  if (existingExpenses === 0) {
    const sample = [
      { description: "Grocery run", amount: 84.5, currency: "USD", category: "Food & Dining", daysAgo: 1 },
      { description: "Uber to airport", amount: 32, currency: "USD", category: "Transportation", daysAgo: 2 },
      { description: "Netflix subscription", amount: 15.99, currency: "USD", category: "Entertainment", daysAgo: 3 },
      { description: "New headphones", amount: 129.99, currency: "USD", category: "Shopping", daysAgo: 5 },
      { description: "Electricity bill", amount: 96.2, currency: "USD", category: "Bills & Utilities", daysAgo: 6 },
      { description: "Pharmacy", amount: 22.4, currency: "USD", category: "Health", daysAgo: 8 },
      { description: "Coffee shop", amount: 6.75, currency: "USD", category: "Food & Dining", daysAgo: 9 },
      { description: "Hotel booking", amount: 210, currency: "EUR", category: "Travel", daysAgo: 12 },
      { description: "Gas station", amount: 45.3, currency: "USD", category: "Transportation", daysAgo: 14 },
      { description: "Movie night", amount: 28, currency: "USD", category: "Entertainment", daysAgo: 15 },
      { description: "Restaurant dinner", amount: 68.4, currency: "USD", category: "Food & Dining", daysAgo: 18 },
      { description: "Internet bill", amount: 59.99, currency: "USD", category: "Bills & Utilities", daysAgo: 20 },
      { description: "Gym membership", amount: 40, currency: "USD", category: "Health", daysAgo: 22 },
      { description: "Clothing", amount: 87.5, currency: "GBP", category: "Shopping", daysAgo: 25 },
      { description: "Flight ticket", amount: 340, currency: "USD", category: "Travel", daysAgo: 28 },
      { description: "Ski trip lodging", amount: 480, currency: "USD", category: "Travel", daysAgo: 45 },
      { description: "Concert tickets", amount: 120, currency: "USD", category: "Entertainment", daysAgo: 52 },
      { description: "Winter coat", amount: 150, currency: "USD", category: "Shopping", daysAgo: 60 },
      { description: "Dentist visit", amount: 200, currency: "USD", category: "Health", daysAgo: 75 },
      { description: "Car repair", amount: 310, currency: "USD", category: "Transportation", daysAgo: 90 },
    ];

    for (const s of sample) {
      const rate = rateMap.get(s.currency) ?? 1;
      const amountBase = s.currency === "USD" ? s.amount : s.amount * rate;
      const date = new Date(today);
      date.setDate(date.getDate() - s.daysAgo);
      await prisma.expense.create({
        data: {
          description: s.description,
          amount: s.amount,
          currency: s.currency,
          amountBase,
          date,
          categoryId: byName(s.category),
          userId: user.id,
        },
      });
    }
  }

  const existingIncomes = await prisma.income.count({ where: { userId: user.id } });
  if (existingIncomes === 0) {
    const sampleIncome = [
      { description: "Monthly salary", amount: 3200, currency: "USD", category: "Salary", daysAgo: 3 },
      { description: "Freelance web project", amount: 450, currency: "USD", category: "Freelance", daysAgo: 10 },
      { description: "Dividend payout", amount: 60, currency: "USD", category: "Investment", daysAgo: 18 },
      { description: "Birthday gift", amount: 100, currency: "USD", category: "Gift", daysAgo: 22 },
      { description: "Monthly salary", amount: 3200, currency: "USD", category: "Salary", daysAgo: 33 },
      { description: "Consulting gig", amount: 600, currency: "USD", category: "Business", daysAgo: 48 },
      { description: "Monthly salary", amount: 3200, currency: "USD", category: "Salary", daysAgo: 63 },
      { description: "Freelance logo design", amount: 220, currency: "USD", category: "Freelance", daysAgo: 70 },
      { description: "Monthly salary", amount: 3100, currency: "USD", category: "Salary", daysAgo: 93 },
    ];

    for (const s of sampleIncome) {
      const rate = rateMap.get(s.currency) ?? 1;
      const amountBase = s.currency === "USD" ? s.amount : s.amount * rate;
      const date = new Date(today);
      date.setDate(date.getDate() - s.daysAgo);
      await prisma.income.create({
        data: {
          description: s.description,
          amount: s.amount,
          currency: s.currency,
          amountBase,
          date,
          categoryId: byName(s.category),
          userId: user.id,
        },
      });
    }
  }

  console.log(`Seed complete. Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
