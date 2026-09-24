import handler from '../../api/option-collections.js';
import { adaptVercelHandler } from './_vercel-adapter.mjs';

export default adaptVercelHandler(handler);
