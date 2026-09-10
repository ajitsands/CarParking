import React from 'react';

export default function StatusBadge({ status }) {
  const norm = (status || '').toUpperCase();

  let badgeClass = 'badge-gray';
  let label = norm;

  switch (norm) {
    case 'VALIDATED':
    case 'PAID':
    case 'EXIT_AUTHORIZED':
      badgeClass = 'badge-green';
      label = norm === 'VALIDATED' ? 'Validated (Free)' : norm;
      break;

    case 'VALIDATION_PENDING':
    case 'ENTRY_DETECTED':
    case 'ENTRY_ALLOWED':
      badgeClass = 'badge-amber';
      label = norm === 'VALIDATION_PENDING' ? 'Validation Pending' : norm;
      break;

    case 'CHARGING':
    case 'PAYMENT_PENDING':
    case 'BLACKLISTED':
      badgeClass = 'badge-red';
      label = norm === 'CHARGING' ? 'Charging' : norm;
      break;

    case 'WHITELISTED':
    case 'EXIT_COMPLETED':
      badgeClass = 'badge-blue';
      label = norm === 'EXIT_COMPLETED' ? 'Completed' : 'Whitelisted';
      break;

    case 'EMERGENCY_PRIORITY':
    case 'MANUAL_REVIEW':
      badgeClass = 'badge-purple';
      label = norm === 'MANUAL_REVIEW' ? 'Manual Review' : 'Emergency Priority';
      break;

    default:
      badgeClass = 'badge-gray';
      label = norm || 'Standard';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      {label}
    </span>
  );
}
