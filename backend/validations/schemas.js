const { z } = require('zod');

// ─── Auth Schemas ────────────────────────────────────────────────

const registerOwnerSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().min(1, 'Email is required').email('Invalid email format').trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  societyName: z.string().min(1, 'Society name is required').trim(),
  address: z.string().min(1, 'Address is required').trim(),
  city: z.string().min(1, 'City is required').trim(),
  registrationNumber: z.string().optional(),
});

const registerResidentSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().min(1, 'Email is required').email('Invalid email format').trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  societyCode: z.string().min(1, 'Society code is required').trim(),
  unitNumber: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format').trim(),
  password: z.string().min(1, 'Password is required'),
});

// ─── Payment Schemas ─────────────────────────────────────────────

const createOrderSchema = z.object({
  billId: z.string().min(1, 'billId is required to create a payment order'),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, 'razorpay_order_id is required'),
  razorpay_payment_id: z.string().min(1, 'razorpay_payment_id is required'),
  razorpay_signature: z.string().min(1, 'razorpay_signature is required'),
});

const generateBillSchema = z.object({
  residentId: z.string().min(1, 'residentId is required'),
  unitNumber: z.string().min(1, 'unitNumber is required'),
  month: z.string().min(1, 'month is required'),
  dueDate: z.string().min(1, 'dueDate is required'),
  amount: z.union([z.number(), z.string()]).optional(),
});

const generateBulkBillsSchema = z.object({
  month: z.string().min(1, 'month is required'),
  dueDate: z.string().min(1, 'dueDate is required'),
  title: z.string().optional(),
  amount: z.union([z.number(), z.string()]).optional(),
  description: z.string().optional(),
});

// ─── Finance Schemas ─────────────────────────────────────────────

const recordExpenseSchema = z.object({
  category: z.string().min(1, 'Category is required').trim(),
  amount: z.union([
    z.number().positive('Amount must be a positive number'),
    z.string().min(1, 'Amount is required'),
  ]),
  paymentMethod: z.enum(['razorpay', 'cash', 'cheque', 'bank_transfer'], {
    message: 'paymentMethod must be one of: razorpay, cash, cheque, bank_transfer',
  }),
  description: z.string().min(1, 'Description is required').trim(),
  date: z.string().optional(),
});

// ─── Committee Schemas ───────────────────────────────────────────

const createCommitteeSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().min(1, 'Email is required').email('Invalid email format').trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  customLabel: z.string().min(1, 'Custom label is required').trim(),
  permissions: z.array(z.string()).optional(),
});

// ─── Complaint Schemas ───────────────────────────────────────────

const createComplaintSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  description: z.string().min(1, 'Description is required').trim(),
  imageUrl: z.string().optional().nullable(),
});

// ─── Notice Schemas ──────────────────────────────────────────────

const createNoticeSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  body: z.string().min(1, 'Body is required').trim(),
  isPriority: z.boolean().optional(),
});

module.exports = {
  registerOwnerSchema,
  registerResidentSchema,
  loginSchema,
  createOrderSchema,
  verifyPaymentSchema,
  generateBillSchema,
  generateBulkBillsSchema,
  recordExpenseSchema,
  createCommitteeSchema,
  createComplaintSchema,
  createNoticeSchema,
};
