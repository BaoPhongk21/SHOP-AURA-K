/**
 * Auth Validation Schemas
 * File này chứa các quy tắc kiểm tra dữ liệu cho quá trình xác thực.
 */
const Joi = require('joi');

const passwordComplexity = (value, helpers) => {
    if (value.length < 8) {
        return helpers.message('Mật khẩu phải có ít nhất 8 ký tự.');
    }
    
    // Kiểm tra không quá 2 ký tự giống nhau liên tiếp
    if (/(.)\1\1/.test(value)) {
        return helpers.message('Mật khẩu không được chứa quá 2 ký tự giống nhau liên tiếp.');
    }

    let conditionsMet = 0;
    if (/[a-z]/.test(value)) conditionsMet++;
    if (/[A-Z]/.test(value)) conditionsMet++;
    if (/[0-9]/.test(value)) conditionsMet++;
    if (/[^a-zA-Z0-9\s]/.test(value)) conditionsMet++;

    if (conditionsMet < 3) {
        return helpers.message('Mật khẩu phải thỏa mãn ít nhất 3 trong 4 điều kiện: chữ thường (a-z), chữ hoa (A-Z), chữ số (0-9), hoặc ký tự đặc biệt (!@#$...).');
    }

    return value;
};

const registerValidation = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().custom(passwordComplexity).required(),
    phone: Joi.string().pattern(/^(84|0[3|5|7|8|9])([0-9]{8})$/).required()
});

const loginValidation = Joi.object({
    identifier: Joi.string().required(),
    password: Joi.string().required()
});

module.exports = {
    registerValidation,
    loginValidation
};