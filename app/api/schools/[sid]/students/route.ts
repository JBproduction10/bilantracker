import { withAuth, json } from "@/lib/apiHelpers";
import * as data from "@/lib/schools-data";
import { canReadSchool, canManageSchool, requireCondition } from "@/lib/authz";

export const GET = withAuth(async (_req, { params }, user) => {
  requireCondition(canReadSchool(user, params.sid));
  const students = await data.listStudents(params.sid);
  return json(students);
});

export const POST = withAuth(async (req, { params }, user) => {
  requireCondition(canManageSchool(user, params.sid));
  const body = await req.json();
  const student = await data.addStudent(params.sid, body);
  return json(student, { status: 201 });
});
