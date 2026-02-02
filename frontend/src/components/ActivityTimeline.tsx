import type { LoanEvent, EventType } from '@loan-management/shared';
import { formatAmount } from '../utils/format';

interface ActivityTimelineProps {
  events: LoanEvent[];
}

function EventIcon({ eventType }: { eventType: EventType }) {
  const styles: Record<EventType, { bg: string; icon: string }> = {
    LOAN_CREATED: { bg: 'bg-blue-500', icon: '+' },
    STATUS_CHANGE: { bg: 'bg-purple-500', icon: '→' },
    LOAN_EDITED: { bg: 'bg-yellow-500', icon: '✎' },
    PAYMENT_RECEIVED: { bg: 'bg-green-500', icon: '$' },
  };

  const style = styles[eventType] || { bg: 'bg-gray-400', icon: '?' };

  return (
    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${style.bg} ring-8 ring-white`}>
      <span className="text-white text-sm font-medium">{style.icon}</span>
    </span>
  );
}

function formatFieldName(field: string): string {
  const fieldMap: Record<string, string> = {
    principalAmountMicros: 'Principal',
    interestRateBps: 'Interest rate',
    termMonths: 'Term',
    borrowerId: 'Borrower',
    status: 'Status',
  };
  return fieldMap[field] || field;
}

function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return '—';

  switch (field) {
    case 'principalAmountMicros':
      return formatAmount(value as number);
    case 'interestRateBps':
      return `${((value as number) / 100).toFixed(2)}%`;
    case 'termMonths':
      return `${value} months`;
    default:
      return String(value);
  }
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity</h2>
      {events.length > 0 ? (
        <div className="flow-root">
          <ul className="-mb-8">
            {events.map((event, idx) => (
              <li key={event.id}>
                <div className="relative pb-8">
                  {idx !== events.length - 1 && (
                    <span
                      className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex space-x-3">
                    <div>
                      <EventIcon eventType={event.eventType} />
                    </div>
                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                      <div>
                        <p className="text-sm text-gray-900">
                          {event.description}
                          {event.eventType === 'PAYMENT_RECEIVED' && event.paymentAmountMicros && (
                            <span className="font-medium text-green-700">
                              {' '}({formatAmount(event.paymentAmountMicros)})
                            </span>
                          )}
                        </p>
                        {event.changes && Object.keys(event.changes).length > 0 && (
                          <div className="mt-1 text-xs text-gray-500">
                            {Object.entries(event.changes).map(([field, change]) => (
                              <div key={field}>
                                {formatFieldName(field)}: {formatFieldValue(field, change.from)} → {formatFieldValue(field, change.to)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="whitespace-nowrap text-right text-sm text-gray-500">
                        <time dateTime={event.occurredAt}>
                          {new Date(event.occurredAt).toLocaleString()}
                        </time>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">No activity recorded yet.</p>
      )}
    </div>
  );
}
