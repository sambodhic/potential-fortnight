// Topic and verification are independent. Explicit editorial categories take precedence.
function needCategories(p) {
  if (Array.isArray(p.categories) && p.categories.length) return p.categories;
  if (p.category && p.category !== 'Community') return [p.category];
  // These short titles omit the facility or crossing type documented in their reports.
  const topicOverrides = {'candidate-031': ['Schools'], 'candidate-408': ['Bridges']};
  if (topicOverrides[p.id]) return topicOverrides[p.id];
  const title = p.title || '';
  const rules = [
    ['Bridges', /bridge|crossing|footbridge|culvert|cantilever|pedestrian connection|pedestrian circuit/i],
    ['Accessibility', /accessibility|wheelchair|barrier-free|step-free|disabled|\bramps?\b|disabilit/i],
    ['Water', /\bwater\b|boreholes?|\bwells?\b|rainwater|tubewell|cistern|desalination|\btaps?\b|hand.?pump|handwashing/i],
    ['Sanitation', /toilet|sanitation|sanitary|sewage|sewer|latrine|bathroom|restroom|washroom|ablution|lavator|drainage|plumbing|enviro loos/i],
    ['Electricity', /electric|power|generator|solar|wiring|blackout|\bHVAC\b|heating|air.condition/i],
    ['Schools', /school|classroom|pupils?|students?|kindergarten|preschool|lyc[eé]e|lyceum|escuela|escola|colegio|institut|primaria|secundaria|elementary|primary|secondary|gymnasi|university|faculty|college|learning cent|centro educativo|progimnazija|academy|\b(EPP|EP|IE|IES|CEIP|ESRN|OŠ)\b/i],
    ['Healthcare', /hospital|clinic|health (?:cent|facility|structure|unit)|rehabilitation cent|maternity|pharmacy|patients?|midwife|\bPHC\b/i],
  ];
  const topics = rules.filter(([, pattern]) => pattern.test(title)).map(([topic]) => topic);
  return topics.length ? topics : ['Infrastructure'];
}

// Present both source formats as needs, preserving stable IDs and provenance.
function mergeNeeds(curated, reports) {
  const promoted = new Set(curated.map(p => p.sourceCandidateId).filter(Boolean));
  const seen = new Set(curated.map(p => p.id));
  return [
    ...curated.map(p => ({...p, origin: 'directory', categories: needCategories(p)})),
    ...reports.filter(p => {
      if (p.publicationStatus === 'Promoted' || promoted.has(p.id) || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    }).map(p => ({
      ...p, origin: 'report', category: needCategories(p)[0], categories: needCategories(p),
      summary: p.reportedScope || p.title,
      description: p.reportedScope || p.title,
      status: p.verificationStatus || 'Needs verification',
      needs: [p.nextStep || 'Confirm current conditions and what help is wanted.'],
      affected: p.reportedScope, contact: null,
      sources: (p.sources || []).filter(s => /^https?:\/\//.test(s.url)).map(s => ({
        ...s, label: s.label || new URL(s.url).hostname,
      })),
    })),
  ];
}
