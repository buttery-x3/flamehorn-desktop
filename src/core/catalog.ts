import type { Kind, ProcessConfig, Capabilities, Profile } from './types';
import templates from './templates.json';
export const CATALOG: Record<Kind, { inputs: string[]; outputs: string[]; instruction: string; calls: number }> = {
  Respond: { inputs: ['in'], outputs: ['1'], instruction: 'Respond to the latest turn in the provided context.', calls: 1 },
  Continue: { inputs: ['in'], outputs: ['1'], instruction: 'Continue the material in the latest turn of the provided context.', calls: 1 },
  Narrow: { inputs: ['in'], outputs: ['1'], instruction: 'Narrow the provided context towards a clearer, more focused conceptual core.', calls: 1 },
  Expand: { inputs: ['in'], outputs: ['1'], instruction: 'Expand on the provided context, exploring further ideas and possibilities.', calls: 1 },
  Mirror: { inputs: ['in'], outputs: ['1'], instruction: 'repeat back the context', calls: 1 },
  Challenge: { inputs: ['in'], outputs: ['1'], instruction: 'Challenge assumptions in the provided context.', calls: 1 },
  Reinterpret: { inputs: ['in'], outputs: ['1'], instruction: 'reinterpret the context from a fresh perspective', calls: 1 },
  History: { inputs: ['in'], outputs: ['1'], instruction: 'Explore the historical context and development of the ideas presented in the provided context.', calls: 1 },
  Fork: { inputs: ['in'], outputs: ['1', '2'], instruction: 'Identify two distinct themes, identities or directions in the provided context and develop each into a separate exploration.', calls: 3 },
  Explode: { inputs: ['in'], outputs: ['1','2','3','4','5','6','7','8'], instruction: 'Identify eight distinct themes, identities or directions in the provided context and develop each into a separate exploration.', calls: 9 },
  Merge: { inputs: ['A','B'], outputs: ['1'], instruction: 'Merge the concepts presented in context A and context B.', calls: 1 },
  Compare: { inputs: ['A','B'], outputs: ['1'], instruction: 'Compare context A and context B, pointing out similarities and differences.', calls: 1 },
  'Three Experts': { inputs: ['in'], outputs: ['mechanistic','cognitive-science','skeptical'], instruction: 'Give three different expert interpretations of the provided context: one mechanistic; one cognitive-science flavored; and one skeptical, pointing out limits and unknowns.', calls: 3 },
};
export const PERSONAS: Record<string, string> = {
  None: '', Formal: 'Use polished, measured, academically neutral phrasing with clear syntax and precise word choice.',
  'Best Friend': 'Use warm, casual, supportive phrasing with gentle playfulness and familiar ease.',
  Grandma: 'Use gentle, nurturing phrasing with slightly old-fashioned warmth.',
  'Fantasy Bard': 'Use melodic, rhythmic phrasing with vivid imagery and light dramatic flair.',
  'Fantasy Goblin': 'Use scrappy, jagged, mischievous phrasing with energetic rhythms and playful rough edges.',
  'Schoolyard Bully': 'Use blunt, impatient, slightly mocking phrasing without directing hostility at the user.',
  'Noir Detective': 'Use dry, clipped sentences with a moody, atmospheric edge; the voice does not itself add an investigative task.',
  Whimsical: 'Use light, imaginative phrasing with soft metaphor and gentle playfulness.',
  Deadpan: 'Use spare, dry phrasing and understated wit.', Overexcited: 'Use enthusiastic, high-energy phrasing with quick verbal momentum.',
  Courtly: 'Use refined, ceremonially polite phrasing and elevated diction.',
  'Techno-Minimalist': 'Use clean, efficient phrasing with minimal ornamentation and compact expression.',
};
export const FORMATS: Record<string, string> = { None: '', Long: 'Give a detailed, extended response.', Short: 'Keep the response brief.', Haiku: 'Express the response as a haiku.', 'Bullet Point': 'Present the response as bullet points.', Emoji: 'Express the response using emoji only.' };
export const DEFAULT_CAPABILITIES: Capabilities = { text: 'declared', roles: 'declared', images: 'unknown', pdf: 'unknown', assistantAssets: 'unknown', overflow: 'unknown', outputCap: false, reasoningValues: [], source: 'User configuration; not yet verified in Flamehorn.', revision: 1 };
export function profileForModel(profile:Profile,model:string):Profile {
  const exact=profile.modelCapabilities?.[model];
  if(exact)return {...profile,capabilities:structuredClone(exact)};
  return {...profile,capabilities:{...profile.capabilities,images:'unknown',pdf:'unknown',assistantAssets:'unknown',contextTokens:undefined,outputTokens:undefined,reasoning:undefined,reasoningValues:[],source:profile.capabilities.source+' Model-specific modalities and limits have not been configured.'}};
}
export function processConfig(kind: Kind, defaults: { persona: string; format: string }): ProcessConfig {
  return { kind, instruction: CATALOG[kind].instruction, persona: { name: defaults.persona, text: PERSONAS[defaults.persona] ?? '' }, format: { name: defaults.format, text: FORMATS[defaults.format] ?? '' }, template: TEMPLATES['Sequential · Process + Persona + Format'], templateName: 'Sequential · Process + Persona + Format', append: false };
}
// These complete variants are extracted verbatim from the approved compiler specification.
export const TEMPLATES: Record<string, string> = templates;
