export { scanProject, collectWorkspaceDeps } from './scanner.js';
export { generateContext } from './generator.js';
export { TemplateEngine } from './templates.js';
export { analyzeContextFile, detectContextFiles } from './analyzer.js';
export {
  learnTasteFromProject,
  loadTasteProfile,
  saveTasteProfile,
  mergeTasteProfile,
  createDefaultTaste,
  formatTasteProfile,
  applyTasteToSection,
} from './taste.js';
export { analyzeSourceCode, formatCodeAnalysis, generateCodeSuggestions, formatCodeSuggestions } from './code-analyzer.js';
export type * from './types.js';
