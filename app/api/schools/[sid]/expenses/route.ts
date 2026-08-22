import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { canReadSchool, canManageSchool, requireCondition } from "@/lib/authz";

export const GET = withAuth(async (req, { params }, user) => {
  requireCondition(canReadSchool(user, params.sid));
  const period = new URL(req.url).searchParams.get("period") || "";
  const expenses = await data.listExpenses(params.sid, period);
  return json(expenses);
});

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const body = await req.json();
  const expense = await data.addExpense(params.sid, body, user.name || user.email || undefined);
  return json(expense, { status: 201 });
});
