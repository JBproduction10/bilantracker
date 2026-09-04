import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canReadSchool, canManageExpenses, requireCondition } from "@/lib/authz";

export const GET = withAuth(async (req, { params }, user) => {
  requireCondition(canReadSchool(user, params.sid));
  const period = new URL(req.url).searchParams.get("period") || "";
  const expenses = await data.listExpenses(params.sid, period);
  return json(expenses);
});

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canManageExpenses(user, params.sid));
  const body = await req.json();
  const expense = await data.addExpense(params.sid, body, user.name || user.email || undefined);
  await logAudit({
    actor: user, action: "expense.add", schoolId: params.sid,
    targetType: "expense", targetId: expense.id, targetLabel: expense.label,
    details: { category: expense.category, amount: expense.amount, period: expense.period },
  });
  return json(expense, { status: 201 });
});
