const { z } = require('zod');

/**
 * Zod validation middleware factory.
 * Validates req.body against a Zod schema and returns a standardized
 * error response matching the project's API response contract (Rules.md §6).
 *
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'input';
        return `${path}: ${issue.message}`;
      });

      return res.status(400).json({
        success: false,
        message: `Validation failed: ${errors.join('; ')}`,
        error: 'VALIDATION_FAILED',
      });
    }

    // Replace req.body with the parsed (and possibly transformed) data
    req.body = result.data;
    next();
  };
};

module.exports = validate;
