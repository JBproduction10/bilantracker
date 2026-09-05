import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { canViewSalaryGrid, requireCondition } from "@/lib/authz";
import type { SalaryGridStatus } from "@/lib/types";

export const GET = withAuth(async (req, _ctx, user) => {
  requireCondition(await canViewSalaryGrid(user), "Only the site admin, Bonté Service, and the promoter see the network-wide queue.");
  const status = new URL(req.url).searchParams.get("status") as SalaryGridStatus | null;
  const schoolIds = await data.getVisibleSchoolIds(user);
  const submissions = await data.listAllSalaryGridSubmissions(status || undefined, schoolIds);
  return json(submissions);
});
