import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { logAudit } from "@/lib/audit";
import { canManageExpenses, requireCondition } from "@/lib/authz";

export const PUT = withAuth(async (req, { params }, user) => {
  requireCondition(canManageExpenses(user, params.sid));
  const body = await req.json();
  const expense = await data.updateExpense(params.sid, params.eid, body);
  await logAudit({
    actor: user, action: "expense.update", schoolId: params.sid,
    targetType: "expense", targetId: expense.id, targetLabel: expense.label,
    details: { category: expense.category, amount: expense.amount, period: expense.period },
  });
  return json(expense);
});

export const DELETE = withAuth(async (_req, { params }, user) => {
  requireCondition(canManageExpenses(user, params.sid));
  const school = await data.getSchool(params.sid);
  const removed = school?.expenses.find((e) => e.id === params.eid);
  await data.removeExpense(params.sid, params.eid);
  await logAudit({
    actor: user, action: "expense.remove", schoolId: params.sid,
    targetType: "expense", targetId: params.eid, targetLabel: removed?.label,
    details: { category: removed?.category, amount: removed?.amount, period: removed?.period },
  });
  return new Response(null, { status: 204 });
});
