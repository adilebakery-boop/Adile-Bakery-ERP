const z = require('zod');

const disposableDomains = [
  'tempmail.com', 'tempmail.org', 'guerrillamail.com', 'guerrillamail.org',
  'mailinator.com', 'throwam.com', 'sharklasers.com', 'guerrillamailblock.com',
  'grr.la', 'guerrillamail.info', 'guerrillamail.biz', 'guerrillamail.de',
  'yopmail.com', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf', 'nospam.ze.tc',
  'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr', 'courriel.fr.nf',
  'moncourrier.fr.nf', 'monemail.fr.nf', 'monmail.fr.nf', 'dispostable.com',
  'mailnull.com', 'spamgourmet.com', 'trashmail.com', 'trashmail.me',
  'trashmail.net', 'trashmail.org', 'fakeinbox.com', 'mailnew.com',
  'maildrop.cc', 'spamfree24.org', 'spamhereplease.com', 'spam4.me',
  'tempr.email', 'discard.email', 'spamgob.com', 'throwam.com',
  'tempemail.co', 'temp-mail.org', 'temp-mail.io', 'emailondeck.com'
];

const emailSchema = z.string().email().refine(
  (val) => {
    const domain = val.split('@')[1]?.toLowerCase();
    return !disposableDomains.includes(domain);
  },
  { message: 'Temporary or disposable email addresses are not allowed' }
).or(z.literal('')).optional().nullable();

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be less than 50 characters'),
  password: passwordSchema,
  roleId: z.number().int().positive('Role ID must be a positive integer'),
  branchId: z.number().int().positive('Branch ID must be a positive integer').nullable().optional(),
  email: emailSchema
});

const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  roleId: z.number().int().positive('Role ID must be a positive integer').optional(),
  branchId: z.number().int().positive('Branch ID must be a positive integer').nullable().optional(),
  email: emailSchema
});

const userIdSchema = z.object({
  id: z.coerce.number().int().positive('ID must be a positive integer')
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  userIdSchema,
  passwordSchema
};
