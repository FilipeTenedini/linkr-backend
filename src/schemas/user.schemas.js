import Joi from 'joi';
import sanitize from 'sanitize-html';

const sanitizeText = (value) => sanitize(value, {
  allowedTags: [],
  allowedAttributes: {},
});

export const signUp = Joi.object({
  name: Joi
    .string()
    .custom((value) => sanitizeText(value))
    .required()
    .trim(true),
  email: Joi
    .string()
    .custom((value) => sanitizeText(value))
    .email()
    .required()
    .trim(true),
  password: Joi
    .string()
    .custom((value, helpers) => {
      if (/\s/.test(value)) {
        return helpers.error('string.whitespace');
      }
      return value;
    })
    .required()
    .messages({
      'string.whitespace': '{{#label}} cannot contain blanks',
    }),
  photo: Joi
    .string()
    .uri()
    .optional(),
});

export const signIn = Joi.object({
  email: Joi
    .string()
    .custom((value) => sanitizeText(value))
    .email()
    .required()
    .trim(true),
  password: Joi
    .string()
    .custom((value) => sanitizeText(value))
    .required()
    .trim(true),
});
