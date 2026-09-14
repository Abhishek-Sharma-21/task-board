import { Router } from 'express';
import { RegisterInput, LoginInput } from '../schemas.js';
import * as controller from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { csrfProtection, ensureCsrfCookie } from '../middleware/csrf.js';
import { validateBody } from '../validators/index.js';

const router = Router();

// Public auth routes: issue a CSRF cookie but don't require one (the client
// doesn't have one yet on the very first register/login call).
router.post('/register', ensureCsrfCookie, validateBody(RegisterInput), controller.register);
router.post('/login', ensureCsrfCookie, validateBody(LoginInput), controller.login);
router.post('/refresh', ensureCsrfCookie, controller.refresh);

// Authenticated, state-changing: enforce strict double-submit CSRF.
router.post('/logout', authenticate, csrfProtection, controller.logout);
router.get('/me', authenticate, ensureCsrfCookie, controller.me);

export default router;