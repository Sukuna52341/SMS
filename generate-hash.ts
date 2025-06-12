// generate-hash.ts
import { hashPassword } from "./lib/db";

function generateHashes() {
  const password = "password";
  const hashedPassword = hashPassword(password);
  
  console.log("Hashed password for 'password':");
  console.log(hashedPassword);
}

generateHashes();