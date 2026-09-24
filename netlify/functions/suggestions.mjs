import handler from '../../api/suggestions.js';
import { adaptVercelHandler } from './_vercel-adapter.mjs';

export default adaptVercelHandler(handler);
