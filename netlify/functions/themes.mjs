import handler from '../../api/themes.js';
import { adaptVercelHandler } from './_vercel-adapter.mjs';

export default adaptVercelHandler(handler);
