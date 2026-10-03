import { useState } from 'react';
import { Search } from 'lucide-react';
import { useDriver } from '../DriverContext';
import { Card, DataState, StopCard } from '../components/ui';
import { DriverPageHeading } from '../components/PageHeading';
export function DriverStopListPage() {
  const { trip, issues } = useDriver();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const completed = trip?.stops.filter((s) => s.completedAt).length ?? 0;
  const stops =
    trip?.stops.filter(
      (s) =>
        (filter === 'All' ||
          (filter === 'Pending' && !s.completedAt) ||
          (filter === 'Completed' && !!s.completedAt) ||
          (filter === 'Issue' && issues.some((i) => i.stopId === s.id && !i.resolved))) &&
        `${s.outlet.name} ${s.orderNumber} ${s.outlet.address}`
          .toLowerCase()
          .includes(search.toLowerCase())
    ) ?? [];
  return (
    <>
      <DriverPageHeading
        title="Trip Stops"
        subtitle={`${trip?.vehicle.registrationNumber ?? 'Your vehicle'} · ${trip?.stops.length ?? 0} scheduled outlets`}
        back="/driver/route"
      />
      <DataState>
        <Card className="driver-list-progress">
          <div className="driver-row">
            <strong>
              {completed} of {trip?.stops.length} Completed
            </strong>
            <span className="driver-tag">
              {trip?.stops.length ? Math.round((completed / trip.stops.length) * 100) : 0}%
            </span>
          </div>
          <progress value={completed} max={trip?.stops.length || 1} aria-label="Stop completion" />
          <small>{trip?.tripNumber}</small>
        </Card>
        <div className="driver-search">
          <Search size={17} />
          <input
            aria-label="Search stops"
            placeholder="Search outlet or consignment"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="driver-filters" aria-label="Filter stops">
          {['All', 'Pending', 'Completed', 'Issue'].map((f) => (
            <button key={f} aria-pressed={f === filter} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <div className="driver-stop-list">
          {stops.map((s) => (
            <StopCard stop={s} key={s.id} />
          ))}
        </div>
        {!stops.length && <Card>No stops match this filter.</Card>}
      </DataState>
    </>
  );
}
