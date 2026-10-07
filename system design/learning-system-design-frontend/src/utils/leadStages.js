// Group historical stages for display without rewriting saved lead records.
export const leadStageGroups = [
  { key: 'NEW', label: 'New', statuses: ['NEW'] },
  { key: 'DISCUSSION', label: 'In discussion', statuses: ['CONTACTED', 'REQUIREMENT', 'CATALOGUE', 'NEGOTIATION', 'SAMPLE'] },
  { key: 'QUOTATION', label: 'Quotation', statuses: ['QUOTATION'] },
  { key: 'CLOSED', label: 'Closed', statuses: ['ORDER', 'PRODUCTION', 'DISPATCH', 'COMPLETED', 'LOST'] },
];

export const leadStatusOptions = [
  { key: 'NEW', label: 'New', statuses: ['NEW'], color: '#64748b' },
  { key: 'CONTACTED', label: 'In discussion', statuses: leadStageGroups[1].statuses, color: '#475569' },
  { key: 'QUOTATION', label: 'Quotation', statuses: ['QUOTATION'], color: '#2563eb' },
  { key: 'COMPLETED', label: 'Won', statuses: ['ORDER', 'PRODUCTION', 'DISPATCH', 'COMPLETED'], color: '#15803d' },
  { key: 'LOST', label: 'Not proceeding', statuses: ['LOST'], color: '#6b7280' },
];

export const getLeadStatus = status => leadStatusOptions.find(option => option.statuses.includes(status))
  || { key: status, label: 'Other', color: '#64748b' };

// Retain a historical value when editing unrelated details. Changing the stage
// intentionally uses the representative status accepted by the existing API.
export const getLeadStatusOptions = currentStatus => leadStatusOptions.map(option => ({
  ...option,
  value: option.statuses.includes(currentStatus) ? currentStatus : option.key,
}));

export const countLeadStage = (group, byStatus = []) => byStatus.reduce(
  (count, item) => count + (group.statuses.includes(item.status) ? item._count : 0), 0,
);
