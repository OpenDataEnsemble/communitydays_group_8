import React, { useEffect, useState } from 'react';
import { Link, Route, Routes, useParams } from 'react-router-dom';
import config from './theme.json';
import useObservations from './useObservations.js';

function display(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(display).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function Fields({ fields, data }) {
  return (
    <dl className="fields">
      {fields.map(({ key, label }) => (
        <div key={key}>
          <dt>{label}</dt>
          <dd>{display(data?.[key])}</dd>
        </div>
      ))}
    </dl>
  );
}

function RecordPage() {
  const { entityId } = useParams();

  const {
    api,
    registrations,
    followUps,
    loading,
    error,
    formError,
    opening,
    refresh,
    openForm,
  } = useObservations(entityId);

  const [searchTerm, setSearchTerm] = useState('');

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredRegistrations = normalizedSearch
    ? registrations.filter((item) =>
        String(item.data?.name ?? '')
          .toLowerCase()
          .includes(normalizedSearch)
      )
    : registrations;

  const record = registrations.find(
    (item) => item.observationId === entityId
  );

  const disabled = !api || opening;

  const registrationFields = config.registrationFields.some(
    ({ key }) => key === 'name'
  )
    ? config.registrationFields
    : [{ key: 'name', label: 'Name' }, ...config.registrationFields];

  useEffect(() => {
    document.title = entityId
      ? `${config.entity} details · ${config.title}`
      : config.title;

    document.getElementById('page-heading')?.focus();
  }, [entityId]);

  return (
    <>
      {entityId && (
        <Link className="back-link" to="/">
          ← All {config.plural}
        </Link>
      )}

      {/* SEARCH AT THE TOP OF THE HOME SCREEN */}
        {!entityId && (
          <div className="search-section">
            <label htmlFor="registration-search">
              Search {config.plural} by name
            </label>

            <input
              id="registration-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name..."
              autoComplete="off"
            />

            <p className="search-count" aria-live="polite">
              {filteredRegistrations.length} matching out of{' '}
              {registrations.length} registered
            </p>
          </div>
        )}


      <section className="panel" aria-labelledby="page-heading">

        
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              {entityId ? config.entity : 'Your community'}
            </p>

            <h2 id="page-heading" tabIndex={-1}>
              {entityId
                ? display(
                    record?.data?.name || `${config.entity} details`
                  )
                : config.plural}
            </h2>
          </div>

          {!entityId && (
            <button
              disabled={disabled}
              onClick={() => openForm(config.registrationForm)}
            >
              {opening ? 'Form open…' : config.registerLabel}
            </button>
          )}
        </div>

        <div className="data-status">
          <span role="status">
            {loading
              ? 'Refreshing saved observations…'
              : `${registrations.length} saved ${config.plural}`}
          </span>

          <button
            className="secondary"
            disabled={loading || opening}
            onClick={refresh}
          >
            Refresh
          </button>
        </div>

        {!api && (
          <p className="notice">
            Open this app in Formulus or ODE Desktop to view and collect data.
            This browser preview does not contain sample data.
          </p>
        )}

        {error && (
          <div className="error" role="alert">
            <p>Could not refresh observations. {error}</p>

            {(registrations.length > 0 || followUps.length > 0) && (
              <p>
                Previously loaded data is shown; it may be out of date.
              </p>
            )}

            <button
              className="secondary"
              disabled={loading}
              onClick={refresh}
            >
              Retry
            </button>
          </div>
        )}

        {formError && (
          <p className="error" role="alert">
            Could not complete the form. {formError} Please try the form
            button again.
          </p>
        )}

        {!entityId ? (
          registrations.length > 0 ? (
            filteredRegistrations.length > 0 ? (
              <div
                className="table-scroll"
                role="region"
                aria-label={`${config.plural} list`}
                tabIndex={0}
              >
                <table>
                  <caption>Saved {config.plural}</caption>

                  <thead>
                    <tr>
                      {config.columns.map(({ key, label }) => (
                        <th scope="col" key={key}>
                          {label}
                        </th>
                      ))}

                      <th scope="col">Details</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRegistrations.map((item) => (
                      <tr key={item.observationId}>
                        {config.columns.map(({ key }) => (
                          <td key={key}>
                            {display(item.data?.[key])}
                          </td>
                        ))}

                        <td>
                          <Link
                            className="detail-link"
                            to={`/details/${encodeURIComponent(
                              item.observationId
                            )}`}
                            aria-label={`View details for ${display(
                              item.data?.name
                            )}`}
                          >
                            View details →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty" role="status">
                No {config.plural} match "{searchTerm.trim()}". Try a
                different name.
              </p>
            )
          ) : (
            !loading &&
            !error &&
            api && (
              <p className="empty">
                No {config.plural} yet. Select “{config.registerLabel}” to
                get started.
              </p>
            )
          )
        ) : record ? (
          <>
            <Fields fields={registrationFields} data={record.data} />

            <div className="section-heading history-heading">
              <h3>Follow-up history</h3>

              <button
                disabled={disabled || loading || Boolean(error)}
                onClick={() =>
                  openForm(config.followUpForm, {
                    entity_id: record.observationId,
                  })
                }
              >
                {opening ? 'Form open…' : config.followUpLabel}
              </button>
            </div>

            {followUps.length === 0 ? (
              <p className="empty">No saved follow-ups yet.</p>
            ) : (
              <ol className="history">
                {followUps.map((item) => {
                  const date = new Date(item.createdAt);

                  return (
                    <li key={item.observationId}>
                      <article>
                        <h4>
                          {Number.isNaN(date.getTime()) ? (
                            'Saved follow-up'
                          ) : (
                            <time dateTime={date.toISOString()}>
                              {date.toLocaleString()}
                            </time>
                          )}
                        </h4>

                        <Fields
                          fields={config.followUpFields}
                          data={item.data}
                        />
                      </article>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        ) : (
          !loading &&
          !error &&
          api && (
            <p className="empty">
              This {config.entity} was not found. It may have been deleted or
              may not have synced to this device.
            </p>
          )
        )}
      </section>
    </>
  );
}

export default function App() {
  return (
    <div
      className="app"
      style={{
        '--accent': config.accent,
        '--background': config.background,
      }}
    >
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to content
      </a>

      <header className="site-header">
        <Link
          className="brand"
          to="/"
          aria-label="Community app home"
        >
          <img
            src="./assets/ode-logo.png"
            alt="Open Data Ensemble"
          />
        </Link>

        <span>ODE Community Days 2026, Kampala</span>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="hero" aria-labelledby="app-title">
          <div>
            <p className="eyebrow">{config.theme}</p>
            <h1 id="app-title">{config.title}</h1>
            <p>{config.description}</p>
          </div>

          <img
            src="./assets/prime.jpg"
            alt=""
            width="200"
            height="100"
          />
        </section>

        <Routes>
          <Route path="/" element={<RecordPage />} />

          <Route
            path="/details/:entityId"
            element={<RecordPage />}
          />

          <Route
            path="*"
            element={
              <section className="panel">
                <h2>Page not found</h2>
                <Link to="/">Return home</Link>
              </section>
            }
          />
        </Routes>
      </main>

      <footer>
        Built together with Open Data Ensemble · Collect locally, connect your
        community.
      </footer>
    </div>
  );
}

