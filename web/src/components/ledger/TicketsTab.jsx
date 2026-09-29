import React from 'react';
import TicketRow from './TicketRow.jsx';

const COLS = ['', 'Task / Carrier', 'Consignee', 'Outbound Leg', 'Return Leg', 'Operator Note'];

export default function TicketsTab({ rows, selectedTask, refreshingTasks, onSelect, onForceRefresh }) {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[var(--bg-header)]">
            {COLS.map((c, i) => (
              <th
                key={i}
                className="panel-label text-left font-bold py-1.5 px-0 first:pl-2 border-b border-[var(--rule)] whitespace-nowrap"
                style={{ paddingRight: '12px' }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <TicketRow
              key={row.ticketRef}
              row={row}
              isSelected={selectedTask === row.ticketRef}
              isRefreshing={!!refreshingTasks[row.ticketRef]}
              onSelect={onSelect}
              onForceRefresh={onForceRefresh}
            />
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={COLS.length} className="text-center py-12 font-console text-[11px] text-[var(--text-dim)] uppercase tracking-[0.1em]">
                No consignments match current filter
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
