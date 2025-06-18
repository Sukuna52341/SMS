export function maskSSN(ssn: string): string {
  if (!ssn) return "•••-••-••••";
  // Keep only last 4 digits visible
  return "•••-••-" + ssn.slice(-4);
}

export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber) return "••••••••••";
  // Keep only last 4 digits visible
  return "••••••" + accountNumber.slice(-4);
}

export function maskPhoneNumber(phone: string): string {
  if (!phone) return "•••-•••-••••";
  // Keep only last 4 digits visible
  return "•••-•••-" + phone.slice(-4);
}

export function maskEmail(email: string): string {
  if (!email) return "••••••••";
  const [username, domain] = email.split('@');
  if (!domain) return "••••••••";
  
  // Show first 2 and last 2 characters of username, mask the rest
  const maskedUsername = username.length <= 4 
    ? username.charAt(0) + "•••" 
    : username.slice(0, 2) + "•••" + username.slice(-2);
  
  return `${maskedUsername}@${domain}`;
}

export function maskAddress(address: string): string {
  if (!address) return "••••••••";
  // Show only first 2 characters of each word, mask the rest
  return address.split(' ').map(word => {
    if (word.length <= 2) return word;
    return word.slice(0, 2) + "•".repeat(word.length - 2);
  }).join(' ');
} 