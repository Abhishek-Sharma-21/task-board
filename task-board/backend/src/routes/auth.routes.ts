import { Router } from 'express';
import { RegisterInput, LoginInput, ChangePasswordInput } from '../schemas.js';
import * as controller from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../validators/index.js';

const router = Router();

// Public auth routes: issue a CSRF cookie but don't require one (the client
// doesn't have one yet on the very first register/login call).
router.post('/register', validateBody(RegisterInput), controller.register);
router.post('/login', validateBody(LoginInput), controller.login);
router.post('/refresh', controller.refresh);

// Authenticated, state-changing: enforce strict double-submit CSRF.
router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.me);
router.post('/change-password', authenticate, validateBody(ChangePasswordInput), controller.changePassword);

export default router;