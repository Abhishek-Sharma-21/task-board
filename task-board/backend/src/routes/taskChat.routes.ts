import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as taskChatController from '../controllers/taskChatController.js';

const router = Router();

router.use(authenticate);

router.get('/tasks/:taskId/chat/messages', taskChatController.getMessages);
router.get('/tasks/:taskId/chat/messages/around', taskChatController.getMessagesAround);
router.get('/tasks/:taskId/chat/messages/search', taskChatController.searchMessages);
router.post('/tasks/:taskId/chat/messages', taskChatController.sendMessage);
router.put('/chat/messages/:messageId', taskChatController.editMessage);
router.delete('/chat/messages/:messageId', taskChatController.deleteMessage);

export default router;
