const validate = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid request',
        errors: []
      });
    }
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.query);
      req.validatedQuery = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: errors
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid query',
        errors: []
      });
    }
  };
};

const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.params);
      req.validatedParams = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Invalid URL parameters',
          errors: errors
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid parameters',
        errors: []
      });
    }
  };
};

module.exports = {
  validate,
  validateQuery,
  validateParams
};