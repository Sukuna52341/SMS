# Document Upload Feature for Loan Applications

## Overview
This feature allows customers to upload supporting documents when applying for loans, with encrypted storage and admin viewing capabilities.

## Features

### For Customers
- Upload multiple document types during loan application
- Supported document types:
  - Government ID (Passport, National ID, Driver's License)
  - Income Proof (Payslips, Bank statements, Business registration)
  - Collateral Documents
  - Bank Statements (last 3 months)
  - Other supporting documents
- File size limit: 4MB per document
- Supported file formats: PDF, Images (JPEG, PNG, GIF), Word documents, Excel files
- Real-time file validation
- Document management (view, delete)

### For Admins
- View all uploaded documents for each loan application
- Download/view documents securely
- Audit trail for document access
- Integrated with loan approval process

## Security Features

### Encryption
- All documents are encrypted using AES-256-CBC before storage
- Encryption keys are managed securely
- Documents are decrypted only when accessed by authorized users

### Access Control
- Customers can only view their own documents
- Admins and staff can view documents for loan applications they have access to
- All document access is logged in the audit trail

### File Validation
- Server-side validation of file types and sizes
- Client-side validation for immediate feedback
- Protection against malicious file uploads

## Database Schema

### New Table: `loan_documents`
```sql
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
```

## API Endpoints

### Upload Document
- **POST** `/api/loans/documents`
- Uploads a new document for a loan application
- Requires customer authentication
- Returns document metadata

### List Documents
- **GET** `/api/loans/documents?loanId={loanId}`
- Lists all documents for a specific loan
- Requires authentication and authorization

### Download Document
- **GET** `/api/loans/documents/{documentId}`
- Downloads/view a specific document
- Requires authentication and authorization
- Returns the decrypted file

### Admin Loan Details
- **GET** `/api/admin/loans/{loanId}`
- Returns loan details with all associated documents
- Requires admin/staff authentication

## Components

### DocumentUpload Component
- React component for document upload interface
- Handles file selection, validation, and upload
- Shows upload progress and error messages
- Supports document management (view, delete)

### LoanDocumentsViewer Component
- Admin component for viewing loan documents
- Displays loan details with document list
- Provides document viewing/downloading capabilities

## Usage

### Customer Loan Application Flow
1. Customer fills out loan application form
2. Customer uploads required documents
3. Customer reviews application and submits
4. Application is stored with encrypted documents

### Admin Review Flow
1. Admin views pending loan applications
2. Admin clicks "View Details" to see loan information and documents
3. Admin can view/download individual documents
4. Admin approves/rejects the loan application

## Audit Trail
All document-related actions are logged:
- Document uploads
- Document views/downloads
- Document deletions
- Loan application submissions
- Loan approvals/rejections

## File Storage
- Documents are stored as encrypted BLOB data in the database
- No files are stored on the filesystem
- Encryption ensures data security at rest
- Automatic cleanup when loans are deleted

## Error Handling
- File size validation (4MB limit)
- File type validation (PDF, Images, Word, Excel)
- Network error handling
- Authentication/authorization error handling
- Graceful degradation for failed uploads

## Performance Considerations
- Client-side validation reduces server load
- Efficient file handling with streaming
- Database indexing on loan_id for fast queries
- Optimized document retrieval for admin interface 