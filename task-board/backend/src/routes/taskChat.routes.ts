import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/csrf.js';
import * as taskChatController from '../controllers/taskChatController.js';

const router = Router();

router.use(authenticate);

router.get('/tasks/:taskId/chat/messages', taskChatController.getMessages);
router.get('/tasks/:taskId/chat/messages/around', taskChatController.getMessagesAround);
router.get('/tasks/:taskId/chat/messages/search', taskChatController.searchMessages);
router.post('/tasks/:taskId/chat/messages', csrfProtection, taskChatController.sendMessage);
router.put('/chat/messages/:messageId', csrfProtection, taskChatController.editMessage);
router.delete('/chat/messages/:messageId', csrfProtection, taskChatController.deleteMessage);

export default router;
