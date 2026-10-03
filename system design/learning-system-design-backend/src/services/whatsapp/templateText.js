// Render the approved definition with the exact parameters sent to Meta.
// One pass keeps customer values containing {{...}} literal.
function templateText(definition, sent) {
  if (!definition || definition.name !== sent.name || definition.language !== sent.language.code) return null;
  const parts = [];
  for (const component of definition.components || []) {
    if (!['HEADER', 'BODY', 'FOOTER'].includes(component.type) || typeof component.text !== 'string') continue;
    const parameters = sent.components?.find(c => c.type === component.type.toLowerCase())?.parameters || [];
    let missing = false;
    const text = component.text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const parameter = /^\d+$/.test(key) ? parameters[Number(key) - 1] : parameters.find(p => p.parameter_name === key);
      if (parameter?.type !== 'text') { missing = true; return ''; }
      return parameter.text;
    });
    if (missing) return null;
    parts.push(text);
  }
  const buttons = definition.components?.find(c => c.type === 'BUTTONS')?.buttons || [];
  parts.push(...buttons.map(button => button.text).filter(Boolean));
  return parts.length ? parts.join('\n\n') : null;
}
module.exports = { templateText };
