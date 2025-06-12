import { type NextRequest, NextResponse } from "next/server"
import { createAuditLog } from "@/lib/audit-logger"
import { getUserFromRequest } from "@/lib/auth-utils"
import { getAllCustomers, getCustomerById, type Customer } from "@/lib/customer-service"
import { createUser } from "@/lib/db"
import { saveCustomer } from "@/lib/customer-service"
import { encryptSSN, encryptAccountNumber } from "@/lib/encryption-utils"
import { getUserByEmail } from "@/lib/db"
import { getCustomerByUserId } from "@/lib/customer-service"

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

function processCustomerData(customer: Customer, showSensitive: boolean = false, canViewSensitive: boolean = false) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    ssn: "•••-••-••••",
    accountNumber: "••••••" + (customer.account_number_encrypted ? "1234" : "••••"),
    creditScore: customer.credit_score,
    loanAmount: customer.loan_amount,
    status: customer.status,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 403 }
      )
    }

    const customers = await getAllCustomers()
    console.log('Fetched customers:', customers);

    const customerArray = Array.isArray(customers) ? customers : []
    const maskedCustomers = customerArray.map(customer => processCustomerData(customer, false, false))
    return NextResponse.json({
      success: true,
      data: maskedCustomers,
    })

  } catch (error) {
    console.error("Error fetching customers:", error)
    return NextResponse.json(
      { success: false, error: "An error occurred while fetching customers" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()
    const { customerId, showSensitive, name, email, password, phone, address, ssn, accountNumber, creditScore, loanAmount, status } = requestBody

    const user = await getUserFromRequest(request)
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      createAuditLog({
        action: "UNAUTHORIZED_ACCESS",
        resourceType: customerId ? "CUSTOMER" : "NEW_CUSTOMER",
        resourceId: customerId || "unknown",
        userId: user?.id || null,
        userName: user?.name || "Unknown",
        userRole: user?.role || "none",
        details: `Attempted ${customerId ? 'to access customer ' + customerId : 'to add new customer'} without permission`,
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: request.headers.get("user-agent") || "Unknown",
      })

      return NextResponse.json(
        { success: false, error: "Unauthorized access" },
        { status: 403 }
      )
    }

    if (customerId) {
      const customer = await getCustomerById(customerId)
      if (!customer) {
        createAuditLog({
          action: "CUSTOMER_NOT_FOUND",
          resourceType: "CUSTOMER",
          resourceId: customerId,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          details: `Attempted to view non-existent customer with ID ${customerId}`,
          ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
          userAgent: request.headers.get("user-agent") || "Unknown",
        })
        return NextResponse.json(
          { success: false, error: "Customer not found" },
          { status: 404 }
        )
      }

      const canViewSensitive = user.role === "admin"
      createAuditLog({
        action: "VIEW",
        resourceType: "CUSTOMER",
        resourceId: customerId,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        details: `Viewed customer profile for ${customer.name}`,
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: request.headers.get("user-agent") || "Unknown",
      })

      if (showSensitive && canViewSensitive) {
        createAuditLog({
          action: "VIEW_SENSITIVE",
          resourceType: "CUSTOMER",
          resourceId: customerId,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          details: `Viewed sensitive data for ${customer.name}`,
          ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
          userAgent: request.headers.get("user-agent") || "Unknown",
        })
      } else if (showSensitive && !canViewSensitive) {
        createAuditLog({
          action: "UNAUTHORIZED_SENSITIVE_ACCESS",
          resourceType: "CUSTOMER",
          resourceId: customerId,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          details: `Attempted to view sensitive data for ${customer.name} without permission`,
          ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
          userAgent: request.headers.get("user-agent") || "Unknown",
        })
        return NextResponse.json(
          { success: false, error: "Unauthorized to view sensitive data" },
          { status: 403 }
        )
      }

      const customerDataForClient = processCustomerData(customer, showSensitive, canViewSensitive)
      return NextResponse.json({ success: true, data: customerDataForClient })

    } else {
      if (user.role !== "admin") {
        createAuditLog({
          action: "UNAUTHORIZED_ACTION",
          resourceType: "NEW_CUSTOMER",
          resourceId: "unknown",
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          details: `Attempted to add new customer without admin permission`,
          ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
          userAgent: request.headers.get("user-agent") || "Unknown",
        })
        return NextResponse.json(
          { success: false, error: "Unauthorized to add new customers" },
          { status: 403 }
        )
      }

      if (!name || !email || !password || !phone || !address || !ssn || !accountNumber || !status) {
        createAuditLog({
          action: "INVALID_INPUT",
          resourceType: "NEW_CUSTOMER",
          resourceId: "unknown",
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          details: `Invalid input for new customer creation`,
          ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
          userAgent: request.headers.get("user-agent") || "Unknown",
        })
        return NextResponse.json(
          { success: false, error: "Missing required fields" },
          { status: 400 }
        )
      }

      try {
        const existingUser = await getUserByEmail(email)
        if (existingUser) {
          const existingCustomer = await getCustomerByUserId(existingUser.id)
          if (existingCustomer) {
            return NextResponse.json(
              { success: false, error: "A customer with this email already exists." },
              { status: 400 }
            )
          }
        }

        const newUser = await createUser(name, email, password, "customer")
        if (!newUser || !newUser.id) {
          throw new Error("Failed to create linked user for new customer.")
        }

        const ssn_encrypted = await encryptSSN(ssn)
        const account_number_encrypted = await encryptAccountNumber(accountNumber)

        const newCustomer = await saveCustomer({
          userId: newUser.id,
          name,
          email,
          phone,
          address,
          ssn_encrypted,
          account_number_encrypted,
          credit_score: creditScore !== undefined && creditScore !== null ? Number(creditScore) : null,
          loan_amount: loanAmount !== undefined && loanAmount !== null ? Number(loanAmount) : null,
          status: status as "active" | "inactive" | "pending",
        })

        if (!newCustomer || !newCustomer.id) {
          throw new Error("Failed to save new customer record.")
        }

        createAuditLog({
          action: "ADD_CUSTOMER",
          resourceType: "CUSTOMER",
          resourceId: newCustomer.id,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          details: `Added new customer: ${name} (${email})`,
          ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
          userAgent: request.headers.get("user-agent") || "Unknown",
        })

        const addedCustomerForClient = processCustomerData(newCustomer, false, false)
        return NextResponse.json(
          { success: true, message: "Customer added successfully", data: addedCustomerForClient },
          { status: 201 }
        )

      } catch (dbError) {
        console.error("Database error adding customer:", dbError)
        createAuditLog({
          action: "API_ERROR",
          resourceType: "NEW_CUSTOMER",
          resourceId: "unknown",
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          details: `Database error adding customer: ${(dbError as Error).message}`,
          ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
          userAgent: request.headers.get("user-agent") || "Unknown",
        })
        return NextResponse.json(
          { success: false, error: "Failed to add customer due to a database error." },
          { status: 500 }
        )
      }
    }

  } catch (error) {
    console.error("Error processing customer API request:", error)
    createAuditLog({
      action: "API_ERROR",
      resourceType: "CUSTOMER_API",
      resourceId: "unknown",
      userId: null,
      userName: "Unknown",
      userRole: "none",
      details: `Unexpected error in customer API: ${(error as Error).message}`,
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Unknown",
    })
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    )
  }
}