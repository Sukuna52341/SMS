import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-utils";
import { updateLoanStatus, getCustomerIdByLoanId } from "@/lib/loan-service";
import { createAuditLog } from "@/lib/audit-logger";
import { insertNotification } from "@/lib/db-config";
import { getCustomerById } from "@/lib/customer-service";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user || (user.role !== "admin" && user.role !== "staff")) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }
  const { loanId, approve } = await request.json();
  const status = approve ? "approved" : "rejected";
  await updateLoanStatus(loanId, status, user.id);
  await createAuditLog({
    action: approve ? "APPROVE_LOAN" : "REJECT_LOAN",
    resourceType: "LOAN",
    resourceId: loanId,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `${approve ? "Approved" : "Rejected"} loan ${loanId}`,
    ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
    userAgent: request.headers.get("user-agent") || "Unknown",
  });
  // Notify customer (get user_id from customer)
  const customerId = await getCustomerIdByLoanId(loanId);
  if (customerId) {
    const customer = await getCustomerById(customerId);
    if (customer && customer.user_id) {
      await insertNotification(customer.user_id, `Your loan application has been ${status}.`);
    }
  }
  return NextResponse.json({ success: true });
}
