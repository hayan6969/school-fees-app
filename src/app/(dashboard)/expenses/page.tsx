import { Header } from "@/components/layout/header";
import { getExpenses, getExpenseCategories, getExpenseAnalytics } from "@/app/actions/expenses";
import { ExpensesClient } from "./expenses-client";

export default async function ExpensesPage() {
  const [expenses, categories, analytics] = await Promise.all([
    getExpenses(),
    getExpenseCategories(),
    getExpenseAnalytics(),
  ]);

  return (
    <div>
      <Header title="Expenses" description="Track school spending and treasury balance" />
      <ExpensesClient
        initialExpenses={expenses}
        categories={categories}
        analytics={analytics}
      />
    </div>
  );
}
