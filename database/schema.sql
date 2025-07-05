-- Database schema for Secure Microfinance System

-- Create database
CREATE DATABASE IF NOT EXISTS secure_microfinance;
USE secure_microfinance;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff', 'customer') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  status ENUM('active', 'inactive', 'locked') DEFAULT 'active'
);

-- Customers table with encrypted sensitive data
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  -- Encrypted sensitive data
  ssn_encrypted VARBINARY(255) NOT NULL,
  account_number_encrypted VARBINARY(255) NOT NULL,
  credit_score INT,
  loan_amount DECIMAL(10, 2),
  status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Loans table
CREATE TABLE IF NOT EXISTS loans (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) NOT NULL,
  amount_encrypted VARBINARY(255) NOT NULL,
  purpose_encrypted VARBINARY(255) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  approved_by VARCHAR(36),
  approved_at TIMESTAMP NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Loan documents table
CREATE TABLE IF NOT EXISTS loan_documents (
  id VARCHAR(36) PRIMARY KEY,
  loan_id VARCHAR(36) NOT NULL,
  document_type ENUM('government_id', 'income_proof', 'collateral_document', 'bank_statement', 'other') NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_data_encrypted LONGBLOB NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_role VARCHAR(20) NOT NULL,
  details TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Privacy settings table
CREATE TABLE IF NOT EXISTS privacy_settings (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  marketing_consent BOOLEAN DEFAULT TRUE,
  data_sharing BOOLEAN DEFAULT FALSE,
  anonymous_analytics BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Privacy requests table
CREATE TABLE IF NOT EXISTS privacy_requests (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  request_type ENUM('access', 'correction', 'deletion') NOT NULL,
  request_reason TEXT NOT NULL,
  status ENUM('pending', 'in_progress', 'completed', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Training modules table
CREATE TABLE IF NOT EXISTS training_modules (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  duration VARCHAR(20) NOT NULL,
  category ENUM('required', 'optional') DEFAULT 'required',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User training progress table
CREATE TABLE IF NOT EXISTS user_training (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  module_id VARCHAR(36) NOT NULL,
  status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
  progress INT DEFAULT 0,
  score INT NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  due_date TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES training_modules(id) ON DELETE CASCADE,
  UNIQUE KEY user_module (user_id, module_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_privacy_requests_user_id ON privacy_requests(user_id);
CREATE INDEX idx_user_training_user_id ON user_training(user_id);
CREATE INDEX idx_user_training_module_id ON user_training(module_id);

-- Create stored procedures for encryption and decryption
DELIMITER //

-- Procedure to insert a new customer with encrypted data
CREATE PROCEDURE InsertCustomer(
  IN p_id VARCHAR(36),
  IN p_user_id VARCHAR(36),
  IN p_name VARCHAR(255),
  IN p_email VARCHAR(255),
  IN p_phone VARCHAR(20),
  IN p_address TEXT,
  IN p_ssn VARCHAR(20),
  IN p_account_number VARCHAR(20),
  IN p_credit_score INT,
  IN p_loan_amount DECIMAL(10, 2),
  IN p_status VARCHAR(10)
)
BEGIN
  DECLARE encryption_key VARCHAR(255);
  SET encryption_key = 'your_secure_encryption_key'; -- In production, this would be securely managed
  
  INSERT INTO customers (
    id, user_id, name, email, phone, address, 
    ssn_encrypted, account_number_encrypted, 
    credit_score, loan_amount, status
  ) VALUES (
    p_id, p_user_id, p_name, p_email, p_phone, p_address,
    AES_ENCRYPT(p_ssn, encryption_key),
    AES_ENCRYPT(p_account_number, encryption_key),
    p_credit_score, p_loan_amount, p_status
  );
END //

-- Procedure to get customer data with decrypted sensitive information
CREATE PROCEDURE GetCustomerWithSensitiveData(
  IN p_customer_id VARCHAR(36)
)
BEGIN
  DECLARE encryption_key VARCHAR(255);
  SET encryption_key = 'your_secure_encryption_key'; -- In production, this would be securely managed
  
  SELECT 
    c.id, c.user_id, c.name, c.email, c.phone, c.address,
    CAST(AES_DECRYPT(c.ssn_encrypted, encryption_key) AS CHAR) AS ssn,
    CAST(AES_DECRYPT(c.account_number_encrypted, encryption_key) AS CHAR) AS account_number,
    c.credit_score, c.loan_amount, c.status, c.created_at, c.updated_at
  FROM 
    customers c
  WHERE 
    c.id = p_customer_id;
    
  -- Log this access to audit trail
  INSERT INTO audit_logs (
    id, action, resource_type, resource_id, 
    user_id, user_name, user_role, details
  )
  SELECT 
    UUID(), 'VIEW_SENSITIVE', 'CUSTOMER', p_customer_id,
    CURRENT_USER(), CURRENT_USER(), 'system', 'Accessed sensitive customer data via stored procedure'
  FROM 
    dual;
END //

DELIMITER ;

-- Insert sample data for demonstration
-- Note: In a real system, passwords would be properly hashed
INSERT INTO users (id, name, email, password_hash, role) VALUES
('1', 'Admin User', 'admin@example.com', 'hashed_password', 'admin'),
('2', 'Staff User', 'staff@example.com', 'hashed_password', 'staff'),
('3', 'Customer User', 'customer@example.com', 'hashed_password', 'customer');

-- Insert sample training modules
INSERT INTO training_modules (id, title, description, duration, category) VALUES
('1', 'Data Privacy Basics', 'Learn the fundamentals of data privacy and protection', '30 minutes', 'required'),
('2', 'Handling Sensitive Customer Data', 'Best practices for working with sensitive customer information', '45 minutes', 'required'),
('3', 'Security Awareness', 'Identifying and preventing security threats', '40 minutes', 'required'),
('4', 'GDPR Compliance', 'Understanding GDPR requirements and compliance', '60 minutes', 'optional'),
('5', 'Data Breach Response', 'Procedures to follow in case of a data breach', '35 minutes', 'optional');
