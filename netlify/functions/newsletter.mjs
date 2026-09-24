import handler from '../../api/newsletter.js';
import { adaptVercelHandler } from './_vercel-adapter.mjs';

export default adaptVercelHandler(handler);
