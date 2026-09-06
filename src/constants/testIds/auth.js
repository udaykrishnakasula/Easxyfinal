// Test IDs for the auth feature (login, register, password reset, logout).
// Add new keys here as you wire up additional auth UI; see ./index.js for
// the recipe to add a new feature file.
//
// Directive:
//   - Keys are camelCase, values are kebab-case shaped as `<feature>-<element>`
//     (or `<feature>-<element>-<qualifier>` when an element repeats). Examples:
//     'login-submit-button', 'cart-quantity-input', 'product-card-image'.
//   - Reference them in JSX as `data-testid={LOGIN.submitButton}`.
//
// Why kebab-case values: required by qabot's CSS-attribute selector matcher
// and the lint rule `emergent(kebab-case-testid)`.

export const LOGIN = {
	emailInput: 'login-email-input',
	passwordInput: 'login-password-input',
	passwordToggle: 'login-password-toggle',
	submitButton: 'login-submit-button',
	forgotPasswordLink: 'login-forgot-password-link',
	registerLink: 'login-register-link',
};

export const REGISTER = {
	nameInput: 'register-name-input',
	emailInput: 'register-email-input',
	passwordInput: 'register-password-input',
	passwordToggle: 'register-password-toggle',
	passwordConfirmInput: 'register-password-confirm-input',
	passwordConfirmToggle: 'register-password-confirm-toggle',
	passwordStrength: 'register-password-strength',
	passwordStrengthLabel: 'register-password-strength-label',
	passwordRuleLength: 'register-password-rule-length',
	passwordRuleNumber: 'register-password-rule-number',
	passwordRuleSpecial: 'register-password-rule-special',
	passwordRuleCase: 'register-password-rule-case',
	submitButton: 'register-submit-button',
	loginLink: 'register-login-link',
};

export const FORGOT_PASSWORD = {
	emailInput: 'forgot-password-email-input',
	submitButton: 'forgot-password-submit-button',
	backToLoginLink: 'forgot-password-back-link',
	codeInput: 'forgot-password-code-input',
	verifyButton: 'forgot-password-verify-button',
	resendButton: 'forgot-password-resend-button',
	newPasswordInput: 'forgot-password-new-password-input',
	newPasswordToggle: 'forgot-password-new-password-toggle',
	confirmPasswordInput: 'forgot-password-confirm-password-input',
	confirmPasswordToggle: 'forgot-password-confirm-password-toggle',
	resetSubmitButton: 'forgot-password-reset-submit-button',
	successSignInButton: 'forgot-password-success-signin-button',
};

export const LOGOUT = {
	button: 'logout-button',
};
