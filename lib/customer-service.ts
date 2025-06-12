import { executeQuery } from "./db-config";
import { generateId } from "./db";

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  ssn_encrypted: Buffer;
  account_number_encrypted: Buffer;
  credit_score: number | null;
  loan_amount: number | null;
  status: "active" | "inactive" | "pending";
  created_at: Date;
  updated_at: Date;
}

// Helper type for query results
type QueryResult<T> = [T[], any];

export async function getAllCustomers(): Promise<Customer[]> {
  try {
    const rows = await executeQuery<Customer[]>(
      `SELECT
        customers.id,
        customers.user_id,
        users.name,
        users.email,
        customers.phone,
        customers.address,
        customers.ssn_encrypted,
        customers.account_number_encrypted,
        customers.credit_score,
        customers.loan_amount,
        customers.status,
        customers.created_at,
        customers.updated_at
      FROM customers
      JOIN users ON customers.user_id = users.id
      WHERE users.role = 'customer'`
    );
    return rows;
  } catch (error) {
    console.error("Error fetching all customers from DB:", error);
    throw error;
  }
}

export async function getCustomerById(
  customerId: string
): Promise<Customer | null> {
  try {
    const result = await executeQuery<QueryResult<Customer>>(
      "SELECT * FROM customers WHERE id = ?",
      [customerId]
    );
    const [rows] = result;
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error(
      `Error fetching customer with ID ${customerId} from DB:`,
      error
    );
    throw error;
  }
}

// Utility function to mask sensitive data for client-side
export function maskCustomerData(customer: Customer) {
  return {
    ...customer,
    ssn_encrypted: "•••-••-••••",
    account_number_encrypted: "••••••" + customer.account_number_encrypted.toString().slice(-4)
  };
}

// Define the input type for saving a customer
interface SaveCustomerInput {
    userId: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    ssn_encrypted: Buffer;
    account_number_encrypted: Buffer;
    credit_score: number | null;
    loan_amount: number | null;
    status: "active" | "inactive" | "pending";
}

export async function saveCustomer({
    userId,
    name,
    email,
    phone,
    address,
    ssn_encrypted,
    account_number_encrypted,
    credit_score,
    loan_amount,
    status,
}: SaveCustomerInput): Promise<Customer | null> {
  try {
    const id = generateId(); // Generate a unique ID for the customer

    // Explicitly type the result of executeQuery for INSERT
    const [result] = await executeQuery<[any, any]>(
      `INSERT INTO customers
       (id, user_id, name, email, phone, address, ssn_encrypted, account_number_encrypted, credit_score, loan_amount, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, // Use NOW() for timestamps
      [
        id,
        userId,
        name,
        email,
        phone,
        address,
        ssn_encrypted,
        account_number_encrypted,
        credit_score,
        loan_amount,
        status,
      ]
    );

    // Assuming the insert was successful, return the created customer object (or part of it)
    // In a real scenario, you might fetch the newly inserted customer or return a confirmation.
    // For simplicity, returning an object matching the shape based on input:
    const createdCustomer: Customer = {
        id,
        user_id: userId,
        name,
        email,
        phone,
        address,
        ssn_encrypted, // Return the buffer for internal use if needed, but likely omit for external API response
        account_number_encrypted, // Return the buffer
        credit_score: credit_score,
        loan_amount: loan_amount,
        status: status,
        created_at: new Date(), // Placeholder date, database has NOW()
        updated_at: new Date(), // Placeholder date
        // You might need to fetch the actual timestamps from the DB after insertion
    };

    // Assuming executeQuery returns something indicating success (e.g., affectedRows)
    // Check result to confirm insertion if needed: if ((result as any).affectedRows > 0) { return createdCustomer; } else { return null; }

    return createdCustomer; // Return the newly created customer object


  } catch (error) {
    console.error("Error saving new customer to DB:", error);
    throw error; // Re-throw to be handled by the API route
  }
}

// Example decryption functions (placeholder)
// import { decrypt } from "@/lib/encryption-utils";
// 
// export function decryptSSN(encryptedSSN: Buffer): string {
//   return decrypt(encryptedSSN.toString('hex'));
// }
// 
// export function decryptAccountNumber(encryptedAccNum: Buffer): string {
//   return decrypt(encryptedAccNum.toString('hex'));
// }

export async function getCustomerByUserId(userId: string): Promise<Customer | null> {
  try {
    const result = await executeQuery<any>(
      "SELECT * FROM customers WHERE user_id = ?",
      [userId]
    );
    return result[0]?.[0] || null;
  } catch (error) {
    console.error("Error fetching customer by userId:", error);
    return null;
  }
}