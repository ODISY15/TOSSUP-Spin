import handler from '../../api/presets.js';
import { adaptVercelHandler } from './_vercel-adapter.mjs';

export default adaptVercelHandler(handler);
